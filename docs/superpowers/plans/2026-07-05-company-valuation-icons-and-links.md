# AI 公司估值排行榜圖示與連結樣式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 補齊估值排行榜 20 家公司的本機品牌圖示，修正圖示與文字對齊，並統一詳情抽屜來源連結樣式。

**Architecture:** 保持單檔 HTML 架構；品牌圖示存放在既有 `assets/company-logos/`，由 `mainCompanyLogoFiles` 映射。CSS 只調整排行榜卡片、表格與估值詳情抽屜，不改其他分析區塊。

**Tech Stack:** HTML、CSS、Vanilla JavaScript、Node.js `node:test`、本機靜態資產。

---

## File Structure

- Modify: `index.html`：公司圖示映射、圖示對齊與抽屜連結樣式。
- Modify: `ai_industry_penetration_2026-07-01.html`：同步目前日期版本。
- Modify: `tests/index_company_valuation_ranking_test.mjs`：加入 20 家圖示完整性與 CSS 契約測試。
- Create/replace: `assets/company-logos/*`：20 家公司的官方網站圖示資產。

### Task 1: 建立圖示與樣式回歸測試

**Files:**
- Modify: `tests/index_company_valuation_ranking_test.mjs`
- Test: `tests/index_company_valuation_ranking_test.mjs`

- [ ] **Step 1: 新增公司圖示映射解析器**

```js
const extractLogoMap = html => {
  const match = html.match(/const mainCompanyLogoFiles = (\{[\s\S]*?\n\});/);
  assert.ok(match, 'mainCompanyLogoFiles should be present');
  return vm.runInNewContext(`(${match[1]})`);
};
```

- [ ] **Step 2: 新增 20 家圖示完整性測試**

```js
test('every ranked company has an existing local logo asset', async () => {
  const html = await readFile(pagePath, 'utf8');
  const companies = extractValuationData(html).map(row => row.companyName);
  const logos = extractLogoMap(html);

  assert.equal(companies.length, 20);
  for (const company of companies) {
    assert.ok(logos[company], `${company} should have a logo mapping`);
    assert.equal(existsSync(new URL(logos[company], rootPath)), true, `${company} logo should exist`);
  }
});
```

- [ ] **Step 3: 新增對齊與連結色測試**

```js
test('valuation logos align with labels and drawer links use site colors', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /\.valuation-row-button\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*gap:\s*9px;/);
  assert.match(html, /\.valuation-logo-row\s*\{[^}]*margin-right:\s*0;/);
  assert.match(html, /\.valuation-company-drawer-heading\s*\{[^}]*align-items:\s*center;/);
  assert.match(html, /\.valuation-company-detail-drawer \.drawer-list a\s*\{[^}]*color:\s*var\(--page-text\);[^}]*text-underline-offset:\s*3px;/);
  assert.match(html, /\.valuation-company-detail-drawer \.drawer-list a:hover,[\s\S]*?color:\s*#378ADD;/);
});
```

- [ ] **Step 4: 執行測試並確認 RED**

Run: `node --test tests/index_company_valuation_ranking_test.mjs`

Expected: FAIL，指出缺少公司圖示映射及抽屜連結樣式。

### Task 2: 補齊官方公司圖示

**Files:**
- Create/replace: `assets/company-logos/openai.*`
- Create/replace: `assets/company-logos/anthropic.*`
- Create/replace: `assets/company-logos/databricks.*`
- Create: `assets/company-logos/figure-ai.*`
- Create/replace: `assets/company-logos/ssi.*`
- Create: `assets/company-logos/anysphere.*`
- Create/replace: `assets/company-logos/perplexity.*`
- Create: `assets/company-logos/helsing.*`
- Create/replace: `assets/company-logos/mistral-ai.*`
- Create: `assets/company-logos/thinking-machines.*`
- Create/replace: `assets/company-logos/nvidia.*`
- Create: `assets/company-logos/alphabet.*`
- Create: `assets/company-logos/apple.*`
- Create: `assets/company-logos/microsoft.*`
- Create: `assets/company-logos/amazon.*`
- Create: `assets/company-logos/tsmc.*`
- Create/replace: `assets/company-logos/broadcom.*`
- Create: `assets/company-logos/tesla.*`
- Create: `assets/company-logos/meta.*`
- Create: `assets/company-logos/oracle.*`
- Modify: `index.html`

- [ ] **Step 1: 從 20 家公司官方網站取得 favicon 或品牌圖示**

