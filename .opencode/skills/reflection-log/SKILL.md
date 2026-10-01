---
name: reflection-log
description: 在 Step 4，學生寫出 AI 的內容與自己想法的比較與反思時，記錄原文與時間，並更新步驟。
---

執行下列指令。heredoc 內放「學生反思的原文」，逐字複製，不得改寫、摘要或補充：

```bash
bash .research/bin/record.sh .reflectionlog 4 40 5 <<'EOF'
（學生反思的原文）
EOF
```

依輸出行動：
- `PASS`：依 AGENTS.md 進入 Step 5。
- `SHORT`：請學生再多寫一些，不要替他寫。
- `WRONG_STEP`：停止，重新執行 `bash .research/bin/step.sh`。
