# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# Step 4：記錄學生反思。字數 > 5 進入 Step 5。
# 內容由 stdin 讀入（heredoc）。
from __future__ import annotations

import sys
from pathlib import Path

from lib import chdir_root, cur_step, now, set_step

chdir_root()

# 本步驟設定：預期步驟、字數下限、通過後步驟、記錄資料夾、log 事件名
EXPECTED, MINIMUM, NEXT, FOLDER, EVENT = "4", 5, "5", ".logs/.reflectionlog", "reflectionlog"

cur = cur_step()
text = sys.stdin.read().rstrip("\n")

if cur != EXPECTED:
    print(
        f"WRONG_STEP 目前是 Step {cur}，此動作只能在 Step {EXPECTED} 使用。"
        "未記錄。請重新執行 step.py。"
    )
    sys.exit(1)

folder = Path(FOLDER)
folder.mkdir(parents=True, exist_ok=True)
file_path = folder / f"{now()}.md"
file_path.write_text(text + "\n", encoding="utf-8")
length = len(text.strip())

if length > MINIMUM:
    set_step(NEXT, f"{EVENT}_pass", f"len={length} file={file_path}")
    print(f"PASS len={length} 已記錄。目前為 Step {NEXT}。")
else:
    print(f"SHORT len={length}（需大於 {MINIMUM}）。已記錄，但未進入下一步。")
