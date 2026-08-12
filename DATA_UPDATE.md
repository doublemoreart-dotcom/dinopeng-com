# AI 產業滲透率週更資料更新規範

## 週更節奏

本專案先採用週更試行。建議每週一或週二更新一次；若遇到年度或季度重要報告發布，可在當週做較完整的資料重整。

每四週做一次月度整理，檢查是否需要調整：

- KPI 數字與來源口徑
- 各產業 AI 滲透率排序
- AI 投資強度與生產力提升資料
- 混合型人才、職能重組與治理風險敘事

## 更新分流

每次開始前先判斷更新深度，避免把小調整做成完整資料重整，也避免資料改動缺少來源查核。

### A. 快速更新

適用於：

- UI、排版、RWD、Light / Dark、字級、主視覺、icon、卡片互動。
- 不改 KPI、圖表數字、排行榜數字、來源口徑。

必做：

- 檢查 `AI 公司估值排行榜` 是否有明顯新的公司公告、一線媒體報導或上市公司市值基準日。
- 若無可信新資料，只記錄「本次不更新排行榜數據」即可。
- 使用 `npm run update:start -- --date YYYY-MM-DD --sources-checked --valuation-checked` 開始，完成獨立來源編輯後執行 `npm run update:finish`；只有需要中途診斷時才執行 `npm run update:status`。

### B. 資料更新

適用於：

- 修改 KPI、產業滲透率、泡泡圖、採用階段、AI 公司估值排行榜或 tooltip 數字。
- 新增或替換來源引用。

必做：

- 完成低強度來源確認；若新資料會改圖表或 KPI，升級為中強度更新。
- 每個新增數字都保留年份、來源、樣本或口徑。
- 同步更新頁面文案、資料註記、公開報告來源池與必要的 CSV。
- 使用 `npm run update:start -- --date YYYY-MM-DD --sources-checked --valuation-checked` 開始，完成獨立來源編輯後執行 `npm run update:finish`；只有需要中途診斷時才執行 `npm run update:status`。

### C. 正式推版

適用於：

- 要發佈到 `https://dinopeng.com/aidata/`。
- 要建立 Git commit / push。

必做：

- 完成 A 或 B。
- 確認 `git status --short` 只包含本次預期檔案。
- push 後執行 `npm run release:verify -- <commit>`。

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
- PwC Sizing the Prize（2017 年發布的 2030 年經濟影響估計）/ Global AI Jobs Barometer
- Deloitte State of AI in the Enterprise
- OECD firm-level AI adoption / OECD AI governance reports
- Microsoft AI Economy Institute / State of Global AI Diffusion reports
- World Economic Forum Future of Jobs / AI in Action reports
- BCG AI Radar、EY AI Pulse、Wharton AI Adoption Report 等企業採用與 ROI 報告
- Anthropic Economic Index、Microsoft Copilot Usage Report 等任務層級使用資料
- 主要 AI 公司、顧問公司、研究機構的最新企業採用報告

2026-08-03 查核基準：Stanford AI Index 2026、McKinsey State of AI 2025、Deloitte State of AI in the Enterprise 2026、OECD 2026 企業採用更新、Microsoft State of Global AI Diffusion 2026、Anthropic Economic Index June 2026 與 PwC 2026 Global AI Jobs Barometer。PwC US$15.7 兆指標必須同時標示「2017 年發布、2030 年估計」。

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

## 標準更新步驟

1. 判斷更新屬於快速更新、資料更新或正式推版。
2. 執行推版前低強度來源確認，並必查 `AI 公司估值排行榜` 是否仍為最新數據；若發現重大新資料，再升級為中強度更新。
3. 若是資料更新，查核固定來源池與當週重要 AI 產業資料。
4. 執行 `npm run update:start -- --date YYYY-MM-DD --sources-checked --valuation-checked`。此步會同步版本日期、一般來源查核日、估值查核日、版號與 README 快照名稱；任一類來源未確認時不會開始。
5. 只編輯 `.worktrees/aidata-source/index.html`；`aidata/index.html` 是自動同步的部署快照，根目錄 `index.html` 則是 `dinopeng.com` 跨專案入口，兩者都不應作為 AI Data 內容的主要編輯檔。
6. 若修改資料，同步更新 KPI、圖表資料、tooltip、文字敘事、來源註記與必要 CSV。
7. 若沿用上一期數據，在頁面摘要或更新紀錄中清楚標註。
8. 依照 `WEB_SPEC.md` 檢查閱讀性、留白、Light / Dark Mode、三種字級與 RWD。
9. 執行 `npm run update:finish`。完成指令會先測試來源與 GA4，接著單向同步 HTML／assets，通過預檢後建立當期日期快照並執行完整守門檢查；只有需要中途診斷時才執行 `npm run update:status`。
10. 執行 `npm run aidata:source:status -- --strict`，確認獨立來源、部署快照、資源與 GA4 `G-BGHM581VD4` 完全一致，且每份正式 HTML 只初始化一次 GA4。
11. 用瀏覽器開啟 `aidata/index.html` 或新日期檔，確認長條圖、泡泡圖、階段分佈圖與新增互動正常渲染。
12. GitHub Pages 部署成功後執行 `npm run release:verify -- <commit>`。

## 驗收標準

- 新檔名符合 `ai_industry_penetration_YYYY-MM-DD.html`。
- 舊版本沒有被覆蓋。
- 每次推版前已完成低強度來源確認，或明確說明為何升級成中強度更新。
- 每次本機更新後，已查核 `AI 公司估值排行榜` 是否仍為最新可追溯資料；若沿用，需確認頁面上的資料整理時間、基準日與來源敘述仍合理。
- 所有更新後的數字都有年份、來源與口徑。
- 若沿用上一期資料，頁面或更新紀錄有明確標註。
- 三個圖表都能正常渲染。
- 獨立來源與入口網站部署快照一致，GA4 `G-BGHM581VD4` 沒有遺漏或重複初始化。
- 符合 `WEB_SPEC.md` 的網頁閱讀性與 RWD 規範。
