#!/usr/bin/env bash
# 用法：record.sh <資料夾> <預期步驟> <字數下限> <通過後步驟>
# 內容由 stdin 讀入（請用 heredoc）。
# 行為：步驟不符 → 拒絕；否則存成 <資料夾>/<時間戳>.md；
#       字數 > 下限 → step.log 記錄進入下一步；否則記錄 short，維持原步驟。
set -u
cd "$(dirname "$0")/../.." || exit 1
. .research/bin/lib.sh

folder=$1; expected=$2; min=$3; next=$4
event=${folder#.}
cur=$(cur_step)
text=$(cat)

if [ "$cur" != "$expected" ]; then
  log_event "$cur" "${event}_wrongstep" "expected=$expected"
  echo "WRONG_STEP 目前是 Step $cur，此動作只能在 Step $expected 使用。未記錄。請重新執行 step.sh。"
  exit 1
fi

mkdir -p "$folder"
ts=$(now)
printf '%s\n' "$text" > "$folder/$ts.md"
len=$(printf '%s' "$text" | python3 -c 'import sys; print(len(sys.stdin.read().strip()))')

if [ "$len" -gt "$min" ]; then
  log_event "$next" "${event}_pass" "len=$len file=$folder/$ts.md"
  echo "PASS len=$len 已記錄。目前為 Step $next。"
else
  log_event "$cur" "${event}_short" "len=$len file=$folder/$ts.md"
  echo "SHORT len=$len（需大於 $min）。已記錄，但未進入下一步。"
fi
