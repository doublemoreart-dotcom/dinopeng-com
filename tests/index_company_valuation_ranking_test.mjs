import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const pagePath = new URL('../aidata/index.html', import.meta.url);
const rootPath = new URL('../aidata/', import.meta.url);

const extractValuationData = html => {
  const match = html.match(/const mainCompanyValuationData = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'mainCompanyValuationData should be present');
  return vm.runInNewContext(match[1]);
};

const extractLogoMap = html => {
  const match = html.match(/const mainCompanyLogoFiles\s*=\s*(\{[\s\S]*?\})\s*;\s*const mainCompanyValuationData\b/);
  assert.ok(match, 'mainCompanyLogoFiles should be present');
  return vm.runInNewContext(`(${match[1]})`);
};

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractCssDeclarationBlock = (html, selectors) => {
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
  const selectorGroup = (Array.isArray(selectors) ? selectors : [selectors])
    .map(selector => escapeRegExp(selector).replace(/\s+/g, '\\s+'))
    .join('\\s*,\\s*');
  const match = styleBlocks.match(new RegExp(`(?:^|})\\s*${selectorGroup}\\s*\\{([^{}]*)\\}`, 'm'));

  assert.ok(match, `missing CSS rule: ${(Array.isArray(selectors) ? selectors : [selectors]).join(', ')}`);
  return match[1];
};

const assertCssDeclaration = (block, property, expected) => {
  const declarations = new Map(block.split(';').map(declaration => {
    const colon = declaration.indexOf(':');
    return colon < 0
      ? ['', '']
      : [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
  }));

  assert.equal(declarations.get(property), expected, `${property} should be ${expected}`);
};

test('main page includes the AI company valuation ranking section', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /href="#ai-company-valuation-title">AI 公司估值排行榜/);
  assert.match(html, /<section class="analysis-section valuation-ranking-section" id="ai-company-valuation"/);
  assert.match(html, /id="ai-company-valuation-title"/);
  assert.match(html, /class="valuation-ranking-tabs" role="tablist"/);
  assert.match(html, /data-valuation-tab="private" role="tab"/);
  assert.match(html, /data-valuation-tab="public" role="tab"/);
  assert.match(html, /data-valuation-panel="private" role="tabpanel"/);
  assert.match(html, /data-valuation-panel="public" role="tabpanel"/);
  assert.match(html, /data-valuation-top-three="private"/);
  assert.match(html, /data-valuation-list="public"/);
  assert.match(html, /id="valuation-company-detail-drawer"/);
  assert.match(html, /const mainCompanyLogoFiles = \{/);
  assert.match(html, /const mainCompanyValuationData = \[/);
  assert.match(html, /const renderValuationRanking =/);
  assert.match(html, /const applyValuationTab =/);
  assert.match(html, /估值來源與計算方式/);
});

test('main page valuation ranking references existing local logo assets', async () => {
  const html = await readFile(pagePath, 'utf8');
  const paths = [...html.matchAll(/'([^']*assets\/company-logos\/[^']+)'/g)].map(match => match[1]);

  assert.ok(paths.length >= 7, `expected at least 7 logo paths, got ${paths.length}`);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, rootPath)), true, `${path} should exist`);
  }
  assert.match(html, /if \(!logoFile\) return fallback;/);
});

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

test('valuation row buttons use inline flex alignment with the intended gap', async () => {
  const html = await readFile(pagePath, 'utf8');
  const block = extractCssDeclarationBlock(html, '.valuation-row-button');

  assertCssDeclaration(block, 'display', 'inline-flex');
  assertCssDeclaration(block, 'align-items', 'center');
  assertCssDeclaration(block, 'gap', '9px');
});

test('valuation row logos do not add spacing outside the button gap', async () => {
  const html = await readFile(pagePath, 'utf8');
  const block = extractCssDeclarationBlock(html, '.valuation-logo-row');

  assertCssDeclaration(block, 'margin-right', '0');
});

test('valuation drawer headings vertically align the logo and label', async () => {
  const html = await readFile(pagePath, 'utf8');
  const block = extractCssDeclarationBlock(html, '.valuation-company-drawer-heading');

  assertCssDeclaration(block, 'align-items', 'center');
});

