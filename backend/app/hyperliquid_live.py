import asyncio
import os
import sys
import logging
import contextlib
from typing import Optional

from .settings import settings

_logger = logging.getLogger("uvicorn.error")

_TASK: Optional[asyncio.Task] = None
_RUNNING: bool = False
_PROC: Optional[asyncio.subprocess.Process] = None  # Node collector process when enabled


def _resolve_project_path() -> str:
    project_path = settings.HLIQ_BOT_PATH or os.environ.get("HLIQ_BOT_PATH")
    if not project_path:
        raise RuntimeError("HLIQ_BOT_PATH not configured. Set settings.HLIQ_BOT_PATH or env HLIQ_BOT_PATH.")
    project_path = os.path.abspath(project_path)
    if not os.path.isdir(project_path):
        raise FileNotFoundError(f"Hyperliquid project path not found: {project_path}")
    return project_path


def _ensure_import_path(project_path: str) -> None:
    if project_path not in sys.path:
        sys.path.insert(0, project_path)


async def _runner():
    global _RUNNING
    try:
        project_path = _resolve_project_path()
        _ensure_import_path(project_path)
        # If configured, run Node collector instead of Python main
        if settings.HLIQ_NODE_COLLECTOR:
            await _runner_node(project_path)
        else:
            # Import inside the task to ensure path is set
            from main import main as hliq_main  # type: ignore
            _logger.info("Hyperliquid live: starting main loop")
            _RUNNING = True
            await hliq_main()
    except asyncio.CancelledError:
        _logger.info("Hyperliquid live: cancellation requested; stopping")
        raise
    except Exception as e:
        _logger.exception("Hyperliquid live: crashed: %s", e)
    finally:
        _RUNNING = False
        _logger.info("Hyperliquid live: stopped")


async def _runner_node(project_path: str):
    """Spawn Node live collector (npm run -s live:collect) and await it."""
    global _PROC, _RUNNING
    cmd = settings.HLIQ_NODE_COLLECTOR_CMD or "npm run -s live:collect"
    env = os.environ.copy()
    # Surface a few knobs if provided via settings; otherwise rely on Node defaults
    env.setdefault("DRY_RUN", "true")
    try:
        _logger.info("Hyperliquid live (node): starting '%s' in %s", cmd, project_path)
        _RUNNING = True
        _PROC = await asyncio.create_subprocess_shell(
            cmd,
            cwd=project_path,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        assert _PROC is not None
        # Stream output to server log
        assert _PROC.stdout is not None
        async for line in _PROC.stdout:
            try:
                _logger.info("node| %s", line.decode(errors="ignore").rstrip())
            except Exception:
                pass
        rc = await _PROC.wait()
        _logger.info("Hyperliquid live (node): exited rc=%s", rc)
    except asyncio.CancelledError:
        _logger.info("Hyperliquid live (node): cancellation requested; terminating process")
        if _PROC and _PROC.returncode is None:
            with contextlib.suppress(Exception):
                _PROC.terminate()
        raise
    finally:
        _RUNNING = False
        _PROC = None


def is_running() -> bool:
    return _RUNNING and _TASK is not None and not _TASK.done()


def start() -> bool:
    """Start the Hyperliquid live loop as a background task. Returns True if started, False if already running."""
    global _TASK
    if is_running():
        return False
    # Must be called from inside the FastAPI event loop
    loop = asyncio.get_running_loop()
    _TASK = loop.create_task(_runner())
    return True


async def stop(timeout: float = 5.0) -> None:
    global _TASK
    global _PROC
    if _TASK is None:
        return
    if _TASK.done():
        _TASK = None
        return
    # If Node process is running, request termination first
    if _PROC and _PROC.returncode is None:
        try:
            _PROC.terminate()
        except Exception:
            pass
    _TASK.cancel()
    try:
        await asyncio.wait_for(_TASK, timeout=timeout)
    except asyncio.CancelledError:
        pass
    except Exception as e:  # pragma: no cover
        _logger.debug("Hyperliquid live: stop wait error: %s", e)
    finally:
        _TASK = None
