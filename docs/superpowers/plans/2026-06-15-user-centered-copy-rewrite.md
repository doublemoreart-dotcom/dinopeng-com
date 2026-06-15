# User-Centered Copy Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the complete reader-facing copy in `index.html` so every section explains its value, interaction, and interpretation from the reader's perspective without exposing implementation or maintenance language.

**Architecture:** Keep the existing single-file HTML, data, visual hierarchy, and JavaScript behavior unchanged. Add a focused static copy test that extracts reader-facing text, rejects internal implementation terms, and asserts the required interaction guidance and interpretation language remain present.

**Tech Stack:** Static HTML, vanilla JavaScript, Node.js built-in test runner and file APIs.

---

## File Structure

- Modify: `index.html` — reader-facing headings, descriptions, guidance, source explanations, footer, fallback and Email backup copy.
- Create: `tests/user_centered_copy_test.mjs` — static regression tests for forbidden internal language and required reader guidance.
- Modify: `docs/superpowers/specs/2026-06-15-user-centered-copy-rewrite-design.md` only if implementation exposes a contradiction; otherwise leave unchanged.

### Task 1: Add Reader-Copy Regression Tests

**Files:**
- Create: `tests/user_centered_copy_test.mjs`

- [ ] **Step 1: Write the failing internal-language test**

Create a Node test that reads `index.html`, removes `<style>` and `<script>` contents, and checks visible HTML for internal implementation language:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const readerHtml = html
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

test('reader-facing copy excludes implementation and maintenance language', () => {
  const forbidden = [
    '新增 CSV',
    'tooltip',
    'KPI 抽屜',
    '請先將程式中的 reportEmail',
    '本區把新增',
  ];

  for (const phrase of forbidden) {
    assert.equal(readerHtml.includes(phrase), false, `unexpected reader-facing phrase: ${phrase}`);
  }
});
```

- [ ] **Step 2: Write the failing reader-guidance test**

Append assertions covering all interactive analysis surfaces:

```js
test('interactive sections explain how readers can use them', () => {
  const required = [
    '下拉選單',
    '將游標移至長條',
    '點擊卡片',
    '右上角',
    '泡泡大小',
    '星級代表影響深度',
    '雷達圖代表五項能力的相對需求',
    '引用與比較提醒',
  ];

  for (const phrase of required) {
    assert.equal(readerHtml.includes(phrase), true, `missing reader guidance: ${phrase}`);
  }
});
```

- [ ] **Step 3: Write the source-safety test**

Append checks preserving important qualifiers:

```js
test('copy preserves estimation and methodology qualifiers', () => {
  for (const phrase of ['2025 年分析估計', '不直接混用', '2030 年估計', '使用率不等於規模化部署']) {
    assert.equal(readerHtml.includes(phrase), true, `missing qualifier: ${phrase}`);
  }
});
```

- [ ] **Step 4: Run tests and verify they fail before rewriting**

Run:

```bash
node --test tests/user_centered_copy_test.mjs
```

Expected: FAIL because existing visible copy includes `新增 CSV`, `tooltip`, `KPI 抽屜`, and the maintenance-only Email instruction, while several required reader-guidance phrases are absent.

- [ ] **Step 5: Commit the test baseline**

```bash
git add tests/user_centered_copy_test.mjs
git commit -m "test: define user-centered copy requirements"
```

### Task 2: Rewrite Overview and Analytical Chart Guidance

**Files:**
- Modify: `index.html:1010-1170`
- Test: `tests/user_centered_copy_test.mjs`

- [ ] **Step 1: Rewrite the chart fallback as an actionable reader message**

Replace the Chart.js implementation wording with:

```html
<div class="chart-fallback" data-chart-fallback role="status">
  部分互動圖表暫時無法顯示。文字分析、關鍵指標、產業長條圖與互動卡片仍可正常閱讀；請確認網路連線後重新整理頁面，即可再次載入泡泡圖與採用階段圖表。
</div>
```

- [ ] **Step 2: Rewrite the weekly update around reader value**

Use copy that leads with what changed and what it means:

```html
<div class="update-note-title">本週值得注意的變化</div>
<div class="update-note-body">
  本週主要觀察企業 AI 使用已快速普及，但跨部門規模化仍明顯落後。以下數據可用來區分「開始使用」、「進入實驗」與「完成流程整合」，並從產業、人才與治理三個角度理解落差。
