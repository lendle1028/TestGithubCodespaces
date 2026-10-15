---
name: targeted-response
description: 在 Step 3，記錄 AI 針對學生卡點給出的回應；學生表示完成時，執行驗證。
---

## 動作 A：記錄你的回應

每次針對學生的卡點回應之後執行。heredoc 內第一行寫「卡點：」加學生卡點原文，其後寫「回應：」加你剛給學生的回應原文，逐字複製，不得改寫或摘要：

```bash
uv run .research/bin/targeted-response.py record <<'EOF'
卡點：（學生卡點原文）
回應：（你給學生的回應原文）
EOF
```

依指令輸出的內容回應學生。

## 動作 B：驗證（學生表示完成或要求驗證時）

```bash
uv run .research/bin/targeted-response.py check
```

依指令輸出的內容回應學生。
