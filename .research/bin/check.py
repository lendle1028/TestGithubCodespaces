# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# Step 3 → Step 4 的驗證。
# 有 .research/test_cmd（一行指令，exit 0 代表通過）→ 執行它，PASS 才進 Step 4。
# 沒有 test_cmd → 需由 AI 自行檢查後加 --ai-ok；有 test_cmd 時拒絕 --ai-ok。
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from lib import chdir_root, cur_step, set_step

chdir_root()

cur = cur_step()
if cur != "3":
    print(f"WRONG_STEP 目前是 Step {cur}，驗證只能在 Step 3 使用。")
    sys.exit(1)

if Path(".research/test_cmd").exists():
    if "--ai-ok" in sys.argv[1:]:
        print("REFUSED 本任務有自動測試，不接受 --ai-ok。請直接執行 check.py。")
        sys.exit(1)
    proc = subprocess.run(
        ["bash", ".research/test_cmd"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    out = proc.stdout or ""
    if proc.returncode == 0:
        set_step("4", "check_pass", "mode=test")
        print("PASS 測試通過。目前為 Step 4。")
    else:
        print("FAIL 測試未通過。輸出（最後 15 行）：")
        tail = out.splitlines()[-15:]
        print("\n".join(tail))
else:
    if "--ai-ok" in sys.argv[1:]:
        set_step("4", "check_pass", "mode=ai")
        print("PASS（AI 判定）。目前為 Step 4。")
    else:
        print(
            "NO_TEST 本任務沒有自動測試。請閱讀並實際執行學生的程式；"
            "確認正確才執行：uv run .research/bin/check.py --ai-ok"
        )
