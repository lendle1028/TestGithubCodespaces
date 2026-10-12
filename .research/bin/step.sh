#!/usr/bin/env bash
# 輸出目前步驟，例如 STEP=1 / STEP=DONE
cd "$(dirname "$0")/../.." || exit 1
. .research/bin/lib.sh
s=$(cur_step)
echo "STEP=${s^^}"
