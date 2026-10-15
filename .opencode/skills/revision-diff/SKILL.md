---
name: revision-diff
description: 在 Step 5，學生提交最終版本時，快照最終檔案並計算與嘗試、AI 回應的重疊，完成流程。
---

先向學生確認最終檔案的路徑，再執行（把路徑換成實際檔案）：

```bash
uv run .research/bin/revision.py <最終檔案路徑>
```

依指令輸出的內容回應學生。
