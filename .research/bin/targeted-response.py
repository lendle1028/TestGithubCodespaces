# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# Step 3 的記錄與驗證。
#   record：記錄「卡點 + AI 回應」原文，不改變步驟。
#   check：驗證學生作品，通過則進入 Step 4。
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from lib import chdir_root, cur_step, now, set_step

chdir_root()

EXPECTED, FOLDER, EVENT = "3", ".logs/.targetedresponse", "targetedresponse"


def cmd_record(args: argparse.Namespace) -> None:
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
    set_step(EXPECTED, f"{EVENT}_pass", f"len={length} file={file_path}")
    print(f"PASS len={length} 已記錄。目前為 Step {EXPECTED}。")


def cmd_check(args: argparse.Namespace) -> None:
    cur = cur_step()
    if cur != EXPECTED:
        print(f"WRONG_STEP 目前是 Step {cur}，驗證只能在 Step {EXPECTED} 使用。")
        sys.exit(1)

    if Path(".research/test_cmd").exists():
        if args.ai_ok:
            print("REFUSED 本任務有自動測試，不接受 --ai-ok。請直接執行 check。")
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
            print("\n".join(out.splitlines()[-15:]))
    else:
        if args.ai_ok:
            set_step("4", "check_pass", "mode=ai")
            print("PASS（AI 判定）。目前為 Step 4。")
        else:
            print(
                "NO_TEST 本任務沒有自動測試。請閱讀並實際執行學生的程式；"
                "確認符合專案目標後才執行：uv run .research/bin/targeted-response.py check --ai-ok"
            )


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="targeted-response.py",
        description="Step 3：記錄 AI 回應 / 驗證學生作品",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_record = sub.add_parser("record", help="記錄卡點與 AI 回應（stdin）")
    p_record.set_defaults(func=cmd_record)

    p_check = sub.add_parser("check", help="驗證學生作品，通過則進入 Step 4")
    p_check.add_argument("--ai-ok", action="store_true")
    p_check.set_defaults(func=cmd_check)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
