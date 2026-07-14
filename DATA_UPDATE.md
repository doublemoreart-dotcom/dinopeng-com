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

每週優先檢查以下來源。若使用 `data/ai_public_reports_for_codex.csv` 或後續整理出的公開報告清單，先把它視為「可引用來源索引」，不要直接視為可改圖表的量化資料集。

- Stanford AI Index
- McKinsey State of AI
- PwC AI economic impact / GDP estimate
- Deloitte State of Generative AI in the Enterprise
- OECD firm-level AI adoption / OECD AI governance reports
- Microsoft AI Economy Institute / AI Diffusion reports
- World Economic Forum Future of Jobs / AI in Action reports
- BCG AI Radar、EY AI Pulse、Wharton AI Adoption Report 等企業採用與 ROI 報告
- Anthropic Economic Index、Microsoft Copilot Usage Report 等任務層級使用資料
- 主要 AI 公司、顧問公司、研究機構的最新企業採用報告

若引用新聞摘要，需回查原始報告、官方公告或研究 PDF。

### 公開報告來源池分層

新增來源時建議先選 8-12 個核心來源，不要把完整來源清單全部放進頁面。建議分層如下：

- KPI / 宏觀影響：McKinsey、Stanford AI Index、PwC、Deloitte。
- 產業滲透與擴散：OECD firm-level adoption、Microsoft AI Diffusion。
- 企業成熟度與 ROI：Deloitte、BCG AI Radar、EY AI Pulse、Wharton AI Adoption Report。
- 人才職能與任務重組：WEF Future of Jobs、Anthropic Economic Index、Microsoft Copilot Usage Report。
- 治理、信任與公共部門：WEF AI in Action、OECD Governing with AI、KPMG trust study。

來源使用規則：

- CSV 中的 `use_case_summary` 只能作為選題提示；放進頁面前仍需回查原始報告頁、PDF 或官方發布頁。
- 無法確認年份、樣本、調查口徑或定義的數字，只能用於敘事背景，不放進 KPI、圖表資料或 tooltip 數值。
- 企業問卷、平台遙測、經濟估計與分析估計不可混算；引用時要標示「使用率」「規模化」「市場估計」「任務使用」等口徑。

## 推版前低強度來源確認

每次推版前，無論是內容更新、UI 微調或本機預覽修正，都需做一次低強度來源確認。此步驟的目的不是重做研究，而是避免頁面引用的核心外部數字已明顯過期。

低強度確認範圍：

- 檢查固定來源池中的 3-5 個核心來源是否有新版本、新年份或新口徑。
- 比對頁面目前使用的關鍵數字，例如企業 AI 採用率、agentic AI 規模化 / 實驗比例、AI 對 GDP 的長期估計。
- 必查 `AI 公司估值排行榜` 是否仍為最新可追溯資料：私人公司最近一輪已完成估值、上市公司市值基準日、30 日股價比較區間、來源連結、資料整理時間與公開報告來源池是否需要同步更新。
- 若沒有可信新數據，保留原數字，並在更新摘要或更新紀錄標註「本版沿用上一期主要量化數據，更新趨勢觀察」。
- 若只有來源敘事有變、數字未變，僅更新摘要文字或來源註記，不重畫圖表。
- 若發現新數字會影響 KPI、圖表或 tooltip，改為中強度更新，並同步調整相關資料與文案。

預估成本：

- Token：約 1,500-3,000 tokens。
- 時間：約 5-10 分鐘，視來源頁面是否容易取得而定。
- 主要耗損：外部搜尋、來源比對、年份與口徑確認、更新摘要改寫。

若要把新增公開報告來源池導入頁面，可依更新深度估算：

- 低成本版：只更新來源池、頁尾引用與少量文案註記。時間約 1-2 小時；算力很低；工具只需 CSV、瀏覽器、HTML 編輯。
- 中成本版：新增 8-12 個來源到頁面敘事、KPI 抽屜、tooltip 與本文件。時間約 3-5 小時；token 約 15k-30k；需 PDF / 網頁查核、繁中改寫、瀏覽器驗收。
- 高成本版：逐份報告抽取數字，重建 KPI、產業圖表與泡泡圖口徑。時間約 1-2 天；token 約 50k-100k；需 PDF 摘要、表格整理、來源交叉比對、Chart.js 資料更新與 RWD 測試。
- 網站執行端成本：目前仍是單檔 HTML + Chart.js CDN，新增來源文字或少量資料列不會明顯增加瀏覽器算力負擔。

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

### AI 公司估值排行榜

- 本機端任何項目更新時，都必須檢查本區是否為最新數據；即使只改 UI、文案或版面，也需確認是否有新的公司公告、投資方公告、一線媒體報導或市場基準日需要更新。
- 私人公司採最近一輪已完成、可追溯的融資估值；洽談中估值、收購選擇權與未完成交易不列入排名。
- 上市公司採同一交易日的公司整體市值，不推估 AI 部門價值，也不與私人公司合併排名。
- 上市公司短期變動採同一市場來源的收盤價計算，並清楚列出起訖交易日；不可用市值差冒充股價報酬。
- 每筆資料保留 `source_name`、`source_url`、`source_published_at`、`value_as_of`、`source_tier` 與 `methodology_note`。
- 公司公告優先；無公司公告時可使用 Reuters、Financial Times、Wall Street Journal 等一線媒體。市場市值與歷史價格優先使用交易所或監管來源。
- 外幣融資估值換算美元時標記為約值，並保留原幣口徑說明。
- 每次完整更新建立 `data/ai_company_valuation_YYYY-MM-DD.csv`，同步更新頁面卡片、詳情抽屜、資料備註與公開報告來源池。

## 更新步驟

1. 找出最近一期日期版本；若尚無日期版本，使用 `ai_industry_penetration.html`。
2. 更新 `aidata/index.html` 後，執行 `npm run release:prepare`，同步建立當期日期檔並將相對資源同步至 `aidata/assets/`；根目錄 `index.html` 是跨專案入口，不得由 AI Data 發布流程覆蓋。
3. 確認新的日期檔格式為 `ai_industry_penetration_YYYY-MM-DD.html`，日期需對應 `aidata/index.html` 的 `page-version-date`。
4. 執行推版前低強度來源確認，並必查 `AI 公司估值排行榜` 是否仍為最新數據；若發現重大新資料，再升級為中強度更新。
5. 查核固定來源池與當週重要 AI 產業資料。
6. 更新新日期檔中的 KPI、圖表資料、文字敘事與來源註記。
7. 若沿用上一期數據，在頁面上方的週更說明中清楚標註。
8. 依照 `WEB_SPEC.md` 檢查閱讀性、留白、Light / Dark Mode、三種字級與 RWD。
9. 用瀏覽器開啟新日期檔，確認長條圖、泡泡圖與階段分佈圖正常渲染。
10. 推版前執行 `npm run release:check`；GitHub Pages 部署成功後執行 `npm run release:verify -- <commit>`。

## 驗收標準

- 新檔名符合 `ai_industry_penetration_YYYY-MM-DD.html`。
- 舊版本沒有被覆蓋。
- 每次推版前已完成低強度來源確認，或明確說明為何升級成中強度更新。
- 每次本機更新後，已查核 `AI 公司估值排行榜` 是否仍為最新可追溯資料；若沿用，需確認頁面上的資料整理時間、基準日與來源敘述仍合理。
- 所有更新後的數字都有年份、來源與口徑。
- 若沿用上一期資料，頁面或更新紀錄有明確標註。
- 三個圖表都能正常渲染。
- 符合 `WEB_SPEC.md` 的網頁閱讀性與 RWD 規範。
