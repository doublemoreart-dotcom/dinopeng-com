import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalPagePath = new URL('../index.html', import.meta.url);
const aidataPagePath = new URL('../aidata/index.html', import.meta.url);
const aidataRootPath = new URL('../aidata/', import.meta.url);
const sporttechPagePath = new URL('../sporttech/index.html', import.meta.url);
const sporttechRootPath = new URL('../sporttech/', import.meta.url);
const directoryPagePath = new URL('../48DIRECTORY/index.html', import.meta.url);
const directoryRootPath = new URL('../48DIRECTORY/', import.meta.url);
const smallPartiesPagePath = new URL('../small-parties/index.html', import.meta.url);
const smallPartiesRootPath = new URL('../small-parties/', import.meta.url);
const tpTreesPagePath = new URL('../tptrees/index.html', import.meta.url);
const tpTreesLifecyclePath = new URL('../tptrees/lifecycle/index.html', import.meta.url);
const tpTreesSpeciesPath = new URL('../tptrees/species/index.html', import.meta.url);
const tpTreesDailyPath = new URL('../tptrees/daily/index.html', import.meta.url);
const tpTreesRecordsPath = new URL('../tptrees/data/tree-records.js', import.meta.url);
const tpTreesManifestPath = new URL('../tptrees/data/tree-data-manifest.json', import.meta.url);
const tpTreesFaviconPath = new URL('../tptrees/favicon.svg', import.meta.url);
const readmePath = new URL('../README.md', import.meta.url);
const updateGuidePath = new URL('../DATA_UPDATE.md', import.meta.url);

test('root publishes a project portal while /aidata/ keeps the AI report', async () => {
  const [portalPage, aidataPage] = await Promise.all([
    readFile(portalPagePath, 'utf8'),
    readFile(aidataPagePath, 'utf8'),
  ]);

  assert.match(portalPage, /Dino Peng — Projects/);
  assert.match(portalPage, /href="\/tptrees\/"/);
  assert.match(portalPage, /href="\/aidata\/"/);
  assert.match(portalPage, /href="\/sporttech\/"/);
  assert.match(portalPage, /href="\/48DIRECTORY\/"/);
  assert.match(portalPage, /href="\/small-parties\/"/);
  assert.match(aidataPage, /AI 對產業的數據觀察/);
  assert.notEqual(aidataPage, portalPage);
});

test('small-parties route publishes its static page and local assets', async () => {
  const html = await readFile(smallPartiesPagePath, 'utf8');
  assert.match(html, /<title>為什麼小黨可以攪動社群言論？<\/title>/);
  assert.match(html, /id="process"/);
  assert.match(html, /id="algorithm"/);
  assert.match(html, /id="check"/);

  for (const path of ['favicon.ico', 'favicon.svg', 'assets/hero-social-discourse.png']) {
    assert.equal(existsSync(new URL(path, smallPartiesRootPath)), true, `${path} should load below /small-parties/`);
  }
});

test('sporttech route publishes its static page and local assets', async () => {
  const html = await readFile(sporttechPagePath, 'utf8');
  assert.match(html, /2022-2026 運動X科技預算查詢小幫手/);

  const paths = [...html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map(match => match[1]);
  assert.ok(paths.length >= 3, `expected SportTech local asset references, got ${paths.length}`);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, sporttechRootPath)), true, `${path} should load below /sporttech/`);
  }
});

test('48DIRECTORY route publishes its static page and local assets', async () => {
  const html = await readFile(directoryPagePath, 'utf8');
  assert.match(html, /<title>48 DIRECTORY \(Beta\)<\/title>/);
  assert.match(html, /id="members"/);
  assert.match(html, /id="ranking"/);

  const paths = [...html.matchAll(/["']((?:\.\/)?assets\/[^"']+)["']/g)].map(match => match[1]);
  assert.ok(paths.length >= 100, `expected 48 DIRECTORY local asset references, got ${paths.length}`);
  for (const path of new Set(paths)) {
    assert.equal(existsSync(new URL(path, directoryRootPath)), true, `${path} should load below /48DIRECTORY/`);
  }
});

test('tptrees route publishes every public page and data dependency', async () => {
  const [home, lifecycle, species, daily] = await Promise.all([
    readFile(tpTreesPagePath, 'utf8'),
    readFile(tpTreesLifecyclePath, 'utf8'),
    readFile(tpTreesSpeciesPath, 'utf8'),
    readFile(tpTreesDailyPath, 'utf8'),
  ]);

  assert.match(home, /臺北市行道樹小幫手/);
  assert.match(lifecycle, /樹木的生命履歷/);
  assert.match(species, /樹種科普/);
  assert.match(daily, /今天給我一棵樹/);
  assert.equal(existsSync(tpTreesRecordsPath), true, 'tree-records.js should load below /tptrees/');
  assert.equal(existsSync(tpTreesManifestPath), true, 'tree-data-manifest.json should load below /tptrees/');
  assert.equal(existsSync(tpTreesFaviconPath), true, 'favicon.svg should load below /tptrees/');
});

