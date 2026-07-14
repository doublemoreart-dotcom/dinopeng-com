# Project Guide: AI 產業滲透率與混合型人才影響分析頁

## 專案定位

本專案是一個單頁資料視覺化分析頁，用於說明「AI 對各大產業的滲透率與實際影響」，並延伸分析「AI 時代混合型人才」如何重組職能、流程、組織與商業模式。

目前主要實作檔案：

- `ai_industry_penetration.html`
- `ai_industry_penetration_YYYY-MM-DD.html`
- `index.html`（dinopeng.com 專案入口）
- `aidata/index.html`（AI Data 正式入口）
- `DATA_UPDATE.md`
- `WEB_SPEC.md`

頁面應可用於：

- 產業觀察文章
- 社群圖卡或簡報延伸
- 顧問提案
- Blog / Medium 文章嵌入
- 企業內部 AI 導入討論

## 核心觀點

請維持以下敘事主軸：

> AI 不是只替代單一職位，而是改變整個職能系統。

> 混合型人才不是什麼都會的人，而是能用 AI 重新編排產品、工程、設計、行銷與商業流程的人。

> AI 讓產出能力民主化，但讓判斷能力、系統整合能力與品質治理能力變得更稀缺。

## 內容架構

頁面應以 Dashboard / Analysis Page 的形式呈現，包含以下區塊。

### 1. Overview / KPI

主題：

「AI 對各大產業的滲透率與實際影響」

建議副標：

「從產業採用率、投資強度、生產力提升，到混合型人才如何重組設計價值鏈。」

KPI 卡片建議：

- 全球企業 AI 採用率：78%，2024 年組織使用率，來源可標註 Stanford AI Index 2025
- AI 對全球經濟潛在貢獻：US$15.7 兆，2030 年估計，來源可標註 PwC

若使用現有 HTML 中的 72% 採用率，需在畫面或文件中註明其估計口徑，避免和 78% 指標混淆。

### 2. 各產業 AI 滲透率

以水平長條圖呈現，依百分比排序。

參考資料模型：

```js
const industryAdoption = [
  { industry: "科技軟體", adoptionRate: 85, group: "technology_finance" },
  { industry: "金融服務", adoptionRate: 80, group: "technology_finance" },
  { industry: "醫療健康", adoptionRate: 72, group: "health_manufacturing" },
  { industry: "製造業", adoptionRate: 68, group: "health_manufacturing" },
  { industry: "零售電商", adoptionRate: 65, group: "retail_logistics" },
  { industry: "物流運輸", adoptionRate: 58, group: "retail_logistics" },
  { industry: "教育", adoptionRate: 50, group: "education_legal" },
  { industry: "法律服務", adoptionRate: 42, group: "education_legal" }
];
```

分類顏色：

```js
const groupColors = {
  technology_finance: "blue",
  health_manufacturing: "green",
  retail_logistics: "orange",
  education_legal: "pink"
};
```

### 3. AI 投資強度 vs. 生產力提升潛力

以 Bubble Scatter Chart 呈現。

- X 軸：AI 投資強度
- Y 軸：生產力提升潛力
- 泡泡大小：市場規模
- 泡泡顏色：產業群組
- 泡泡應能辨識產業名稱，至少需在 tooltip 中顯示

### 4. 產業分群解讀

保留四類分析：

- 高滲透、高影響：科技軟體、金融服務、行銷內容、客服銷售
- 高滲透、低確定性：內容、設計、媒體、教育
- 中滲透、高潛力：醫療、製造、物流、能源、農業
- 低滲透、高阻力：公共部門、傳統中小企業、低數位化產業

每個分群需要說明：

- 為什麼 AI 會以該速度滲透
- 對工作流的實際影響
- 主要阻力或治理議題

### 5. 混合型人才定義

核心定義：

> 能用 AI 連接多個職能，並把問題、資料、內容、介面、流程與商業目標重新組裝成可執行方案的人。

能力模組：

