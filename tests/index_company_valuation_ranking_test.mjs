import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const pagePath = new URL('../index.html', import.meta.url);
const rootPath = new URL('../', import.meta.url);

const extractValuationData = html => {
  const match = html.match(/const mainCompanyValuationData = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'mainCompanyValuationData should be present');
  return vm.runInNewContext(match[1]);
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

  assert.ok(paths.length >= 17, `expected at least 17 logo paths, got ${paths.length}`);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, rootPath)), true, `${path} should exist`);
  }
  assert.match(html, /if \(!logoFile\) return fallback;/);
});

test('valuation section discloses update timing and mirrors sources in the public report pool', async () => {
  const html = await readFile(pagePath, 'utf8');
  const sourceUrls = [
    'https://openai.com/index/march-funding-updates/',
    'https://www.anthropic.com/news/anthropic-raises-series-e-at-usd61-5b-post-money-valuation',
    'https://www.prnewswire.com/news-releases/databricks-is-raising-10b-series-j-investment-at-62b-valuation-302333822.html',
    'https://www.sec.gov/search-filings',
    'https://www.nasdaq.com/market-activity/stocks',
  ];

  assert.match(html, /class="valuation-data-note"/);
  assert.match(html, /資料整理時間：<time datetime="2026-06-15">2026-06-15<\/time>/);
  assert.match(html, /上市公司市值基準日：<time datetime="2026-06-12">2026-06-12<\/time>/);
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
    assert.ok(['official', 'regulatory', 'tier_one_media'].includes(row.sourceTier), `${row.companyName} sourceTier`);
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