test('valuation drawer links use the page text color and underline spacing', async () => {
  const html = await readFile(pagePath, 'utf8');
  const block = extractCssDeclarationBlock(html, '.valuation-company-detail-drawer .drawer-list a');

  assertCssDeclaration(block, 'color', 'var(--page-text)');
  assertCssDeclaration(block, 'text-underline-offset', '3px');
});

test('valuation drawer link hover and focus-visible states share the site accent rule', async () => {
  const html = await readFile(pagePath, 'utf8');
  const block = extractCssDeclarationBlock(html, [
    '.valuation-company-detail-drawer .drawer-list a:hover',
    '.valuation-company-detail-drawer .drawer-list a:focus-visible',
  ]);

  assertCssDeclaration(block, 'color', '#378ADD');
});

test('valuation section discloses update timing and mirrors sources in the public report pool', async () => {
  const html = await readFile(pagePath, 'utf8');
  const sourceUrls = [
    'https://openai.com/index/accelerating-the-next-phase-ai/',
    'https://apnews.com/article/anthropic-ai-claude-openai-valuation-86c432fa375548fd4f111f8164d6ffc1',
    'https://www.prnewswire.com/news-releases/databricks-grows-65-yoy-surpasses-5-4-billion-revenue-run-rate-doubles-down-on-lakebase-and-genie-302682674.html',
    'https://www.figure.ai/news/series-c',
    'https://www.nasdaq.com/market-activity/stocks',
  ];

  assert.match(html, /class="valuation-data-note"/);
  assert.match(html, /資料整理時間：<time datetime="2026-07-13">2026-07-13<\/time>/);
  assert.match(html, /上市公司市值仍沿用 <time datetime="2026-06-30">2026-06-30<\/time> Nasdaq 基準日/);
  assert.match(html, /data-valuation-source-card/);
  assert.match(html, /公司估值 \/ 市場市值/);
  assert.match(html, /募資估值與公開市場比較/);

  for (const url of sourceUrls) {
    const occurrences = html.split(`href="${url}"`).length - 1;
    assert.ok(occurrences >= 2, `${url} should appear in the valuation note and source pool`);
  }
});

test('valuation data contains two sorted source-backed top tens', async () => {
  const html = await readFile(pagePath, 'utf8');
  const data = extractValuationData(html);
  const privateRows = data.filter(row => row.companyType === 'private');
  const publicRows = data.filter(row => row.companyType === 'public');

  assert.equal(privateRows.length, 10);
  assert.equal(publicRows.length, 10);
  assert.equal(privateRows[0].companyName, 'Anthropic');
  assert.equal(privateRows[0].valueUsd, 965e9);
  assert.equal(privateRows[0].previousValueUsd, 380e9);
  assert.equal(privateRows[0].sourceTier, 'tier_one_media');
  for (const requiredName of ['NVIDIA', 'Microsoft', 'Apple', 'Alphabet', 'Amazon', 'Meta']) {
    assert.ok(publicRows.some(row => row.companyName === requiredName), `${requiredName} should be included`);
  }
  for (const rows of [privateRows, publicRows]) {
    const sortedValues = rows.map(row => row.valueUsd).sort((a, b) => b - a);
    assert.deepEqual(rows.map(row => row.valueUsd), sortedValues);
  }
  for (const row of data) {
    assert.ok(row.sourceName, `${row.companyName} sourceName`);
    assert.match(row.sourceUrl, /^https:\/\//, `${row.companyName} sourceUrl`);
    assert.match(row.sourcePublishedAt, /^\d{4}-\d{2}-\d{2}$/, `${row.companyName} sourcePublishedAt`);
    assert.match(row.valueAsOf, /^\d{4}-\d{2}-\d{2}$/, `${row.companyName} valueAsOf`);
    assert.ok(['official', 'regulatory', 'tier_one_media', 'exchange'].includes(row.sourceTier), `${row.companyName} sourceTier`);
    assert.ok(row.methodologyNote, `${row.companyName} methodologyNote`);
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

test('mobile sticky section navigation stays in one horizontally scrollable row', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /@media \(max-width: 720px\)[\s\S]*?\.section-tabs \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;/);
  assert.match(html, /@media \(max-width: 720px\)[\s\S]*?\.section-tab \{[^}]*flex: 0 0 auto;[^}]*white-space: nowrap;/);
  assert.doesNotMatch(html, /@media \(max-width: 480px\)[\s\S]*?\.section-tab \{\s*flex-basis: 100%;\s*\}/);
});
