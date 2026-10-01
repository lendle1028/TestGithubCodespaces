#!/usr/bin/env bash
# 背景自動 commit（有差異才 commit）；每隔 PUSH_INTERVAL 秒 push 一次，確保作業 repo 看得到資料。
# 環境變數：INTERVAL=30  PUSH_INTERVAL=300（0＝不 push）  SYNC_OPENCODE=0（1＝同步 OpenCode session）
cd "$(dirname "$0")/../.." || exit 1
INTERVAL=${INTERVAL:-30}
PUSH_INTERVAL=${PUSH_INTERVAL:-300}
SYNC_OPENCODE=${SYNC_OPENCODE:-0}
OC_SRC="$HOME/.local/share/opencode/storage"   # 請在實際版本確認路徑與內容不含金鑰
last_push=0

while true; do
  if [ "$SYNC_OPENCODE" = "1" ] && [ -d "$OC_SRC" ]; then
    mkdir -p .research/opencode
    cp -ru "$OC_SRC/." .research/opencode/ 2>/dev/null
  fi

  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git -c user.name="research-bot" -c user.email="research-bot@users.noreply.invalid" \
        commit -qm "snapshot $(date -u +%FT%TZ)" 2>/dev/null
  fi

  if [ "$PUSH_INTERVAL" -gt 0 ]; then
    t=$(date +%s)
    if [ $((t - last_push)) -ge "$PUSH_INTERVAL" ]; then
      git push -q origin HEAD 2>/dev/null
      last_push=$t
    fi
  fi
  sleep "$INTERVAL"
done
