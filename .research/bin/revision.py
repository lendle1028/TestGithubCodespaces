# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///
# 用法：revision.py <最終檔案路徑>
# Step 5：快照最終檔，計算它與「學生嘗試」「AI 回應」的 token 3-gram 重疊比例。
from __future__ import annotations

import glob
import json
import re
import shutil
import sys
from pathlib import Path

from lib import chdir_root, cur_step, now, set_step

chdir_root()

final = sys.argv[1] if len(sys.argv) > 1 else ""
cur = cur_step()
if cur != "5":
    print(f"WRONG_STEP 目前是 Step {cur}，此動作只能在 Step 5 使用。")
    sys.exit(1)
if not final or not Path(final).is_file():
    print(f"ERROR 找不到最終檔案：'{final}'。請向學生確認路徑。")
    sys.exit(1)

revision_dir = Path(".logs/.revisiondiff")
revision_dir.mkdir(exist_ok=True)
ts = now()
shutil.copy(final, revision_dir / f"{ts}.final.txt")
out = revision_dir / f"{ts}.json"

TOK = re.compile(r"[A-Za-z_]\w*|\d+|[一-鿿]|\S")


def tok(s: str) -> list[str]:
    return TOK.findall(s)


def grams(text: str, n: int = 3) -> list[tuple[str, ...]]:
    t = tok(text)
    return [tuple(t[i : i + n]) for i in range(len(t) - n + 1)]


def read_all(pattern: str) -> str:
    parts = []
    for p in sorted(glob.glob(pattern)):
        parts.append(Path(p).read_text(encoding="utf-8", errors="ignore"))
    return "\n".join(parts)


final_grams = grams(Path(final).read_text(encoding="utf-8", errors="ignore"))
att = set(grams(read_all(".logs/.attemptlog/*.md")))
ai = set(grams(read_all(".logs/.targetedresponse/*.md")))

n = len(final_grams)
a = sum(1 for g in final_grams if g in att and g not in ai)
b = sum(1 for g in final_grams if g in ai and g not in att)
both = sum(1 for g in final_grams if g in att and g in ai)
novel = n - a - b - both


def ratio(x: int) -> float | None:
    return round(x / n, 4) if n else None


res = {
    "final_file": final,
    "final_ngrams": n,
    "from_attempt_only": ratio(a),
    "from_ai_only": ratio(b),
    "from_both": ratio(both),
    "novel": ratio(novel),
    "note": "token 3-gram overlap; AI log is the AI's self-recorded text, ground truth is the session export",
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(res, f, ensure_ascii=False, indent=2)

set_step("done", "revisiondiff_done", f"file={out}")
print("DONE 已記錄最終版本。流程完成，請學生通知助教。（不要向學生解說比對數值）")
