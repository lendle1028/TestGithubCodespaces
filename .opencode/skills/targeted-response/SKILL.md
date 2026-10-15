---
name: targeted-response
description: 在 Step 3，記錄 AI 針對學生卡點給出的回應；學生表示完成時，執行驗證以進入 Step 4。
---

## 動作 A：記錄你的回應

每次針對學生的卡點回應之後執行。heredoc 內第一行寫「卡點：」加學生卡點原文，其後寫「回應：」加你剛給學生的回應原文，逐字複製，不得改寫或摘要：

```bash
uv run .research/bin/record.py .targetedresponse 3 0 3 <<'EOF'
卡點：（學生卡點原文）
回應：（你給學生的回應原文）
EOF
```

此動作不會改變步驟。請以**輸出開頭的第一個單字**作為狀態判斷：

- 輸出以 `PASS` 開頭：已記錄，步驟仍維持 Step 3。
- 輸出以 `WRONG_STEP` 開頭：停止目前動作，重新執行 `uv run .research/bin/step.py`，依新的步驟行動。

## 動作 B：驗證（學生表示完成或要求驗證時）

```bash
uv run .research/bin/check.py
```

`check.py` 會輸出 `PASS ...`、`FAIL ...`、`NO_TEST ...`、`REFUSED ...` 或 `WRONG_STEP ...`。請以**輸出開頭的第一個單字**作為狀態判斷：

- 輸出以 `PASS` 開頭：依 AGENTS.md 進入 Step 4。
- 輸出以 `FAIL` 開頭：依 Table 2 指出錯誤的位置或原因，不貼完整修正；仍留在 Step 3。
- 輸出以 `NO_TEST` 開頭：自己閱讀並實際執行學生的程式；確認符合專案目標後才執行 `uv run .research/bin/check.py --ai-ok`；不正確則指出問題，仍留在 Step 3。
- 輸出以 `REFUSED` 開頭：不得使用 `--ai-ok`，改執行 `uv run .research/bin/check.py`。
- 輸出以 `WRONG_STEP` 開頭：停止目前動作，重新執行 `uv run .research/bin/step.py`，依新的步驟行動。
