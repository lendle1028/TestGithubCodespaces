#!/usr/bin/env bash
# Step 3 → Step 4 的驗證。
# 有 .research/test_cmd（一行指令，exit 0 代表通過）→ 執行它，PASS 才進 Step 4。
# 沒有 test_cmd → 需由 AI 自行檢查後加 --ai-ok；有 test_cmd 時拒絕 --ai-ok。
set -u
cd "$(dirname "$0")/../.." || exit 1
. .research/bin/lib.sh

cur=$(cur_step)
if [ "$cur" != "3" ]; then
  log_event "$cur" "check_wrongstep"
  echo "WRONG_STEP 目前是 Step $cur，驗證只能在 Step 3 使用。"
  exit 1
fi

if [ -f .research/test_cmd ]; then
  if [ "${1:-}" = "--ai-ok" ]; then
    log_event 3 "check_refused_ai_ok"
    echo "REFUSED 本任務有自動測試，不接受 --ai-ok。請直接執行 check.sh。"
    exit 1
  fi
  out=$(bash .research/test_cmd 2>&1); rc=$?
  if [ $rc -eq 0 ]; then
    log_event 4 "check_pass" "mode=test"
    echo "PASS 測試通過。目前為 Step 4。"
  else
    log_event 3 "check_fail" "mode=test rc=$rc"
    echo "FAIL 測試未通過。輸出（最後 15 行）："
    echo "$out" | tail -n 15
  fi
else
  if [ "${1:-}" = "--ai-ok" ]; then
    log_event 4 "check_pass" "mode=ai"
    echo "PASS（AI 判定）。目前為 Step 4。"
  else
    log_event 3 "check_notest"
    echo "NO_TEST 本任務沒有自動測試。請閱讀並實際執行學生的程式；確認正確才執行：bash .research/bin/check.sh --ai-ok"
  fi
fi
