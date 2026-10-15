# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# 共用函式，由其他腳本 import。
from __future__ import annotations

import inspect
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

LOG = ".research/step.log"
STEP_NOW = ".research/step.now"


def now() -> str:
    dt = datetime.now(timezone.utc)
    return f"{dt.strftime('%Y%m%dT%H%M%S')}{dt.microsecond // 1000:03d}Z"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _is_called_from_skill_script() -> bool:
    """避免 record/check/revision 等 skill 腳本在驗證目前步驟時觸發自動 diff 檢查。"""
    for frame in inspect.stack():
        if Path(frame.filename).name in {"record.py", "check.py", "revision.py"}:
            return True
    return False


def _git_diff_attempt() -> str:
    """取得 .devcontainer / .opencode / .research 以外的 git diff。"""
    try:
        proc = subprocess.run(
            ["git", "diff", "--", ".", ":!.devcontainer/**", ":!.opencode/**", ":!.research/**",":!.flows/**", ":!AGENTS.md"],
            cwd=_repo_root(),
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return ""
    if proc.returncode != 0:
        return ""
    return proc.stdout


def _record_attempt_log(text: str) -> None:
    """按照 attempt-log skill 的規則記錄原文；字數 > 5 時進入 Step 2。"""
    folder = Path(".attemptlog")
    folder.mkdir(parents=True, exist_ok=True)
    ts = now()
    file_path = folder / f"{ts}.md"
    file_path.write_text(text + "\n", encoding="utf-8")
    length = len(text.strip())
    if length > 5:
        set_step("2", "attemptlog_diff", f"len={length} file={file_path}")


def cur_step() -> str:
    """目前步驟（1~5 或 done）：以 step.now 為主；缺失時退回 step.log 最後一行。

    若目前步驟為 1，且不是由 skill 腳本呼叫，會額外檢查原始碼 diff；
    當 .devcontainer / .opencode / .research 以外的檔案合計變更超過 5 字，
    就把 diff 內容視為 attempt 記錄下來，並自動進入 Step 2。
    """
    path = Path(STEP_NOW)
    if path.exists():
        raw = path.read_text(encoding="utf-8").strip()
    else:
        log = Path(LOG)
        if not log.exists():
            set_step("1", "init")
            return "1"
        lines = log.read_text(encoding="utf-8", errors="ignore").splitlines()
        if not lines:
            return ""
        m = re.match(r".* step=([^ ]+).*", lines[-1])
        raw = m.group(1) if m else lines[-1]

    if (
        raw == "1"
        #and not _is_called_from_skill_script()
        and not os.environ.get("_CUR_STEP_DIFF_CHECK")
    ):
        os.environ["_CUR_STEP_DIFF_CHECK"] = "1"
        try:
            diff = _git_diff_attempt()
            if len(diff.strip()) > 5:
                _record_attempt_log(diff)
                return cur_step()
        finally:
            os.environ.pop("_CUR_STEP_DIFF_CHECK", None)

    return raw


def set_step(new_step: str, event: str, extra: str = "") -> None:
    """更新 step.now；只有 step 真正變化時才寫入 step.log（只增不改）。"""
    if not event=="init":
        old = cur_step()
    else:
        old=0
    Path(STEP_NOW).write_text(new_step + "\n", encoding="utf-8")
    if new_step == old:
        return
    line = f"{now()} step={new_step} event={event}"
    if extra:
        line += f" {extra}"
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def chdir_root() -> None:
    os.chdir(Path(__file__).resolve().parents[2])
