# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# 用法：record.py <資料夾> <預期步驟> <字數下限> <通過後步驟>
# 內容由 stdin 讀入（請用 heredoc）。
# 行為：步驟不符 → 拒絕；否則存成 <資料夾>/<時間戳>.md；
#       字數 > 下限 → 更新 step.now 進入下一步（step.log 記錄變化）；否則維持原步驟。
from __future__ import annotations

import sys
from pathlib import Path

from lib import chdir_root, cur_step, now, set_step

chdir_root()

folder, expected, minimum, nxt = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
folder=".logs/"+folder
event = folder[1:] if folder.startswith(".") else folder
cur = cur_step()
# 模擬 bash $(cat)：去掉結尾換行
text = sys.stdin.read().rstrip("\n")

if cur != expected:
    print(
        f"WRONG_STEP 目前是 Step {cur}，此動作只能在 Step {expected} 使用。"
        "未記錄。請重新執行 step.py。"
    )
    sys.exit(1)

folder_path = Path(folder)
folder_path.mkdir(parents=True, exist_ok=True)
ts = now()
file_path = folder_path / f"{ts}.md"
file_path.write_text(text + "\n", encoding="utf-8")
length = len(text.strip())

if length > minimum:
    set_step(nxt, f"{event}_pass", f"len={length} file={file_path}")
    print(f"PASS len={length} 已記錄。目前為 Step {nxt}。")
else:
    print(f"SHORT len={length}（需大於 {minimum}）。已記錄，但未進入下一步。")
