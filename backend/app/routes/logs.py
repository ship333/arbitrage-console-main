from fastapi import APIRouter
from typing import List, Optional
from datetime import datetime, timedelta
from ..schemas import LogEntry

router = APIRouter(prefix="/api", tags=["logs"])

# Simple demo logs buffer
BASE_TIME = datetime.utcnow()

LEVELS = ["info", "warn", "error", "debug"]

SAMPLE: List[LogEntry] = [
    LogEntry(id="l-1", level="info", message="system initialized", timestamp=(BASE_TIME - timedelta(minutes=5)).isoformat()+"Z"),
    LogEntry(id="l-2", level="debug", message="metrics tick", timestamp=(BASE_TIME - timedelta(minutes=4)).isoformat()+"Z"),
    LogEntry(id="l-3", level="warn", message="spread widened", timestamp=(BASE_TIME - timedelta(minutes=3)).isoformat()+"Z"),
    LogEntry(id="l-4", level="error", message="venue timeout", timestamp=(BASE_TIME - timedelta(minutes=2)).isoformat()+"Z"),
]

@router.get("/logs", response_model=List[LogEntry])
def get_logs(limit: int = 100, level: Optional[str] = None) -> List[LogEntry]:
    items = SAMPLE[-limit:]
    if level:
        items = [l for l in items if l.level == level]
    return items

@router.get("/logs/export")
def export_logs(level: Optional[str] = None):
    # Return CSV as text for simplicity
    from fastapi.responses import PlainTextResponse
    rows = ["id,level,message,timestamp"]
    for l in SAMPLE:
        if level and l.level != level:
            continue
        msg = l.message.replace(",", " ")
        rows.append(f"{l.id},{l.level},{msg},{l.timestamp}")
    csv = "\n".join(rows) + "\n"
    return PlainTextResponse(csv, media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=logs.csv"
    })