</div>
```

Rewrite the source-pool list item as:

```html
<li>延伸閱讀：OECD、Microsoft、WEF、Deloitte、BCG、EY、Wharton 與 Anthropic 可分別補充企業採用、全球擴散、投資回報、人才任務與治理條件；尚未確認調查口徑的數字不納入本頁比較。</li>
```

Rewrite the final list item to emphasize use:

```html
<li>產業滲透率、投資規模、生產力與採用階段仍屬分析估計，適合比較相對位置，不宜視為單一企業的實際成果。</li>
```

- [ ] **Step 3: Rewrite industry adoption guidance**

Replace its description with:

```html
<p class="section-description">用來比較不同產業的 AI 導入強度。可透過下拉選單依滲透率或市場規模重新排序；將游標移至長條，可查看各產業的導入原因、估計基礎與市場規模指數。數字為 2025 年分析估計，OECD 與 Microsoft 資料只用於理解擴散背景，不直接混用。</p>
```

- [ ] **Step 4: Strengthen bubble-chart operation and interpretation copy**

Replace the opening description with:

```html
<p class="section-description">用 X 軸比較 AI 投資強度、Y 軸比較生產力提升潛力，泡泡大小則代表市場規模。可先觀察右上角與大泡泡，找出同時具備投入、改善空間與市場放大效果的產業。</p>
```

Retain the existing detailed interpretation and qualifiers.

- [ ] **Step 5: Make impact-card interaction explicit**

Replace its description with:

```html
<p class="section-description">比較各產業常見的效益方向與導入限制。點擊卡片可查看典型應用、影響如何發生、衡量指標、落地風險與下一步觀察；卡片數字用於辨識改善方向，不代表所有企業都能取得相同成果。</p>
```

- [ ] **Step 6: Clarify adoption-depth reading**

Replace its description with:

```html
<p class="section-description">比較各產業「用得多」與「用得深」的差異。深度整合表示 AI 已進入核心工作流，局部試行表示仍集中在特定團隊，探索評估則代表價值、風險與責任邊界仍在驗證。</p>
```

- [ ] **Step 7: Run the focused tests**

Run:

```bash
node --test tests/user_centered_copy_test.mjs
```

Expected: internal-language test may still FAIL on the source pool and Email backup, while chart guidance assertions now pass.

- [ ] **Step 8: Commit the analysis copy rewrite**

```bash
git add index.html tests/user_centered_copy_test.mjs
git commit -m "content: rewrite chart guidance for readers"
```

### Task 3: Rewrite Clusters, Talent, and Capability Guidance

**Files:**
- Modify: `index.html:1170-1350`
- Test: `tests/user_centered_copy_test.mjs`

- [ ] **Step 1: Rewrite industry-cluster guidance**

Use:

```html
<p class="section-description">用滲透速度、影響潛力與導入阻力辨識四類產業。點擊卡片可查看代表性應用、衡量指標、主要限制與後續觀察，協助判斷不同產業應優先追求效率、治理或基礎能力建設。</p>
```

- [ ] **Step 2: Rewrite the talent definition introduction**

Use:

```html
<p class="section-description">從設計、產品、工程與行銷四種能力，理解工作價值如何從單一產出轉向問題定義、系統整合、商業判斷與品質治理。每張卡片呈現角色在 AI 工作流中的能力轉移。</p>
```

Keep the existing core definition and ability-card body copy.

- [ ] **Step 3: Explain stars and radar charts**

Use:

```html
<p class="section-description">星級代表影響深度，雷達圖代表五項能力的相對需求。可比較不同層級在問題定義、系統整合、內容營運、技術原型與品質治理上的能力組合；圖形用於理解職能方向，不是個人能力評分。</p>
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
node --test tests/user_centered_copy_test.mjs
```

Expected: interaction guidance for cards, stars and radar charts passes; source and fallback maintenance language may still fail.

- [ ] **Step 5: Commit the talent copy rewrite**

```bash
git add index.html tests/user_centered_copy_test.mjs
git commit -m "content: clarify cluster and talent interpretation"
```

### Task 4: Rewrite Source, Footer, and Backup Messages

**Files:**
- Modify: `index.html:1350-1510`
- Test: `tests/user_centered_copy_test.mjs`

- [ ] **Step 1: Replace the source-pool introduction**

Use:

```html
<p class="section-description">依分析用途整理公開報告，協助判斷哪些來源適合回答企業採用、全球擴散、投資回報、人才變化或治理問題。展開各分類可查看建議用途與原始報告；不同年份、樣本與定義的數字不直接混用。</p>
```

- [ ] **Step 2: Rewrite each source category around reader use**

Replace category body copy with the following messages:

```html
<div class="source-pool-body">用 McKinsey 與 Stanford 確認企業採用趨勢，用 PwC 理解長期經濟影響，再以 Deloitte 比較企業準備度與實際效益落差。</div>
<div class="source-pool-body">OECD 適合理解企業採用條件與生產力關係，Microsoft 適合觀察全球使用擴散與數位落差；兩者不直接替代本頁產業估計。</div>
<div class="source-pool-body">BCG、EY 與 Wharton 適合評估投資回報、資料條件、決策權與流程制度化，幫助辨識為何高投入不一定帶來高效益。</div>
<div class="source-pool-body">WEF 與 Anthropic 適合觀察 AI 如何改變任務、流程、技能組合與品質治理，避免只以職稱是否被替代來理解人才影響。</div>
<div class="source-pool-body">WEF、OECD 與 KPMG 適合比較公共部門、低數位化產業與高風險產業的治理條件，補足只談效率時容易忽略的責任與信任問題。</div>
```

- [ ] **Step 3: Replace maintenance rules with reader-facing comparison guidance**

Use:

```html
<span class="source-pool-kicker">引用提醒</span>
<span class="source-pool-title">引用與比較提醒</span>
...
<div class="source-pool-body">引用數字前，請確認年份、樣本、調查對象、定義與統計口徑。無法確認的資料只適合作為趨勢背景，不應與本頁 KPI、產業估計或其他調查直接混算。</div>
```

- [ ] **Step 4: Rewrite the error-report explanation**

Use:

```html
<div class="footer-report-copy">
  若發現數據來源、圖表顯示、文字內容或操作體驗有誤，可透過 Google Form 提供問題位置與修正建議，協助後續核對與改善。若表單無法開啟，也可寄信至 <a href="mailto:doublemore.art@gmail.com">doublemore.art@gmail.com</a>。
