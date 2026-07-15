# Update And Release Flow

本專案維持單檔 HTML 架構；上版時讓人工負責內容判斷，腳本負責守住同步、日期快照與線上檔案一致性。

## 1. 判斷更新類型

每次更新先判斷屬於哪一種工作，避免所有調整都變成完整資料重整：

- 快速更新：只改 UI、文案、樣式、圖像或互動。仍需檢查 AI 公司估值排行榜是否有明顯新資料，但若無新可信來源，不改資料。
- 資料更新：會改 KPI、圖表、tooltip、排行或來源說明。需依 `DATA_UPDATE.md` 做低強度或中強度來源確認。
- 正式推版：準備發佈到 `https://dinopeng.com/aidata/`。需執行 prepare、check、commit、push、verify。

## 2. 推版前來源確認

每次推版前先做 `DATA_UPDATE.md` 定義的低強度來源確認：

- 檢查 3-5 個核心來源是否有新版本、新年份或新口徑。
- 必查 AI 公司估值排行榜的私人公司估值、上市公司市值基準日、30 日股價區間、來源連結與資料整理時間。
- 若發現會影響 KPI、圖表或 tooltip 的新數字，改為中強度更新。

## 3. 編輯來源檔

AI Data 的主要編輯入口是：

```text
aidata/index.html
```

根目錄 `index.html` 是 `dinopeng.com` 跨專案入口，不是 AI Data 報告頁。更新 AI Data 時不要用 `aidata/index.html` 覆蓋根目錄 `index.html`，也不要把根目錄入口改回報告頁。

## 4. 準備本機發布檔

```bash
npm run release:prepare
```

此指令會：

- 依 `aidata/index.html` 的 `page-version-date` 建立或更新 `ai_industry_penetration_YYYY-MM-DD.html`。
- 將 `assets/` 同步到 `aidata/assets/`。
- 保留根目錄 `index.html` 作為跨專案入口，不會覆蓋它。

## 5. 本機守門檢查

```bash
npm run update:check
```

此指令會檢查：

- 根目錄 `index.html` 仍是專案入口，`aidata/index.html` 仍是 AI Data 報告。
- `aidata/index.html` 與當期日期快照完全一致。
- 舊日期快照沒有被新版 meta 日期覆蓋。
- 公司 logo 相對資源在根目錄與 `/aidata/` 都存在且不是 0 bytes。
- 主要 HTML inline script 可解析。
- `tests/*.mjs` 全部通過。

`npm run release:check` 與 `npm run update:check` 目前等效；日常更新建議使用 `update:check`，正式推版文件或 CI 可保留 `release:check`。

## 6. Git 上版

```bash
git status --short
git add .
git commit -m "..."
git push origin main
```

推送後等待 GitHub Pages Actions 成功。

## 7. 線上驗收

```bash
npm run release:verify -- <commit>
```

此指令會抓取線上：

- `https://dinopeng.com/aidata/`
- `https://dinopeng.com/ai_industry_penetration_YYYY-MM-DD.html`
- `https://dinopeng.com/aidata/assets/company-logos/openai.ico`

並與本機檔案做 SHA-256 比對。

## Small Parties 更新流程

`small-parties/` 採用分離式本機更新：所有修改先只在本機版完成，只有使用者明確說「推 git」時才提交與推送。

### 本機更新

```bash
npm run small-parties:check
```

此指令會檢查：

- `small-parties/index.html` inline script 語法。
- favicon、社群縮圖、hero 圖、menu icon 與民眾黨 logo 是否存在。
- GA、GSAP、ScrollTrigger、ScrollToPlugin、社群縮圖 meta 與成本試算連動邏輯是否仍在頁面中。

### 推版後驗收

```bash
npm run small-parties:verify -- <commit>
```

此指令會抓取線上：

- `https://dinopeng.com/small-parties/`
- `https://dinopeng.com/small-parties/favicon.ico`
- `https://dinopeng.com/small-parties/assets/social-thumbnail.png`
- `https://dinopeng.com/small-parties/assets/menu-icon.png`

並與本機檔案做 SHA-256 比對，確認 GitHub Pages 已部署到正式站。

### 同步防呆

若使用 `scripts/sync-projects.sh` 彙整多個專案，它會先檢查 Small Parties 來源是否包含 GSAP、GA、社群縮圖等新版必要內容。來源若是舊版，腳本會中止，避免 `chore: sync project sites` 把正式站覆蓋回舊版。

## 最小安全流程

若只是修 UI 或文案，建議至少完成：

```bash
npm run release:prepare
npm run update:check
```

若改到資料、排行或來源，先完成 `DATA_UPDATE.md` 的來源確認，再執行上述指令。
