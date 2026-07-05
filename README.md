# AI 產業滲透率與實際影響分析

這是一個單頁 HTML 資料視覺化專案，用來呈現 AI 在各大產業的採用程度、投資強度、生產力影響，以及 AI 時代「混合型人才」對設計、產品、工程、行銷與商業流程的影響範圍。

## 檔案

- `index.html`：根網址相容入口，目前同步 `ai_industry_penetration_2026-07-05.html`。
- `aidata/index.html`：正式專案網址入口，與根目錄 `index.html` 保持完全同步。
- `ai_industry_penetration.html`：原本機版視覺化頁面，保留作為初始版本，不因 MVP 上線入口而覆蓋。
- `ai_industry_penetration_YYYY-MM-DD.html`：週更後的歷史版本檔案，不覆蓋舊版。
- `AGENTS.md`：給 Codex / Claude Code / Cursor Agent 讀取的專案規範與任務指引。
- `DATA_UPDATE.md`：週更節奏、資料來源、檔名規則與更新清單。
- `WEB_SPEC.md`：每次週更都必須遵守的網頁閱讀性、主題、字級與 RWD 規範。
- `data/ai_public_reports_for_codex.csv`：公開報告來源索引，只作為引用候選與選題提示；未核定口徑前不直接改 KPI 或圖表數字。
- `data/ai_company_valuation_2026-07-01.csv`：AI 公司估值排行榜的查核快照，保存估值／市值、基準日、來源層級與方法備註。
- `ai_company_valuation_ranking_test.html`：AI 公司估值排行榜的獨立 UI 測試頁，不列入正式頁面導覽。
- `tests/ai_company_valuation_ranking_test.mjs`：排行榜原型的 Node 靜態契約測試。

## 如何查看

直接用瀏覽器開啟：

```bash
open index.html
```

若要查看原本機版，可開啟：

```bash
open ai_industry_penetration.html
```

頁面使用 Chart.js CDN，需有網路連線才能正常載入泡泡圖與採用階段圖表。`index.html` 已加入載入失敗提示；若 CDN 受阻，文字內容、KPI、產業滲透率長條與互動卡片仍可閱讀。

## 本機 MVP 與 GitHub Pages

`index.html` 是目前建議上線入口。若要部署到 GitHub Pages，可使用下列設定：

- 建立 GitHub repo，例如 `ai-industry-penetration-analysis`。
- 將本專案推到 `main` branch。
- 在 GitHub repo 的 Settings → Pages 設定：
  - Source：Deploy from a branch
  - Branch：`main`
  - Folder：`/root`

本專案已將 GitHub Pages 自訂網域設為 `dinopeng.com`，正式專案網址為：

```text
https://dinopeng.com/aidata/
```

根網址 `https://dinopeng.com/` 暫時保留相同內容，避免既有連結失效；未來可改為個人首頁。`aidata/index.html` 與 `aidata/assets/` 是 `/aidata/` 路徑的發布副本，每次推版必須和根目錄入口及資源同步。

自訂網域由根目錄的 `CNAME` 管理。網域供應商的 DNS 需另外設定：

- 根網域 `@`：四筆 `A` 紀錄，分別指向 `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`。
- `www`：一筆 `CNAME` 紀錄，指向 `doublemoreart-dotcom.github.io`。
- 移除與上述設定衝突的舊 `A`、`AAAA` 或 `CNAME` 紀錄。

DNS 生效後，在 GitHub repo 的 Settings → Pages 確認 Custom domain 為 `dinopeng.com`，並啟用 Enforce HTTPS。

## 週更與版本命名

本專案先採用週更試行。每次更新都建立新日期檔，不覆蓋舊版本。

```text
ai_industry_penetration_YYYY-MM-DD.html
```

第一次週更以 `ai_industry_penetration.html` 作為範本；後續週更以最近一期日期版本作為範本。

若當週沒有可信新數據，仍可建立週更檔，但需在頁面或更新紀錄中標註「本週沿用上一期主要量化數據，更新趨勢觀察」。

每次推版前都需依照 `DATA_UPDATE.md` 做低強度來源確認：檢查 3-5 個核心來源是否有新版本、新年份或新口徑；若無可信新數據，保留原數字並標註沿用。

每次週更也必須套用 `WEB_SPEC.md`，確認：

- 上下左右保留適度留白。
- 可切換 Light / Dark Mode。
- 可選擇小 / 中 / 大三種字級。
- 符合 RWD，手機版不溢出。

## 內容重點

- 各產業 AI 滲透率
- AI 投資規模與生產力提升潛力
- 各產業 AI 應用的實際影響
- AI 採用階段分佈
- 混合型人才如何重組設計價值鏈與職能分工
- 公開報告來源池如何支撐 KPI、產業滲透、企業成熟度、人才職能與治理信任敘事

## 維護提醒

若調整採用率、投資規模或生產力提升數值，請同步更新：

- HTML 中的資料陣列
- 圖表標籤與 tooltip
- KPI 文字說明
- `AGENTS.md` 中的資料口徑與驗收標準
- `DATA_UPDATE.md` 中的週更規則或來源池
- `WEB_SPEC.md` 中的網頁規範是否仍被遵守

新增公開報告來源時，先把 CSV 或來源清單視為引用候選索引；未逐份確認年份、樣本、調查對象與口徑前，不要把其中數字直接放進 KPI 或圖表。
