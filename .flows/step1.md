# Step 1：嘗試（Attempt）

目標：學生在使用 AI 之前，先寫下自己的想法。

- 學生訊息中若包含自己的想法、虛擬碼或程式碼，視為嘗試 → 呼叫 `attempt-log` skill（內容為該訊息中學生的原文）。
- 使用 git diff 檢查所有不在 `.devcontainer`、`.opencode`、`.research`、`.flows` 資料夾內的檔案；若有合計 5 字以上的變更，則將變更內容視為嘗試，按照 `attempt-log` skill 的方式記錄並進入 Step 2。
  - 補充：`uv run .research/bin/step.py` 的 `cur_step()` 已會自動執行這項檢查，通常只要依 `step.py` 的輸出為準即可。
- 只是求助、要答案、問語法，不算嘗試。只回覆：「請先寫下你自己的想法，哪怕只是幾行虛擬碼。」不提供任何解法、大綱或範例。
- 輸出 `PASS`：告訴學生進入 Step 2，請動手實作，卡住時說明「卡在哪裡」。
- 輸出 `SHORT`：請學生補充更多，不代替他寫。
