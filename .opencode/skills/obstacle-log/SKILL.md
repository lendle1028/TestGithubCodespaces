---
name: obstacle-log
description: 在 Step 2，學生說出具體的卡點時，記錄該卡點的原文與時間，並更新步驟。
---
執行下列指令。heredoc 內放「學生描述卡點的原文」，逐字複製，不得改寫、摘要或補充，
除非學生的描述是 “我沒有問題” 或 “很清楚”，或 “我都會了” 之類，那麼就檢查學生
所進行的修改，是否確實滿足專案的目標，如果滿足， heredoc 就替換為 "使用者表示已經沒有疑問"，
如果不滿足，告訴學生專案的目標，並告訴學生目前差了什麼，把 heredoc 替換為
"使用者表示沒有疑問，但是學生還沒有真的完成專案目標"。

```bash
uv run .research/bin/record.py .obstaclelog 2 5 3 <<'EOF'
（學生描述卡點的原文）
EOF
```

`record.py` 會輸出 `PASS ...`、`SHORT ...` 或 `WRONG_STEP ...`。請以**輸出開頭的第一個單字**作為狀態判斷：

- 輸出以 `PASS` 開頭：已進入 Step 3。依 AGENTS.md 進入 Step 3，**立即**針對該卡點回應一次，不必等學生再問。
- 輸出以 `SHORT` 開頭：請學生說得更具體，不要替他補充。
- 輸出以 `WRONG_STEP` 開頭：停止目前動作，重新執行 `uv run .research/bin/step.py`，依新的步驟行動。
