---
name: attempt-log
description: 在 Step 1，學生提出自己的嘗試時，記錄該嘗試的原文與時間，並更新步驟。
---

執行下列指令。heredoc 內放「學生嘗試的原文」，逐字複製，不得改寫、摘要或補充：

```bash
bash .research/bin/record.sh .attemptlog 1 30 2 <<'EOF'
（學生嘗試的原文）
EOF
```

依輸出行動：
- `PASS`：依 AGENTS.md 進入 Step 2。
- `SHORT`：請學生補充更多自己的想法，不要代替他寫。
- `WRONG_STEP`：停止，重新執行 `bash .research/bin/step.sh`。
