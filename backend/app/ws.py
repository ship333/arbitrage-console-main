import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from .settings import settings
from .auth import validate_token

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        data = json.dumps(message)
        for ws in list(self.active):
            try:
                await ws.send_text(data)
            except Exception:
                self.disconnect(ws)

manager = ConnectionManager()


def _status_path() -> Optional[str]:
    root = settings.HLIQ_BOT_PATH or os.environ.get("HLIQ_BOT_PATH")
    if not root:
        return None
    data_dir = settings.HLIQ_NODE_NDJSON_DIR or "data"
    target = os.path.join(root, data_dir, "ws_status.json")
    return target if os.path.exists(target) else None


def _read_status() -> Optional[Dict[str, Any]]:
    sp = _status_path()
    if not sp:
        return None
    try:
        with open(sp, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _ndjson_path() -> Optional[str]:
    root = settings.HLIQ_BOT_PATH or os.environ.get("HLIQ_BOT_PATH")
    if not root:
        return None
    data_dir = settings.HLIQ_NODE_NDJSON_DIR or "data"
    d = datetime.utcnow()
    fname = f"live_{d.year:04d}{d.month:02d}{d.day:02d}.ndjson"
    target = os.path.join(root, data_dir, fname)
    return target if os.path.exists(target) else None

# Helper to run the main loop shared by both styles
async def _handle_ws(websocket: WebSocket, topic: str, token: Optional[str]):
    # Auth check
    if settings.REQUIRE_AUTH:
        auth_header = None
        for k, v in websocket.headers.items():
            key = k.lower() if isinstance(k, str) else k.decode().lower()
            val = v if isinstance(v, str) else v.decode()
            if key == "authorization":
                auth_header = val
                break
        candidate = token or (auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header)
        if not validate_token(candidate):
            await websocket.close(code=1008)
            return
    await manager.connect(websocket)
    try:
        last_pong = datetime.utcnow()
        ping_interval = max(1, settings.WS_PING_INTERVAL_MS // 1000)
        pong_timeout = max(1, settings.WS_PONG_TIMEOUT_MS // 1000)
        nd_path = _ndjson_path()
        last_pos = 0
        carry = ""
        while True:
            status = _read_status()
            await manager.broadcast({
                "type": "liveStatus",
                "status": status,
                "lastUpdated": datetime.utcnow().isoformat() + "Z",
            })
            if topic in ("quotes", "all"):
                try:
                    cur = _ndjson_path();
                    if cur != nd_path:
                        nd_path = cur; last_pos = 0; carry = ""
                    if nd_path:
                        size = os.path.getsize(nd_path)
                        if size > last_pos:
                            with open(nd_path, "rb") as f:
                                f.seek(last_pos)
                                chunk = f.read(size - last_pos)
                                last_pos = size
                            text = carry + chunk.decode("utf-8", errors="ignore")
                            lines = text.splitlines()
                            if text and not text.endswith("\n"):
                                carry = lines.pop() if lines else text
                            else:
                                carry = ""
                            if lines:
                                max_lines = 100
                                if len(lines) > max_lines:
                                    lines = lines[-max_lines:]
                                rows = []
                                for ln in lines:
                                    try:
                                        obj = json.loads(ln)
                                        if isinstance(obj, dict) and obj.get("type") == "quote":
                                            rows.append(obj)
                                    except Exception:
                                        pass
                                if rows:
                                    await websocket.send_text(json.dumps({
                                        "type": "quotes",
                                        "count": len(rows),
                                        "rows": rows,
                                    }))
                except Exception:
                    pass
            try:
                await websocket.send_text(json.dumps({"type": "ping", "ts": datetime.utcnow().isoformat()+"Z"}))
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=ping_interval)
                try:
                    data = json.loads(msg)
                    if isinstance(data, dict) and data.get("type") == "pong":
                        last_pong = datetime.utcnow()
                except Exception:
                    pass
            except asyncio.TimeoutError:
                if (datetime.utcnow() - last_pong).total_seconds() > pong_timeout:
                    await websocket.close(code=1011); break
            except Exception:
                break
            await asyncio.sleep(settings.WS_BROADCAST_INTERVAL)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# New UI: topic via query param (optional, default='market')
@router.websocket("/api/ws")
async def ws_query(
    websocket: WebSocket,
    topic: str = Query(default="market"),
    token: Optional[str] = Query(default=None),
):
    await _handle_ws(websocket, topic, token)

# Legacy UI: topic as path parameter
@router.websocket("/api/bot/ws/{topic}")
@router.websocket("/api/v1/bot/ws/{topic}")
async def ws_path(
    websocket: WebSocket,
    topic: str,  # path param (required)
    token: Optional[str] = Query(default=None),
):
    await _handle_ws(websocket, topic, token)
    # Auth: check Authorization header or token query when REQUIRE_AUTH
    if settings.REQUIRE_AUTH:
        auth_header = None
        for k, v in websocket.headers.items():
            key = k.lower() if isinstance(k, str) else k.decode().lower()
            val = v if isinstance(v, str) else v.decode()
            if key == "authorization":
                auth_header = val
                break
        candidate = token or (auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header)
        if not validate_token(candidate):
            await websocket.close(code=1008)
            return
    await manager.connect(websocket)
    try:
        last_pong = datetime.utcnow()
        ping_interval = max(1, settings.WS_PING_INTERVAL_MS // 1000)
        pong_timeout = max(1, settings.WS_PONG_TIMEOUT_MS // 1000)
        # NDJSON tail state (per-connection)
        nd_path = _ndjson_path()
        last_pos = 0
        carry = ""

        while True:
            status = _read_status()
            payload = {
                "type": "liveStatus",
                "status": status,
                "lastUpdated": datetime.utcnow().isoformat() + "Z",
            }
            await manager.broadcast(payload)
            # Stream newly appended NDJSON rows to this client when requested
            if topic in ("quotes", "all"):
                try:
                    cur = _ndjson_path()
                    if cur != nd_path:
                        nd_path = cur
                        last_pos = 0
                        carry = ""
                    if nd_path:
                        size = os.path.getsize(nd_path)
                        if size > last_pos:
                            with open(nd_path, "rb") as f:
                                f.seek(last_pos)
                                chunk = f.read(size - last_pos)
                                last_pos = size
                            text = carry + chunk.decode("utf-8", errors="ignore")
                            lines = text.splitlines()
                            if text and not text.endswith("\n"):
                                carry = lines.pop() if lines else text
                            else:
                                carry = ""
                            if lines:
                                # Limit lines to avoid huge frames
                                max_lines = 100
                                if len(lines) > max_lines:
                                    lines = lines[-max_lines:]
                                rows = []
                                for ln in lines:
                                    try:
                                        obj = json.loads(ln)
                                        if isinstance(obj, dict) and obj.get("type") == "quote":
                                            rows.append(obj)
                                    except Exception:
                                        pass
                                if rows:
                                    await websocket.send_text(json.dumps({
                                        "type": "quotes",
                                        "count": len(rows),
                                        "rows": rows,
                                    }))
                except Exception:
                    # Ignore tailing errors to avoid dropping WS
                    pass
            # Send ping and await optional client response to keepalive
            try:
                await websocket.send_text(json.dumps({"type": "ping", "ts": datetime.utcnow().isoformat()+"Z"}))
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=ping_interval)
                try:
                    data = json.loads(msg)
                    if isinstance(data, dict) and data.get("type") == "pong":
                        last_pong = datetime.utcnow()
                except Exception:
                    pass
            except asyncio.TimeoutError:
                # If we haven't received pong within timeout window, close
                if (datetime.utcnow() - last_pong).total_seconds() > pong_timeout:
                    await websocket.close(code=1011)
                    break
            except Exception:
                break
            await asyncio.sleep(settings.WS_BROADCAST_INTERVAL)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
