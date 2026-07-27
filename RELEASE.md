# Release Flow

本專案維持單檔 HTML 架構；上版時讓人工負責內容判斷，腳本負責守住同步、日期快照與線上檔案一致性。

## 1. 推版前來源確認

每次推版前先做 `DATA_UPDATE.md` 定義的低強度來源確認：

- 檢查 3-5 個核心來源是否有新版本、新年份或新口徑。
- 必查 AI 公司估值排行榜的私人公司估值、上市公司市值基準日、30 日股價區間、來源連結與資料整理時間。
- 若發現會影響 KPI、圖表或 tooltip 的新數字，改為中強度更新。

## 2. 準備本機發布檔

```bash
npm run release:prepare
```

此指令會：

- 將 `index.html` 同步到 `aidata/index.html`。
- 依 `index.html` 的 `page-version-date` 建立或更新 `ai_industry_penetration_YYYY-MM-DD.html`。
- 將 `assets/` 同步到 `aidata/assets/`。

## 3. 本機守門檢查

```bash
npm run release:check
```

此指令會檢查：

- `index.html`、`aidata/index.html`、當期日期快照完全一致。
- 舊日期快照沒有被新版 meta 日期覆蓋。
- 公司 logo 相對資源在根目錄與 `/aidata/` 都存在且不是 0 bytes。
- 主要 HTML inline script 可解析。
- `tests/*.mjs` 全部通過。

## 4. Git 上版

```bash
git status --short
git add .
git commit -m "..."
git push origin main
```

推送後等待 GitHub Pages Actions 成功。

## 5. 線上驗收

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
