---
name: reflection-log
description: 在 Step 4，學生寫出 AI 的內容與自己想法的比較與反思時，記錄原文與時間，並更新步驟。
---

執行下列指令。heredoc 內放「學生反思的原文」，逐字複製，不得改寫、摘要或補充：

```bash
uv run .research/bin/record.py .reflectionlog 4 5 5 <<'EOF'
（學生反思的原文）
EOF
```

`record.py` 會輸出 `PASS ...`、`SHORT ...` 或 `WRONG_STEP ...`。請以**輸出開頭的第一個單字**作為狀態判斷：

- 輸出以 `PASS` 開頭：已進入 Step 5。依 AGENTS.md 進入 Step 5。
- 輸出以 `SHORT` 開頭：請學生再多寫一些，不要替他寫。
- 輸出以 `WRONG_STEP` 開頭：停止目前動作，重新執行 `uv run .research/bin/step.py`，依新的步驟行動。
