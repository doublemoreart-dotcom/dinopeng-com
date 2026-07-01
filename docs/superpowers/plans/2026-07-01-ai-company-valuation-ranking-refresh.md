# AI Company Valuation Ranking Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the prototype valuation ranking with a source-backed 2026-07-01 snapshot covering private AI companies and public AI/diversified technology companies.

**Architecture:** Keep `index.html` self-contained for `file://` use, but create a CSV audit artifact that records every value, date, source, and confidence tier. Embed the verified rows as `mainCompanyValuationData`, render both rankings from that array, and use static Node tests to enforce ranking, provenance, labels, and version consistency.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, CSV audit file, in-app browser verification.

---

### Task 1: Add Ranking and Provenance Contract Tests

**Files:**
- Modify: `tests/index_company_valuation_ranking_test.mjs`
- Test: `tests/index_company_valuation_ranking_test.mjs`

- [ ] **Step 1: Add a helper that extracts the embedded valuation array**

```js
import vm from 'node:vm';

const extractValuationData = html => {
  const match = html.match(/const mainCompanyValuationData = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'mainCompanyValuationData should be present');
  return vm.runInNewContext(match[1]);
};
```

- [ ] **Step 2: Add failing tests for the verified snapshot contract**

```js
test('valuation data contains two source-backed top tens', async () => {
  const html = await readFile(pagePath, 'utf8');
  const data = extractValuationData(html);
  const privateRows = data.filter(row => row.companyType === 'private');
  const publicRows = data.filter(row => row.companyType === 'public');

  assert.equal(privateRows.length, 10);
  assert.equal(publicRows.length, 10);
  assert.deepEqual(publicRows.slice(0, 4).map(row => row.companyName), [
    'NVIDIA', 'Microsoft', 'Apple', 'Alphabet',
  ]);
  for (const row of data) {
    assert.ok(row.sourceName);
    assert.match(row.sourceUrl, /^https:\/\//);
    assert.match(row.sourcePublishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(row.valueAsOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(['official', 'regulatory', 'tier_one_media'].includes(row.sourceTier));
    assert.ok(row.methodologyNote);
  }
});

test('public ranking uses total market cap and 30-day share-price change', async () => {
  const html = await readFile(pagePath, 'utf8');
  const data = extractValuationData(html);
  const publicRows = data.filter(row => row.companyType === 'public');

  assert.ok(publicRows.every(row => row.valueType === 'market_cap'));
  assert.ok(publicRows.every(row => Number.isFinite(row.priceChange30dPct)));
  assert.ok(publicRows.every(row => row.valueAsOf === '2026-06-30'));
  assert.match(html, /上市 AI 與多元科技公司 Top 10/);
  assert.match(html, /30 日股價變動/);
  assert.doesNotMatch(html, /UI 測試示意資料/);
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `node --test tests/index_company_valuation_ranking_test.mjs`

Expected: FAIL because the current data lacks source metadata, diversified technology companies, and verified-data labels.

- [ ] **Step 4: Commit the test contract**

```bash
git add tests/index_company_valuation_ranking_test.mjs
git commit -m "test: define verified valuation ranking contract"
```

### Task 2: Build the Source Audit Dataset

**Files:**
- Create: `data/ai_company_valuation_2026-07-01.csv`
- Modify: `DATA_UPDATE.md`

- [ ] **Step 1: Research the private-company candidate universe**

Check OpenAI, Anthropic, Databricks, Safe Superintelligence, Mistral AI, Perplexity, Cohere, Harvey, Scale AI, Anysphere, Figure AI, Glean, Thinking Machines Lab, Sierra, and xAI. Exclude companies that are no longer independent at the snapshot date and rows supported only by rumor or fundraising targets.

For each accepted row, record the latest confirmed post-money valuation and the previous comparable post-money valuation when available. Prefer company/investor announcements; otherwise use Reuters or Bloomberg.

- [ ] **Step 2: Research the public-company candidate universe**

Evaluate NVIDIA (`NVDA`), Microsoft (`MSFT`), Apple (`AAPL`), Alphabet (`GOOGL`), Amazon (`AMZN`), Meta (`META`), Broadcom (`AVGO`), TSMC (`TSM`), Tesla (`TSLA`), Oracle (`ORCL`), Palantir (`PLTR`), AMD (`AMD`), IBM (`IBM`), Salesforce (`CRM`), and Adobe (`ADBE`).

Use company-wide market capitalization at the 2026-06-30 close and the share-price change from the nearest valid close on or before 2026-05-31. Keep the ten highest market-cap companies after validation.

- [ ] **Step 3: Create the CSV audit artifact with this exact header**

```csv
company_name,company_type,ticker,value_usd,value_type,value_as_of,previous_value_usd,previous_value_as_of,price_change_30d_pct,change_period_label,business_tags,inclusion_rationale,source_name,source_url,source_published_at,source_tier,methodology_note
```

Rules:

- `company_type` is `private` or `public`.
- `value_type` is `post_money_valuation` or `market_cap`.
- Private rows use `previous_value_usd`; public rows use `price_change_30d_pct`.
- `business_tags` uses `|` as the internal separator.
- All dates use `YYYY-MM-DD`.
- The file contains exactly 20 data rows.

- [ ] **Step 4: Add maintenance rules to `DATA_UPDATE.md`**

Document the candidate universes, source priority, common public-market date, nearest-trading-day rule, exclusion of rumor values, and requirement to update the HTML note and public report pool with every refresh.

- [ ] **Step 5: Validate the CSV structure**

Run:

```bash
node -e "const fs=require('fs');const rows=fs.readFileSync('data/ai_company_valuation_2026-07-01.csv','utf8').trim().split(/\r?\n/);if(rows.length!==21)throw new Error('expected header plus 20 rows');console.log('rows',rows.length-1)"
```

Expected: `rows 20`.

- [ ] **Step 6: Commit the audit dataset**

```bash
git add data/ai_company_valuation_2026-07-01.csv DATA_UPDATE.md
git commit -m "data: verify 2026-07-01 AI valuation snapshot"
```

### Task 3: Replace Prototype Data and Calculations

**Files:**
- Modify: `index.html`
- Test: `tests/index_company_valuation_ranking_test.mjs`

- [ ] **Step 1: Replace `mainCompanyValuationData` with the 20 CSV-backed rows**

Use this field shape for every row:

```js
{
  companyName: 'Microsoft',
  companyType: 'public',
  ticker: 'MSFT',
  valueUsd: 0,
  valueType: 'market_cap',
  valueAsOf: '2026-06-30',
  previousValueUsd: null,
  previousValueAsOf: '2026-05-29',
  priceChange30dPct: 0,
  changePeriodLabel: '近 30 日股價',
  businessTags: ['多元科技平台', '企業 AI'],
  inclusionRationale: 'AI 是雲端、軟體與開發工具的重要成長引擎；排名值使用公司整體市值。',
  sourceName: 'Nasdaq / SEC / Microsoft Investor Relations',
  sourceUrl: 'https://www.nasdaq.com/market-activity/stocks/msft',
  sourcePublishedAt: '2026-06-30',
  sourceTier: 'regulatory',
  methodologyNote: '公司整體市值，不代表 Microsoft AI 業務的獨立估值。',
}
```

Replace the numeric zeroes with the values in the audited CSV. Private rows use the same shape but set `ticker` and `priceChange30dPct` to `null` and use `post_money_valuation`.

- [ ] **Step 2: Update change rendering by company type**

```js
const getMainChangePct = company => company.companyType === 'public'
  ? company.priceChange30dPct
  : Number.isFinite(company.previousValueUsd) && company.previousValueUsd > 0
    ? ((company.valueUsd - company.previousValueUsd) / company.previousValueUsd) * 100
    : null;
