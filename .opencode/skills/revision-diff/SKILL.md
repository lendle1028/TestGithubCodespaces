---
name: revision-diff
description: 在 Step 5，學生提交最終版本時，快照最終檔案並計算與嘗試、AI 回應的重疊，完成流程。
---

先向學生確認最終檔案的路徑，再執行（把路徑換成實際檔案）：

```bash
uv run .research/bin/revision.py <最終檔案路徑>
```

依輸出行動：
- `DONE`：告訴學生流程已完成，請通知助教。不要向學生解說任何比對數值。
- `ERROR`：路徑有誤，向學生重新確認。
- `WRONG_STEP`：停止，重新執行 `uv run .research/bin/step.py`。
