from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any, Optional
import os
import json
import glob
import time
from ..settings import settings
from ..auth import require_auth

router = APIRouter(prefix="/api/live", tags=["live"], dependencies=[Depends(require_auth)])


def _latest_ndjson_path() -> Optional[str]:
    root = settings.HLIQ_BOT_PATH or os.environ.get("HLIQ_BOT_PATH")
    if not root:
        return None
    data_dir = settings.HLIQ_NODE_NDJSON_DIR or "data"
    target_dir = os.path.join(root, data_dir)
    if not os.path.isdir(target_dir):
        return None
    files = sorted(glob.glob(os.path.join(target_dir, "live_*.ndjson")))
    return files[-1] if files else None


def _read_last_lines(fp: str, max_lines: int) -> List[str]:
    # Simple tail implementation: read whole file if small; otherwise read last ~1MB chunk
    try:
        sz = os.path.getsize(fp)
        with open(fp, "rb") as f:
            if sz < 1_000_000:
                data = f.read().decode("utf-8", errors="ignore")
                lines = data.splitlines()
                return lines[-max_lines:]
            else:
                f.seek(max(0, sz - 1_000_000))
                data = f.read().decode("utf-8", errors="ignore")
                lines = data.splitlines()
                return lines[-max_lines:]
    except Exception:
        return []


def _parse_rows(lines: List[str]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for ln in lines:
        try:
            row = json.loads(ln)
            if isinstance(row, dict) and "venue" in row and "mid" in row:
                out.append(row)
        except Exception:
            continue
    return out


def _status_path() -> Optional[str]:
    root = settings.HLIQ_BOT_PATH or os.environ.get("HLIQ_BOT_PATH")
    if not root:
        return None
    data_dir = settings.HLIQ_NODE_NDJSON_DIR or "data"
    target = os.path.join(root, data_dir, "ws_status.json")
    return target if os.path.exists(target) else None


@router.get("/quotes")
async def get_quotes(limit: int = Query(default=200, ge=1, le=5000), venues: Optional[str] = None):
    fp = _latest_ndjson_path()
    if not fp:
        return {"items": [], "file": None}
    lines = _read_last_lines(fp, max_lines=limit)
    rows = _parse_rows(lines)
    if venues:
        allowed = {v.strip().upper() for v in venues.split(",") if v.strip()}
        rows = [r for r in rows if str(r.get("venue", "")).upper() in allowed]
    return {"items": rows, "file": os.path.basename(fp)}


@router.get("/top-spread")
async def get_top_spread(lookback_ms: int = Query(default=5000, ge=500), pairs: Optional[str] = None):
    fp = _latest_ndjson_path()
    if not fp:
        return {"top": None, "file": None}
    lines = _read_last_lines(fp, max_lines=2000)
    rows = _parse_rows(lines)
    now = int(time.time() * 1000)
    rows = [r for r in rows if isinstance(r.get("ts"), (int, float)) and (now - float(r["ts"]) <= lookback_ms)]
    # Optionally filter by pair once the collector includes it
    if pairs:
        allowed_pairs = {p.strip().upper() for p in pairs.split(",") if p.strip()}
        rows = [r for r in rows if str(r.get("pair", "")).upper() in allowed_pairs]
    latest_by_venue: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        v = str(r.get("venue", ""))
        if not v:
            continue
        prev = latest_by_venue.get(v)
        if not prev or float(r.get("ts", 0)) >= float(prev.get("ts", 0)):
            latest_by_venue[v] = r
    venues = list(latest_by_venue.keys())
    if len(venues) < 2:
        return {"top": None, "file": os.path.basename(fp)}
    # Fee + haircut
    haircut_bps = float(settings.LIVE_HAIRCUT_BPS)
    fee_bps = {
        "HYPERSWAP": float(settings.FEE_BPS_HYPERSWAP),
        "PRJX": float(settings.FEE_BPS_PRJX),
        "HYBRA": float(settings.FEE_BPS_HYBRA),
    }
    best = None
    for buy in venues:
        for sell in venues:
            if buy == sell:
                continue
            qb = latest_by_venue[buy]
            qs = latest_by_venue[sell]
            mid_b = float(qb.get("mid", 0))
            mid_s = float(qs.get("mid", 0))
            if mid_b <= 0 or mid_s <= 0:
                continue
            nb = mid_b * (1 + (fee_bps.get(buy, 0.0) + haircut_bps) / 10_000.0)
            ns = mid_s * (1 - (fee_bps.get(sell, 0.0) + haircut_bps) / 10_000.0)
            spread = ns - nb
            spread_bps = (spread / mid_b) * 10_000.0
            if spread_bps > 0:
                cand = {
                    "buyVenue": buy,
                    "sellVenue": sell,
                    "spreadBps": spread_bps,
                    "midBuy": mid_b,
                    "midSell": mid_s,
                    "ts": int(time.time() * 1000),
                }
                if not best or cand["spreadBps"] > best["spreadBps"]:
                    best = cand
    return {"top": best, "file": os.path.basename(fp)}


@router.get("/status")
async def get_status():
    sp = _status_path()
    if not sp:
        return {"status": None, "file": None}
    try:
        with open(sp, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"status": data, "file": os.path.basename(sp)}
    except Exception:
        return {"status": None, "file": os.path.basename(sp)}
