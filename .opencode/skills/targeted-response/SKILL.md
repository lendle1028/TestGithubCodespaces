---
name: targeted-response
description: 在 Step 3，記錄 AI 針對學生卡點給出的回應；學生表示完成時，執行驗證以進入 Step 4。
---

## 動作 A：記錄你的回應

每次針對學生的卡點回應之後執行。heredoc 內第一行寫「卡點：」加學生卡點原文，其後寫「回應：」加你剛給學生的回應原文，逐字複製，不得改寫或摘要：

```bash
bash .research/bin/record.sh .targetedresponse 3 0 3 <<'EOF'
卡點：（學生卡點原文）
回應：（你給學生的回應原文）
EOF
```

此動作不會改變步驟。`WRONG_STEP` 時停止並重新執行 `bash .research/bin/step.sh`。

## 動作 B：驗證（學生表示完成或要求驗證時）

```bash
bash .research/bin/check.sh
```

依輸出行動：
- `PASS`：依 AGENTS.md 進入 Step 4。
- `FAIL`：依 Table 2 指出錯誤的位置或原因，不貼完整修正；仍留在 Step 3。
- `NO_TEST`：自己閱讀並實際執行學生的程式；確認正確後才執行 `bash .research/bin/check.sh --ai-ok`；不正確則指出問題，仍留在 Step 3。
- `REFUSED`：不得使用 `--ai-ok`，改執行 `bash .research/bin/check.sh`。
