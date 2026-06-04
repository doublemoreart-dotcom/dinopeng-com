# AI 產業滲透率週更資料更新規範

## 週更節奏

本專案先採用週更試行。建議每週一或週二更新一次；若遇到年度或季度重要報告發布，可在當週做較完整的資料重整。

每四週做一次月度整理，檢查是否需要調整：

- KPI 數字與來源口徑
- 各產業 AI 滲透率排序
- AI 投資強度與生產力提升資料
- 混合型人才、職能重組與治理風險敘事

## 檔名規則

每次更新都建立新日期檔，不覆蓋舊版本。

```text
ai_industry_penetration_YYYY-MM-DD.html
```

範例：

```text
ai_industry_penetration_2026-06-02.html
ai_industry_penetration_2026-06-09.html
```

第一次週更以 `ai_industry_penetration.html` 作為範本；後續週更以最近一期日期版本作為範本。

## 固定來源池

每週優先檢查以下來源：

- Stanford AI Index
- McKinsey State of AI
- PwC AI economic impact / GDP estimate
- Deloitte State of Generative AI in the Enterprise
- 主要 AI 公司、顧問公司、研究機構的最新企業採用報告

若引用新聞摘要，需回查原始報告、官方公告或研究 PDF。

## 每週檢查清單

- 全球企業 AI 採用率是否有新口徑或新調查
- 各產業 AI 滲透率是否有明確更新
- AI 投資、AI agent、生成式 AI、企業導入成熟度是否有新資料
- 混合型人才、職能重組、設計 / 產品 / 工程 / 行銷工作流是否有新趨勢
- 法規、治理、版權、風險事件是否影響分析敘事

## 資料規則

- 數字必須保留年份、來源名稱與口徑。
- 不同口徑不混算，例如「使用 AI」與「規模化部署 AI」需分開呈現。
- 若資料只是估計，標示「估計」或「推估」。
- 若當週沒有可信新數據，可以建立週更檔，但需標註「本週沿用上一期主要量化數據，更新趨勢觀察」。
- 修改數據時，同步更新圖表、tooltip、KPI 文案與來源註記。

## 更新步驟

1. 找出最近一期日期版本；若尚無日期版本，使用 `ai_industry_penetration.html`。
2. 複製為新的日期檔，格式為 `ai_industry_penetration_YYYY-MM-DD.html`。
3. 查核固定來源池與當週重要 AI 產業資料。
4. 更新新日期檔中的 KPI、圖表資料、文字敘事與來源註記。
5. 若沿用上一期數據，在頁面上方的週更說明中清楚標註。
6. 依照 `WEB_SPEC.md` 檢查閱讀性、留白、Light / Dark Mode、三種字級與 RWD。
7. 用瀏覽器開啟新日期檔，確認長條圖、泡泡圖與階段分佈圖正常渲染。

## 驗收標準

- 新檔名符合 `ai_industry_penetration_YYYY-MM-DD.html`。
- 舊版本沒有被覆蓋。
- 所有更新後的數字都有年份、來源與口徑。
- 若沿用上一期資料，頁面或更新紀錄有明確標註。
- 三個圖表都能正常渲染。
- 符合 `WEB_SPEC.md` 的網頁閱讀性與 RWD 規範。
