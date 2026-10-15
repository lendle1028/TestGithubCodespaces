# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# 輸出目前步驟，例如 STEP=1 / STEP=DONE。
# 處於 Step 1 時，會先依 .research/attempt_files 檢查指定檔案的變更，
# 合計超過 5 字就自動記錄並進入 Step 2，再輸出結果。
from __future__ import annotations

from lib import chdir_root, cur_step, try_diff_transition

chdir_root()
if cur_step() == "1":
    try_diff_transition()
print(f"STEP={cur_step().upper()}")
