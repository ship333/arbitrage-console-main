import os
from typing import Any, Dict
import subprocess, json

from .settings import settings


def _resolve_paths() -> Dict[str, str]:
    """
    Resolve the hyperliquid_bot project path and default data file.
    """
    project_path = settings.HLIQ_BOT_PATH or os.environ.get("HLIQ_BOT_PATH")
    if not project_path:
        raise RuntimeError("HLIQ_BOT_PATH not configured. Set settings.HLIQ_BOT_PATH or env HLIQ_BOT_PATH.")
    project_path = os.path.abspath(project_path)
    data_file = settings.BACKTEST_DATA_FILE or os.path.join(project_path, "historical_data.csv")
    return {"project_path": project_path, "data_file": data_file}



def run_hliq_backtest(pair: str) -> Dict[str, Any]:
    """
    Run the TypeScript backtester (scripts/run-backtest.ts) and return results in
    BacktestResultModel shape consumed by the REST layer & frontend.
    """
    paths = _resolve_paths()
    project_path = paths["project_path"]
    data_file = paths["data_file"]

    if not os.path.isdir(project_path):
        raise FileNotFoundError(f"Hyperliquid project path not found: {project_path}")
    if not os.path.isfile(data_file):
        raise FileNotFoundError(f"Backtest data file not found: {data_file}")

    script_path = os.path.join(project_path, "scripts", "run-backtest.ts")
    if not os.path.isfile(script_path):
        raise FileNotFoundError(f"Backtest CLI not found: {script_path}")

    cmd = [
        "npx",
        "ts-node",
        script_path,
        "--csv",
        data_file,
        "--pair",
        pair,
    ]

    try:
        output = subprocess.check_output(
            cmd,
            cwd=project_path,
            text=True,
            stderr=subprocess.STDOUT,
            timeout=180,
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"Backtest TS process failed with code {exc.returncode}: {exc.output}"
        ) from exc

    try:
        result: Dict[str, Any] = json.loads(output)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Backtest TS returned invalid JSON (truncated): " + output[:200]
        ) from exc

    return result

