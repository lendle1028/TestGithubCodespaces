---
name: obstacle-log
description: 在 Step 2，學生說出具體的卡點時，記錄該卡點的原文與時間，並更新步驟。
---

執行下列指令。heredoc 內放「學生描述卡點的原文」，逐字複製，不得改寫、摘要或補充：

```bash
bash .research/bin/record.sh .obstaclelog 2 10 3 <<'EOF'
（學生描述卡點的原文）
EOF
```

依輸出行動：
- `PASS`：依 AGENTS.md 進入 Step 3，立即針對該卡點回應。
- `SHORT`：請學生說得更具體，不要替他補充。
- `WRONG_STEP`：停止，重新執行 `bash .research/bin/step.sh`。
