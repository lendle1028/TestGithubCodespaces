# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# 輸出目前步驟，例如 STEP=1 / STEP=DONE
from __future__ import annotations

from lib import chdir_root, cur_step

chdir_root()
print(f"STEP={cur_step().upper()}")
