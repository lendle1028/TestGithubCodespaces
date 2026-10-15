# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# 工具層：狀態讀寫與自動 diff 檢查。
# cur_step() 為純讀取，不做任何轉移；自動 diff 晉級只會由 step.py
# 主動呼叫 try_diff_transition()。
from __future__ import annotations

import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

LOG = ".research/step.log"
STEP_NOW = ".research/step.now"
ATTEMPT_FILES = ".research/attempt_files"
ATTEMPT_LOG_DIR = ".logs/.attemptlog"

# Step 1 自動 diff 的基準 commit 記錄檔
BASELINE_REF = ".research/attempt_baseline_ref"
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
GIT_IDENTITY = [
    "-c", "user.name=research-bot",
    "-c", "user.email=research-bot@users.noreply.invalid",
]


def now() -> str:
    dt = datetime.now(timezone.utc)
    return f"{dt.strftime('%Y%m%dT%H%M%S')}{dt.microsecond // 1000:03d}Z"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def chdir_root() -> None:
    os.chdir(_repo_root())


# ---------------------------------------------------------------------------
# 狀態讀寫
# ---------------------------------------------------------------------------

def cur_step() -> str:
    """目前步驟（1~5 或 done）：以 step.now 為主；缺失時退回 step.log 最後一行。"""
    path = Path(STEP_NOW)
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    log = Path(LOG)
    if not log.exists():
        set_step("1", "init")
        return "1"
    lines = log.read_text(encoding="utf-8", errors="ignore").splitlines()
    if not lines:
        return ""
    m = re.match(r".* step=([^ ]+).*", lines[-1])
    return m.group(1) if m else lines[-1]


def set_step(new_step: str, event: str, extra: str = "") -> None:
    """更新 step.now；只有 step 真正變化時才寫入 step.log（只增不改）。"""
    old = "" if event == "init" else cur_step()
    Path(STEP_NOW).write_text(new_step + "\n", encoding="utf-8")
    if new_step == old:
        return
    line = f"{now()} step={new_step} event={event}"
    if extra:
        line += f" {extra}"
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


# ---------------------------------------------------------------------------
# Step 1 自動 diff 檢查（由 step.py 呼叫；watcher.py 會在啟動時先建立基準）
# ---------------------------------------------------------------------------

def _git(*args: str) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=_repo_root(),
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return 127, ""
    return proc.returncode, proc.stdout


def _is_git_repo() -> bool:
    rc, out = _git("rev-parse", "--is-inside-work-tree")
    return rc == 0 and out.strip() == "true"


def _is_tracked(path: str) -> bool:
    rc, _ = _git("ls-files", "--error-unmatch", "--", path)
    return rc == 0


def _head_ref() -> str:
    rc, out = _git("rev-parse", "HEAD")
    return out.strip() if rc == 0 and out.strip() else EMPTY_TREE


def attempt_files() -> list[str]:
    """讀 .research/attempt_files：一行一個路徑，# 開頭為註解。"""
    cfg = Path(ATTEMPT_FILES)
    if not cfg.exists():
        return []
    files = []
    for line in cfg.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            files.append(line)
    return files


def ensure_baseline_ref() -> str:
    """記錄 Step 1 的基準 commit（課程開始時的狀態），回傳該 commit。

    watcher.py 每 30 秒會自動 commit，若直接比對工作區與 HEAD，
    學生剛修改的檔案會被 commit 蓋掉、看不到變化。改為比對
    「基準 commit → 工作區」，就能穩定偵測學生的修改。
    應由 watcher.py 啟動時先呼叫（學生動手之前）；step.py 會補呼叫當備援。
    """
    path = Path(BASELINE_REF)
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    if not _is_git_repo():
        return ""
    _git("add", "-A")
    _git(*GIT_IDENTITY, "commit", "-qm", "baseline")
    ref = _head_ref()
    if ref:
        path.write_text(ref + "\n", encoding="utf-8")
    return ref


def _diff_text(files: list[str], ref: str) -> str:
    args = ["diff"]
    if ref:
        args.append(ref)
    args += ["--", *files]
    rc, out = _git(*args)
    return out if rc == 0 else ""


def try_diff_transition(min_chars: int = 5) -> bool:
    """若目前步驟為 1，且 .research/attempt_files 指定的檔案有變更，
    就把變更視為嘗試記錄下來，並自動進入 Step 2。

    只檢查設定檔指定的檔案：已追蹤的看 `git diff <基準> -- <檔案>`，
    未追蹤的新檔案直接讀內容（git diff 看不到未追蹤檔案）。
    """
    if cur_step() != "1":
        return False
    files = attempt_files()
    if not files or not _is_git_repo():
        return False

    ref = ensure_baseline_ref()
    parts = [_diff_text(files, ref)]
    for f in files:
        p = Path(f)
        if p.exists() and not _is_tracked(f):
            parts.append(f"--- {f}（新檔案）---\n" + p.read_text(encoding="utf-8", errors="ignore"))

    diff = "\n".join(parts).strip()
    if len(diff) <= min_chars:
        return False
    folder = Path(ATTEMPT_LOG_DIR)
    folder.mkdir(parents=True, exist_ok=True)
    file_path = folder / f"{now()}.md"
    file_path.write_text(diff + "\n", encoding="utf-8")
    set_step("2", "attemptlog_diff", f"len={len(diff)} file={file_path}")
    return True