test('aidata route includes every relative company logo asset used by the page', async () => {
  assert.equal(existsSync(aidataPagePath), true, 'aidata/index.html should exist');
  const html = await readFile(aidataPagePath, 'utf8');
  const paths = [...html.matchAll(/'([^']*assets\/company-logos\/[^']+)'/g)].map(match => match[1]);

  assert.ok(paths.length >= 7, `expected at least 7 logo paths, got ${paths.length}`);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, aidataRootPath)), true, `${path} should load below /aidata/`);
  }
});

test('aidata route includes the hero visual asset used by the page', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const paths = [...html.matchAll(/src="(assets\/(?:ai-industry-data-observation|industry-adoption|investment-productivity|industry-impact|adoption-stages|industry-clusters|hybrid-talent|hybrid-influence)-hero(?:-dark)?\.svg)"/g)].map(match => match[1]);

  assert.deepEqual(paths.sort(), [
    'assets/adoption-stages-hero-dark.svg',
    'assets/adoption-stages-hero.svg',
    'assets/ai-industry-data-observation-hero-dark.svg',
    'assets/ai-industry-data-observation-hero.svg',
    'assets/hybrid-influence-hero-dark.svg',
    'assets/hybrid-influence-hero.svg',
    'assets/hybrid-talent-hero-dark.svg',
    'assets/hybrid-talent-hero.svg',
    'assets/industry-adoption-hero-dark.svg',
    'assets/industry-adoption-hero.svg',
    'assets/industry-clusters-hero-dark.svg',
    'assets/industry-clusters-hero.svg',
    'assets/industry-impact-hero-dark.svg',
    'assets/industry-impact-hero.svg',
    'assets/investment-productivity-hero-dark.svg',
    'assets/investment-productivity-hero.svg',
  ]);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, new URL('../', import.meta.url))), true, `${path} should exist below root`);
    assert.equal(existsSync(new URL(path, aidataRootPath)), true, `${path} should load below /aidata/`);
  }
});

test('hero visual theme rules override the generic image display rule', async () => {
  const html = await readFile(aidataPagePath, 'utf8');

  assert.match(html, /\.hero-visual img \{[^}]*display: block;/);
  assert.match(html, /\.hero-visual \.hero-visual-image-dark \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.hero-visual \.hero-visual-image-light \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.hero-visual \.hero-visual-image-dark \{ display: block; \}/);
});

test('industry adoption visual theme rules override the generic image display rule', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/industry-adoption-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/industry-adoption-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="industry-adoption"[\s\S]*class="section-visual"/);
  assert.match(html, /\.section-visual img \{[^}]*display: block;/);
  assert.match(html, /\.section-visual \.section-visual-image-dark \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.section-visual \.section-visual-image-light \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.section-visual \.section-visual-image-dark \{ display: block; \}/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('investment productivity visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/investment-productivity-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/investment-productivity-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="investment-productivity"[\s\S]*src="assets\/investment-productivity-hero\.svg"/);
  assert.match(html, /id="investment-productivity"[\s\S]*src="assets\/investment-productivity-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('industry impact visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/industry-impact-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/industry-impact-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="industry-impact"[\s\S]*src="assets\/industry-impact-hero\.svg"/);
  assert.match(html, /id="industry-impact"[\s\S]*src="assets\/industry-impact-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('adoption stages visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/adoption-stages-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/adoption-stages-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="adoption-stages"[\s\S]*src="assets\/adoption-stages-hero\.svg"/);
  assert.match(html, /id="adoption-stages"[\s\S]*src="assets\/adoption-stages-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('industry clusters visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/industry-clusters-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/industry-clusters-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="industry-clusters"[\s\S]*src="assets\/industry-clusters-hero\.svg"/);
  assert.match(html, /id="industry-clusters"[\s\S]*src="assets\/industry-clusters-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('hybrid talent visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/hybrid-talent-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/hybrid-talent-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="hybrid-talent"[\s\S]*src="assets\/hybrid-talent-hero\.svg"/);
  assert.match(html, /id="hybrid-talent"[\s\S]*src="assets\/hybrid-talent-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('hybrid influence visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/hybrid-influence-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/hybrid-influence-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="hybrid-influence"[\s\S]*src="assets\/hybrid-influence-hero\.svg"/);
  assert.match(html, /id="hybrid-influence"[\s\S]*src="assets\/hybrid-influence-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('project docs identify the portal and /aidata/ as separate public entries', async () => {
  const [readme, updateGuide] = await Promise.all([
    readFile(readmePath, 'utf8'),
    readFile(updateGuidePath, 'utf8'),
  ]);

  assert.match(readme, /https:\/\/dinopeng\.com\//);
  assert.match(readme, /https:\/\/dinopeng\.com\/aidata\//);
  assert.match(updateGuide, /aidata\/index\.html/);
  assert.doesNotMatch(updateGuide, /aidata\/index\.html.*index\.html.*完全同步/);
});