- 設計能力：從做畫面、流程、體驗，轉向定義問題、設計系統、判斷品質
- 產品能力：從寫需求、排優先級，轉向把 AI 產出轉成產品決策
- 工程能力：從實作功能、串 API，轉向理解技術可行性並用 AI 生成原型
- 行銷能力：從包裝賣點、溝通受眾，轉向把產品價值轉成內容、轉換與成長策略

### 6. 混合型人才影響範圍地圖

分為三層：

- 核心影響區：設計交付、使用者研究摘要、內容營運、原型製作、設計系統應用
- 次核心影響區：PM 工作、前端工程、行銷成長、品牌管理、客戶提案、設計管理、新人培訓
- 外圍影響區：接案市場、設計教育、組織招募、設計工具市場、創業門檻、產業競爭、專業認同

關鍵結論：

> AI 時代的混合型人才，不是跨領域工作者，而是跨職能系統的重新編排者。

## 視覺與互動要求

- 以資料分析頁為主，不做行銷 landing page。
- 圖表與卡片必須服務於分析敘事，不應只做裝飾。
- 優先保留清楚的標籤、數值、tooltip、圖例與可掃讀資訊層級。
- 現有 HTML 使用 Chart.js CDN；若維持單檔 HTML，避免引入複雜建置流程。
- 需要支援深色與淺色環境時，確認 CSS 變數與 fallback 顏色可讀。
- 若新增資料來源文字，放在頁尾或每個區塊旁的小字註記，避免干擾主圖表。
- 每個週更 HTML 都必須符合 `WEB_SPEC.md`：適度留白、Light / Dark Mode、三種字級與 RWD。

## 實作規範

- 主要檔案保持為單檔 HTML，除非使用者要求改成框架專案。
- `https://dinopeng.com/` 為跨專案入口，`https://dinopeng.com/aidata/` 為 AI Data 正式網址；更新 AI Data 時只同步日期版本至 `aidata/index.html` 與 `aidata/assets/`，不要覆蓋根目錄入口。
- 每次本機端更新任何項目時，無論是資料、UI、文案、樣式或資源，都必須檢查 `AI 公司估值排行榜` 是否仍為最新可追溯數據；若有新的公司公告、投資方公告、一線媒體報導或上市公司市值基準日，需同步更新頁面、資料整理時間、來源連結與公開報告來源池。
- 週更時必須建立新日期檔，格式為 `ai_industry_penetration_YYYY-MM-DD.html`。
- 第一次週更以 `ai_industry_penetration.html` 作為範本；後續週更以最近一期日期版本作為範本。
- 不要覆蓋或回改舊日期版本，除非使用者明確要求修正歷史檔案。
- 修改現有資料時，同步更新圖表、tooltip、文字敘事與 README。
- 數據屬於分析估計或外部報告引用時，必須標註年份與來源名稱。
- 避免只有百分比而沒有口徑說明。
- 保持繁體中文文案。
- 不要把「混合型人才」寫成單純多技能者；重點是跨職能系統編排與品質治理。
- 若當週沒有可信新數據，仍可建立週更檔，但必須在頁面或更新紀錄標註「本週沿用上一期主要量化數據，更新趨勢觀察」。
- 週更資料來源、檢查清單與驗收標準以 `DATA_UPDATE.md` 為準。
- 週更網頁閱讀性、留白、主題切換、字級切換與 RWD 以 `WEB_SPEC.md` 為準。

## 驗收標準

- 開啟 `ai_industry_penetration.html` 時，長條圖、泡泡圖、階段分佈圖都能正常渲染。
- 讀者能在 30 秒內理解哪些產業 AI 滲透最高、哪些產業潛力最大。
- 頁面能清楚回答「AI 如何影響產業」與「混合型人才影響範圍在哪裡」。
- 圖表數值、卡片數值與文件說明沒有互相矛盾。
- 日期版本檔名符合 `ai_industry_penetration_YYYY-MM-DD.html`，且舊版本未被覆蓋。
- 日期版本符合 `WEB_SPEC.md` 的閱讀性與 RWD 規範。
- Markdown 文件能讓下一位 coding agent 直接理解專案目標、內容架構與維護規則。
