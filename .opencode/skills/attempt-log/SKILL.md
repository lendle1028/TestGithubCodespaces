---
name: attempt-log
description: 在 Step 1，學生提出自己的嘗試時，記錄該嘗試的原文與時間，並更新步驟。
---

執行下列指令。heredoc 內放「學生嘗試的原文」，逐字複製，不得改寫、摘要或補充：

```bash
uv run .research/bin/record.py .attemptlog 1 5 2 <<'EOF'
（學生嘗試的原文）
EOF
```

`record.py` 會輸出 `PASS ...`、`SHORT ...` 或 `WRONG_STEP ...`。請以**輸出開頭的第一個單字**作為狀態判斷：

- 輸出以 `PASS` 開頭：已進入 Step 2。依 AGENTS.md 進入 Step 2，告訴學生請動手實作，卡住時說明「卡在哪裡」。
- 輸出以 `SHORT` 開頭：請學生補充更多自己的想法，不要代替他寫。
- 輸出以 `WRONG_STEP` 開頭：停止目前動作，重新執行 `uv run .research/bin/step.py`，依新的步驟行動。
