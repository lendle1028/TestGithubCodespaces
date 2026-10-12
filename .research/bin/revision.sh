#!/usr/bin/env bash
# 用法：revision.sh <最終檔案路徑>
# Step 5：快照最終檔，計算它與「學生嘗試」「AI 回應」的 token 3-gram 重疊比例。
set -u
cd "$(dirname "$0")/../.." || exit 1
. .research/bin/lib.sh

final=${1:-}
cur=$(cur_step)
if [ "$cur" != "5" ]; then
  log_event "$cur" "revisiondiff_wrongstep"
  echo "WRONG_STEP 目前是 Step $cur，此動作只能在 Step 5 使用。"
  exit 1
fi
if [ -z "$final" ] || [ ! -f "$final" ]; then
  echo "ERROR 找不到最終檔案：'$final'。請向學生確認路徑。"
  exit 1
fi

mkdir -p .revisiondiff
ts=$(now)
cp "$final" ".revisiondiff/$ts.final.txt"
out=".revisiondiff/$ts.json"

python3 - "$final" "$out" <<'PY'
import sys, re, glob, json

final_path, out_path = sys.argv[1], sys.argv[2]
tok = lambda s: re.findall(r"[A-Za-z_]\w*|\d+|[\u4e00-\u9fff]|\S", s)

def grams(text, n=3):
    t = tok(text)
    return [tuple(t[i:i+n]) for i in range(len(t) - n + 1)]

def read_all(pattern):
    parts = []
    for p in sorted(glob.glob(pattern)):
        with open(p, encoding="utf-8", errors="ignore") as f:
            parts.append(f.read())
    return "\n".join(parts)

final = grams(open(final_path, encoding="utf-8", errors="ignore").read())
att = set(grams(read_all(".attemptlog/*.md")))
ai = set(grams(read_all(".targetedresponse/*.md")))

n = len(final)
a = sum(1 for g in final if g in att and g not in ai)
b = sum(1 for g in final if g in ai and g not in att)
both = sum(1 for g in final if g in att and g in ai)
novel = n - a - b - both
r = lambda x: round(x / n, 4) if n else None

res = {
    "final_file": final_path, "final_ngrams": n,
    "from_attempt_only": r(a), "from_ai_only": r(b),
    "from_both": r(both), "novel": r(novel),
    "note": "token 3-gram overlap; AI log is the AI's self-recorded text, ground truth is the session export",
}
json.dump(res, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY

log_event done "revisiondiff_done" "file=$out"
echo "DONE 已記錄最終版本。流程完成，請學生通知助教。（不要向學生解說比對數值）"