逐一檢查官方首頁的 `<link rel="icon">`，下載可直接由瀏覽器顯示的 PNG、ICO 或 SVG。若官方網站提供多尺寸，優先使用 96px 以上的方形資產。

- [ ] **Step 2: 驗證資產格式與尺寸**

Run: `file assets/company-logos/*`

Expected: 新增檔案均被辨識為 PNG、ICO 或 SVG；不可是 HTML 錯誤頁。

- [ ] **Step 3: 更新完整圖示映射**

```js
const mainCompanyLogoFiles = {
  'OpenAI': 'assets/company-logos/openai.ico',
  'Anthropic': 'assets/company-logos/anthropic.ico',
  'Databricks': 'assets/company-logos/databricks.ico',
  'Figure AI': 'assets/company-logos/figure-ai.ico',
  'Safe Superintelligence': 'assets/company-logos/ssi.ico',
  'Anysphere': 'assets/company-logos/anysphere.ico',
  'Perplexity': 'assets/company-logos/perplexity.ico',
  'Helsing': 'assets/company-logos/helsing.ico',
  'Mistral AI': 'assets/company-logos/mistral-ai.ico',
  'Thinking Machines Lab': 'assets/company-logos/thinking-machines.ico',
  'NVIDIA': 'assets/company-logos/nvidia.ico',
  'Alphabet': 'assets/company-logos/alphabet.ico',
  'Apple': 'assets/company-logos/apple.ico',
  'Microsoft': 'assets/company-logos/microsoft.ico',
  'Amazon': 'assets/company-logos/amazon.ico',
  'TSMC': 'assets/company-logos/tsmc.ico',
  'Broadcom': 'assets/company-logos/broadcom.ico',
  'Tesla': 'assets/company-logos/tesla.ico',
  'Meta': 'assets/company-logos/meta.ico',
  'Oracle': 'assets/company-logos/oracle.ico'
};
```

實際副檔名依官方資產格式調整，映射必須與下載檔案一致。

- [ ] **Step 4: 執行圖示完整性測試**

Run: `node --test tests/index_company_valuation_ranking_test.mjs`

Expected: 圖示完整性測試 PASS；CSS 樣式測試仍 FAIL。

### Task 3: 修正對齊與詳情 Link Color

**Files:**
- Modify: `index.html`
- Test: `tests/index_company_valuation_ranking_test.mjs`

- [ ] **Step 1: 統一表格圖示與文字排列**

```css
.valuation-row-button {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.valuation-logo-row {
  width: 30px;
  height: 30px;
  margin-right: 0;
}
```

- [ ] **Step 2: 穩定卡片與抽屜圖示對齊**

```css
.valuation-logo {
  flex: 0 0 auto;
  vertical-align: middle;
}
.valuation-company-drawer-heading {
  align-items: center;
}
```

- [ ] **Step 3: 統一抽屜來源連結樣式**

```css
.valuation-company-detail-drawer .drawer-list a {
  color: var(--page-text);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.valuation-company-detail-drawer .drawer-list a:hover,
.valuation-company-detail-drawer .drawer-list a:focus-visible {
  color: #378ADD;
}
```

- [ ] **Step 4: 執行聚焦測試並確認 GREEN**

Run: `node --test tests/index_company_valuation_ranking_test.mjs`

Expected: 全部 PASS。

### Task 4: 同步版本並完成視覺驗收

**Files:**
- Modify: `ai_industry_penetration_2026-07-01.html`
- Verify: `index.html`
- Verify: `tests/*.mjs`

- [ ] **Step 1: 同步目前日期版本**

Run: `cp index.html ai_industry_penetration_2026-07-01.html`

- [ ] **Step 2: 執行完整測試**

Run: `node --test tests/*.mjs`

Expected: 0 failures。

- [ ] **Step 3: 驗證兩個 HTML 完全一致**

Run: `cmp -s index.html ai_industry_penetration_2026-07-01.html`

Expected: exit code 0。

- [ ] **Step 4: 瀏覽器驗收**

使用本機 HTTP 預覽檢查：

- 私人榜 10 家與上市榜 10 家均顯示圖示。
- 卡片、表格與詳情抽屜圖示垂直置中。
- 抽屜來源連結在 Light／Dark Mode 使用全站連結色。
- 390px 手機與桌機寬度沒有水平溢出。
- Browser console 無 error 或 warning。

- [ ] **Step 5: 檢查差異品質**

Run: `git diff --check`

Expected: 無輸出。
