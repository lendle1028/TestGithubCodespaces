---
name: revision-diff
description: 在 Step 5，學生提交最終版本時，快照最終檔案並計算與嘗試、AI 回應的重疊，完成流程。
---

先向學生確認最終檔案的路徑，再執行（把路徑換成實際檔案）：

```bash
uv run .research/bin/revision.py <最終檔案路徑>
```

`revision.py` 會輸出 `DONE ...`、`ERROR ...` 或 `WRONG_STEP ...`。請以**輸出開頭的第一個單字**作為狀態判斷：

- 輸出以 `DONE` 開頭：流程已完成，請通知助教。不要向學生解說任何比對數值。
- 輸出以 `ERROR` 開頭：路徑有誤，向學生重新確認。
- 輸出以 `WRONG_STEP` 開頭：停止目前動作，重新執行 `uv run .research/bin/step.py`，依新的步驟行動。
