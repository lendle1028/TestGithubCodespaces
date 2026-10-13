# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# 背景自動 commit（有差異才 commit）；每隔 PUSH_INTERVAL 秒 push 一次，確保作業 repo 看得到資料。
# 環境變數：INTERVAL=30  PUSH_INTERVAL=300（0＝不 push）  SYNC_OPENCODE=0（1＝同步 OpenCode session）
from __future__ import annotations

import os
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

os.chdir(Path(__file__).resolve().parents[2])

INTERVAL = int(os.environ.get("INTERVAL", "30"))
PUSH_INTERVAL = int(os.environ.get("PUSH_INTERVAL", "300"))
SYNC_OPENCODE = os.environ.get("SYNC_OPENCODE", "0") == "1"
# 請在實際版本確認路徑與內容不含金鑰
OC_SRC = Path.home() / ".local/share/opencode/storage"
last_push = 0

GIT_IDENTITY = ["-c", "user.name=research-bot", "-c", "user.email=research-bot@users.noreply.invalid"]


def quiet(*args: str) -> None:
    subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


while True:
    if SYNC_OPENCODE and OC_SRC.is_dir():
        Path(".research/opencode").mkdir(parents=True, exist_ok=True)
        shutil.copytree(OC_SRC, ".research/opencode", dirs_exist_ok=True)

    status = subprocess.run(
        ["git", "status", "--porcelain"], capture_output=True, text=True
    )
    if status.stdout.strip():
        quiet("git", "add", "-A")
        snapshot = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        quiet("git", *GIT_IDENTITY, "commit", "-qm", f"snapshot {snapshot}")

    if PUSH_INTERVAL > 0:
        t = int(time.time())
        if t - last_push >= PUSH_INTERVAL:
            quiet("git", "push", "-q", "origin", "HEAD")
            last_push = t

    time.sleep(INTERVAL)