```

- [ ] **Step 3: Add source metadata to the company drawer**

Append these rows to `valuation-company-drawer-data`:

```js
`資料來源：<a href="${company.sourceUrl}" target="_blank" rel="noopener noreferrer">${company.sourceName}</a>`,
`來源日期：${company.sourcePublishedAt}`,
`可信度：${company.sourceTier === 'official' ? '官方公告' : company.sourceTier === 'regulatory' ? '監管／交易所資料' : '一級財經媒體'}`,
`口徑說明：${company.methodologyNote}`,
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test tests/index_company_valuation_ranking_test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the verified ranking logic**

```bash
git add index.html tests/index_company_valuation_ranking_test.mjs
git commit -m "feat: replace prototype valuation ranking data"
```

### Task 4: Update Labels, Sources, and Version Metadata

**Files:**
- Modify: `index.html`
- Test: `tests/index_company_valuation_ranking_test.mjs`

- [ ] **Step 1: Update the public ranking labels**

Use:

```html
<button ... data-valuation-tab="public" ...>上市 AI 與多元科技公司</button>
<h3 class="section-inline-note-title">上市 AI 與多元科技公司 Top 10</h3>
<th scope="col">30 日股價變動</th>
```

Explain directly below the heading that ranking values are total company market capitalization, not standalone AI business valuations.

