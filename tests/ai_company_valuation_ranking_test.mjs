import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagePath = new URL('../ai_company_valuation_ranking_test.html', import.meta.url);

test('standalone valuation ranking page exposes the approved UI contract', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /<title>AI 公司估值排行榜｜本機測試頁<\/title>/);
  assert.match(html, /class="reader-controls"/);
  assert.match(html, /data-ranking-tab="private"/);
  assert.match(html, /data-ranking-tab="public"/);
  assert.match(html, /id="private-ranking"/);
  assert.match(html, /id="public-ranking"/);
  assert.match(html, /data-top-three="private"/);
  assert.match(html, /data-top-three="public"/);
  assert.match(html, /data-ranking-list="private"/);
  assert.match(html, /data-ranking-list="public"/);
  assert.match(html, /id="company-detail-drawer"/);
  assert.match(html, /const companyValuationData = \[/);
  assert.match(html, /const validateCompany =/);
  assert.match(html, /const formatUsd =/);
  assert.match(html, /const formatChange =/);
  assert.match(html, /const getRankedCompanies =/);
  assert.match(html, /const renderRanking =/);
  assert.match(html, /const openCompanyDrawer =/);
  assert.match(html, /UI 測試示意資料/);
});

test('page includes responsive and accessibility hooks', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /@media \(max-width: 720px\)/);
  assert.match(html, /@media \(max-width: 420px\)/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-expanded/);
  assert.match(html, /keydown/);
  assert.match(html, /Escape/);
  assert.match(html, /prefers-reduced-motion/);
});

test('ranking switcher uses standard tabs on every viewport', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /class="ranking-tabs" role="tablist"/);
  assert.match(html, /data-ranking-tab="private" role="tab"[^>]+aria-selected="true"[^>]+tabindex="0"/);
  assert.match(html, /data-ranking-tab="public" role="tab"[^>]+aria-selected="false"[^>]+tabindex="-1"/);
  assert.match(html, /data-ranking-panel="private" role="tabpanel"/);
  assert.match(html, /data-ranking-panel="public" role="tabpanel"[^>]+hidden/);
  assert.match(html, /button\.setAttribute\('aria-selected'/);
  assert.match(html, /button\.tabIndex =/);
  assert.match(html, /panel\.hidden =/);
  assert.match(html, /ArrowLeft/);
  assert.match(html, /ArrowRight/);
  assert.match(html, /Home/);
  assert.match(html, /End/);
});

test('intro copy spans the content width and uses Traditional Chinese justification', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /\.lead \{[^}]*width: 100%;[^}]*text-align: justify;[^}]*text-align-last: left;[^}]*text-justify: inter-ideograph;/s);
  assert.doesNotMatch(html, /\.lead \{[^}]*max-width:/s);
});

test('page explains valuation sources, formulas, and comparison rules', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /<details class="valuation-methodology" id="valuation-methodology">/);
  assert.match(html, /<summary class="methodology-summary">/);
  assert.match(html, /點擊展開完整資料來源、估值口徑與計算公式/);
  assert.doesNotMatch(html, /<details class="valuation-methodology" id="valuation-methodology" open>/);
  assert.match(html, /估值來源與計算方式/);
  assert.match(html, /公司或投資方官方公告/);
  assert.match(html, /\(最新一輪投後估值 − 前一輪可比估值\) ÷ 前一輪可比估值 × 100%/);
  assert.match(html, /收盤股價 × 流通在外股數/);
  assert.match(html, /\(基準日市值 − 30 日前可比市值\) ÷ 30 日前可比市值 × 100%/);
  assert.match(html, /統一換算為美元/);
  assert.match(html, /私人公司與上市公司分榜排序/);
  assert.match(html, /\.methodology-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s);
  assert.match(html, /@media \(max-width: 720px\) \{[^}]*\.methodology-grid \{ grid-template-columns: 1fr; \}/s);
  assert.match(html, /\.valuation-methodology\[open\] \.methodology-summary-icon \{ transform: rotate\(180deg\); \}/);
});

test('company logos render in cards, tables, and the detail drawer with fallback initials', async () => {
  const html = await readFile(pagePath, 'utf8');

  assert.match(html, /const companyLogoFiles = \{/);
  assert.match(html, /const createCompanyLogoMarkup =/);
  assert.match(html, /class="company-logo company-logo-card"/);
  assert.match(html, /class="company-logo company-logo-row"/);
  assert.match(html, /id="drawer-company-logo"/);
  assert.match(html, /onerror="this\.hidden=true"/);
  assert.match(html, /assets\/company-logos\/openai\.ico/);
  assert.match(html, /assets\/company-logos\/nvidia\.ico/);
  assert.match(html, /\.company-logo-fallback/);
  assert.match(html, /if \(!logoFile\) return fallback;/);
});
