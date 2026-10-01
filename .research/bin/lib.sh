# 共用函式，由其他腳本 source。
LOG=".research/step.log"

now() { date -u +%Y%m%dT%H%M%S%3NZ; }

# 目前步驟：step.log 最後一行的 step= 欄位（1~5 或 done）
cur_step() { tail -n1 "$LOG" | sed -E 's/.* step=([^ ]+).*/\1/'; }

# log_event <步驟> <事件> [額外資訊]  → 只增不改
log_event() { echo "$(now) step=$1 event=$2${3:+ $3}" >> "$LOG"; }
