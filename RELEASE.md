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
