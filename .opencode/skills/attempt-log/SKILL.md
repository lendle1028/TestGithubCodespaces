---
name: attempt-log
description: 在 Step 1，學生提出自己的嘗試時，記錄該嘗試的原文與時間，並更新步驟。
---

執行下列指令。heredoc 內放「學生嘗試的原文」，逐字複製，不得改寫、摘要或補充：

```bash
uv run .research/bin/attempt-log.py <<'EOF'
（學生嘗試的原文）
EOF
```

依指令輸出的內容回應學生。
