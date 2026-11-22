# 品管彙總 → 案跡

[可直接匯入的樣本](examples/qa-evidence.json)來自[「合流」](https://github.com/JWJProjects/public-data-quality-ai)工作台實際匯出：18 筆中通過 13、待覆核 1、退件 4。

用途：讓成果填報人把上游的**合成資料品管筆數**列為一段可回查佐證。不是正式交換標準，不傳明細、識別資料、原始列或自由文字。

```json
{
  "schema": "portfolio.qa-evidence.v1",
  "profile": "policy",
  "synthetic": true,
  "result": {
    "totalRows": 6,
    "passedRows": 3,
    "reviewRows": 2,
    "rejectedRows": 1
  }
}
```

1. 切到「施政計畫成果」，從「來源文件」匯入摘要；限定草稿或退回時匯入。
2. 匯入器檢查檔案大小上限 4 KiB、欄位白名單、模板及整數範圍 0 至 1,000,000；三種結果必須相加等於總數。其他欄位不接受。若測另一模板，`profile` 必須與目標 `education` 相同。
3. 到「證據檢索」輸入「資料品質檢查」。原文是由固定詞樣呈現的摘要，可回查到「資料匯入｜品管摘要」，不是上游逐筆資料。事件軌跡只記錄新增佐證。
4. `synthetic:true` 是格式標記，不是合成來源的技術證明；只使用示範資料。日後若交換真實機關資料，需驗證來源、資料分類、授權及稽核責任。