</div>
```

- [ ] **Step 5: Remove maintenance-only Email fallback text**

Replace the recipient note with a reader-action message:

```html
<div class="report-recipient-note" data-report-recipient-note>目前無法建立 Email 草稿，請直接寄信至 doublemore.art@gmail.com。</div>
```

- [ ] **Step 6: Run all copy tests**

Run:

```bash
node --test tests/user_centered_copy_test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit source and footer copy**

```bash
git add index.html tests/user_centered_copy_test.mjs
git commit -m "content: rewrite sources and support copy for readers"
```

### Task 5: Complete Full-Page Verification

**Files:**
- Verify: `index.html`
- Verify: `tests/user_centered_copy_test.mjs`

- [ ] **Step 1: Scan visible HTML for remaining internal language**

Run:

```bash
rg -n "新增 CSV|tooltip|KPI 抽屜|程式中的|程式變數|元件|本區把新增" index.html
```

Expected: no reader-facing matches. CSS class names and JavaScript identifiers are allowed only when the command is narrowed and manually confirmed not to be visible copy.

- [ ] **Step 2: Check JavaScript syntax**

Run:

```bash
node --check <(sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d')
```

Expected: exit code 0 with no output.

- [ ] **Step 3: Run all project tests**

Run:

```bash
node --test tests/*.mjs
```

Expected: all tests pass.

- [ ] **Step 4: Verify the rendered page at desktop width**

Open `index.html` through a local HTTP server, then verify:

- The weekly update leads with reader relevance rather than maintenance work.
- Adoption copy explains sorting and hover behavior.
- Bubble and stage charts explain how to read them.
- Impact and cluster cards explain click behavior.
- Talent copy explains stars and radar charts.
- Source pool uses reader-facing source purposes.
- Footer and fallback text provide clear reader actions.

Expected: no layout shift, overlap, clipped controls, or broken interaction.

- [ ] **Step 5: Verify a mobile viewport**

Use a viewport near `390x844` and confirm rewritten paragraphs wrap without overflowing cards, controls or the sticky navigation.

Expected: no horizontal overflow or overlapping text.

- [ ] **Step 6: Review the final diff for data integrity**

Run:

```bash
git diff --word-diff=plain HEAD~3 -- index.html
```

Expected: only reader-facing text changed; KPI values, chart arrays, source URLs, IDs, classes and JavaScript behavior remain unchanged.

- [ ] **Step 7: Commit verification fixes if required**

```bash
git add index.html tests/user_centered_copy_test.mjs
git commit -m "test: verify user-centered analysis copy"
```

