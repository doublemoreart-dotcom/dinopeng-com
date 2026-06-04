# AI 產業滲透率與實際影響分析

這是一個單頁 HTML 資料視覺化專案，用來呈現 AI 在各大產業的採用程度、投資強度、生產力影響，以及 AI 時代「混合型人才」對設計、產品、工程、行銷與商業流程的影響範圍。

## 檔案

- `index.html`：本機可上線 MVP 入口頁，基於 `ai_industry_penetration_2026-06-02.html` 補齊標準 HTML 外殼、SEO / Open Graph、Chart.js 載入失敗提示，以及混合型人才相關分析區塊。
- `ai_industry_penetration.html`：原本機版視覺化頁面，保留作為初始版本，不因 MVP 上線入口而覆蓋。
- `ai_industry_penetration_YYYY-MM-DD.html`：週更後的歷史版本檔案，不覆蓋舊版。
- `AGENTS.md`：給 Codex / Claude Code / Cursor Agent 讀取的專案規範與任務指引。
- `DATA_UPDATE.md`：週更節奏、資料來源、檔名規則與更新清單。
- `WEB_SPEC.md`：每次週更都必須遵守的網頁閱讀性、主題、字級與 RWD 規範。

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

部署完成後，公開網址通常會是：

```text
https://<github-username>.github.io/ai-industry-penetration-analysis/
```

## 週更與版本命名

本專案先採用週更試行。每次更新都建立新日期檔，不覆蓋舊版本。

```text
ai_industry_penetration_YYYY-MM-DD.html
```

第一次週更以 `ai_industry_penetration.html` 作為範本；後續週更以最近一期日期版本作為範本。

若當週沒有可信新數據，仍可建立週更檔，但需在頁面或更新紀錄中標註「本週沿用上一期主要量化數據，更新趨勢觀察」。

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

## 維護提醒

若調整採用率、投資規模或生產力提升數值，請同步更新：

- HTML 中的資料陣列
- 圖表標籤與 tooltip
- KPI 文字說明
- `AGENTS.md` 中的資料口徑與驗收標準
- `DATA_UPDATE.md` 中的週更規則或來源池
- `WEB_SPEC.md` 中的網頁規範是否仍被遵守