- [ ] **Step 2: Replace prototype methodology language**

Replace the UI-test disclaimer with:

```html
本榜單為 2026-07-01 資料快照，不構成投資建議。私人公司估值與上市公司整體市值採不同定價機制，因此分榜呈現；跨公司比較前請確認基準日與來源口徑。
```

- [ ] **Step 3: Update metadata and visible dates**

```html
<meta name="page-version-date" content="2026-07-01">
<meta name="page-version-number" content="v2026.07.01-1">
```

Update the valuation data note to show `2026-07-01` as the research date and `2026-06-30` as the common public-market date.

- [ ] **Step 4: Synchronize the public report pool**

Keep the `公司估值 / 市場市值` card and replace its links with the exact official, regulatory, exchange, Reuters, and Bloomberg sources used by the 20 accepted rows. Describe the nearest-trading-day rule and the distinction between total market cap and AI business value.

- [ ] **Step 5: Extend tests for labels and version metadata**

```js
assert.match(html, /page-version-date" content="2026-07-01"/);
assert.match(html, /page-version-number" content="v2026\.07\.01-1"/);
assert.match(html, /公司整體市值，不代表個別 AI 業務估值/);
assert.match(html, /2026-06-30/);
```

- [ ] **Step 6: Run all Node tests**

Run: `node --test tests/*.mjs`

Expected: all tests pass.

- [ ] **Step 7: Commit the presentation update**

```bash
git add index.html tests/index_company_valuation_ranking_test.mjs
git commit -m "content: disclose valuation ranking sources and scope"
```

### Task 5: Create the Dated HTML Version

**Files:**
- Create: `ai_industry_penetration_2026-07-01.html`
- Modify: `README.md`

- [ ] **Step 1: Copy the verified latest page**

Run: `cp index.html ai_industry_penetration_2026-07-01.html`

- [ ] **Step 2: Update the version history in `README.md`**

Add `ai_industry_penetration_2026-07-01.html` as the latest preserved snapshot and note that it contains the verified company valuation refresh.

- [ ] **Step 3: Verify the dated file matches the latest page**

Run: `cmp index.html ai_industry_penetration_2026-07-01.html`

Expected: exit code 0 with no output.

- [ ] **Step 4: Commit the dated version**

```bash
git add ai_industry_penetration_2026-07-01.html README.md
git commit -m "release: add 2026-07-01 AI industry snapshot"
```

### Task 6: Final Data and Browser Verification

**Files:**
- Verify: `index.html`
- Verify: `ai_industry_penetration_2026-07-01.html`
- Verify: `data/ai_company_valuation_2026-07-01.csv`

- [ ] **Step 1: Run full static verification**

```bash
node --test tests/*.mjs
sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' | node --check
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Reconcile the highest-impact values**

Independently compare the top three private valuations and top three public market caps against their saved source URLs and dates. Confirm the embedded values match the CSV exactly.

- [ ] **Step 3: Verify desktop rendering**

Serve the directory locally, open `index.html`, and confirm both tabs, top-three cards, tables, source links, methodology text, and drawer metadata render without console errors or horizontal overflow.

- [ ] **Step 4: Verify mobile rendering**

At `390x844`, confirm the ranking cards, table scroll/column behavior, long company names, source links, and drawer text remain readable in both Light and Dark Mode.

- [ ] **Step 5: Record the confidence assessment**

Use one of these final statuses:

- `Ready to share`: all 20 rows have Tier 1–3 traceable sources and the top-six spot checks reconcile.
- `Share with caveats`: ranking is directionally usable but one or more rows rely on a secondary source or non-common private valuation date.
- `Needs revision`: any top-three value or common public-market date cannot be reconciled.
