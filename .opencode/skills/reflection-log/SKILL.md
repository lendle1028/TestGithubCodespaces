---
name: reflection-log
description: 在 Step 4，學生寫出 AI 的內容與自己想法的比較與反思時，記錄原文與時間，並更新步驟。
---

執行下列指令。heredoc 內放「學生反思的原文」，逐字複製，不得改寫、摘要或補充：

```bash
uv run .research/bin/reflection-log.py <<'EOF'
（學生反思的原文）
EOF
```

依指令輸出的內容回應學生。
