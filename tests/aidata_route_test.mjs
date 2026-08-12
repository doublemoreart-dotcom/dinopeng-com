import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalPagePath = new URL('../index.html', import.meta.url);
const noJekyllPath = new URL('../.nojekyll', import.meta.url);
const aidataPagePath = new URL('../aidata/index.html', import.meta.url);
const aidataRootPath = new URL('../aidata/', import.meta.url);
const sporttechPagePath = new URL('../sporttech/index.html', import.meta.url);
const sporttechRootPath = new URL('../sporttech/', import.meta.url);
const directoryPagePath = new URL('../48DIRECTORY/index.html', import.meta.url);
const directoryRootPath = new URL('../48DIRECTORY/', import.meta.url);
const smallPartiesPagePath = new URL('../small-parties/index.html', import.meta.url);
const smallPartiesRootPath = new URL('../small-parties/', import.meta.url);
const taiwanFoodSafetyPagePath = new URL('../taiwan-food-safety/index.html', import.meta.url);
const taiwanFoodSafetyRootPath = new URL('../taiwan-food-safety/', import.meta.url);
const maePagePath = new URL('../mae/index.html', import.meta.url);
const maeRootPath = new URL('../mae/', import.meta.url);
const ccpStabilitySpendingPagePath = new URL('../ccp-stability-spending/index.html', import.meta.url);
const ccpStabilitySpendingRootPath = new URL('../ccp-stability-spending/', import.meta.url);
const tpTreesPagePath = new URL('../tptrees/index.html', import.meta.url);
const tpTreesLifecyclePath = new URL('../tptrees/lifecycle/index.html', import.meta.url);
const tpTreesSpeciesPath = new URL('../tptrees/species/index.html', import.meta.url);
const tpTreesDailyPath = new URL('../tptrees/daily/index.html', import.meta.url);
const tpTreesRecordsPath = new URL('../tptrees/data/tree-records.js', import.meta.url);
const tpTreesManifestPath = new URL('../tptrees/data/tree-data-manifest.json', import.meta.url);
const tpTreesReleaseManifestPath = new URL('../tptrees/data/site-release-manifest.json', import.meta.url);
const tpTreesFaviconPath = new URL('../tptrees/favicon.svg', import.meta.url);
const tpTreesRootPath = new URL('../tptrees/', import.meta.url);
const readmePath = new URL('../README.md', import.meta.url);
const updateGuidePath = new URL('../DATA_UPDATE.md', import.meta.url);
const syncProjectsPath = new URL('../scripts/sync-projects.sh', import.meta.url);

test('root publishes a project portal while /aidata/ keeps the AI report', async () => {
  const [portalPage, aidataPage] = await Promise.all([
    readFile(portalPagePath, 'utf8'),
    readFile(aidataPagePath, 'utf8'),
  ]);

  assert.match(portalPage, /Dino Peng｜Learning My New Life/);
  assert.match(portalPage, /https:\/\/dinopeng\.com\/tptrees\//);
  assert.match(portalPage, /https:\/\/dinopeng\.com\/aidata\//);
  assert.match(portalPage, /https:\/\/dinopeng\.com\/sporttech\//);
  assert.match(portalPage, /https:\/\/dinopeng\.com\/48DIRECTORY\//);
  assert.match(portalPage, /https:\/\/dinopeng\.com\/small-parties\//);
  assert.match(portalPage, /https:\/\/dinopeng\.com\/taiwan-food-safety\//);
  assert.match(
    portalPage,
    /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-RLCNPY896C/,
  );
  assert.match(portalPage, /gtag\("config", "G-RLCNPY896C"\)/);
  assert.match(aidataPage, /AI 對產業的數據觀察/);
  assert.notEqual(aidataPage, portalPage);
});

test('taiwan-food-safety route publishes its static page and local assets', async () => {
  const html = await readFile(taiwanFoodSafetyPagePath, 'utf8');
  assert.equal(existsSync(noJekyllPath), true, '.nojekyll should publish the generated _next directory');
  assert.match(html, /<title>台灣食安管理流程與權責分工<\/title>/);
  assert.match(html, /id="overview"/);
  assert.match(html, /id="roles"/);
  assert.match(html, /id="incident"/);
  assert.match(html, /id="check"/);

  const paths = [...html.matchAll(/(?:src|href)="\/taiwan-food-safety\/([^"?]+)(?:\?[^"]*)?"/g)]
    .map(match => match[1]);
  assert.ok(paths.length >= 5, `expected Taiwan Food Safety local asset references, got ${paths.length}`);
  for (const path of new Set(paths)) {
    assert.equal(existsSync(new URL(path, taiwanFoodSafetyRootPath)), true, `${path} should load below /taiwan-food-safety/`);
  }

  for (const path of ['favicon.ico', 'opengraph-image.png', 'twitter-image.png']) {
    assert.equal(existsSync(new URL(path, taiwanFoodSafetyRootPath)), true, `${path} should load below /taiwan-food-safety/`);
  }
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

test('mae route publishes its standalone page and local assets', async () => {
  const html = await readFile(maePagePath, 'utf8');
  assert.match(html, /<title>天使牌卡庫｜純本機版<\/title>/);
  assert.match(html, /id="drawButton"/);
  assert.match(html, /id="cardGrid"/);

  const paths = [...html.matchAll(/["']((?:\.\/)?assets\/[^"']+)["']/g)].map(match => match[1]);
  assert.ok(paths.length >= 2, `expected MAE local asset references, got ${paths.length}`);
  for (const path of new Set(paths)) {
    assert.equal(existsSync(new URL(path, maeRootPath)), true, `${path} should load below /mae/`);
  }
});

test('ccp-stability-spending route publishes the complete static site', async () => {
  const html = await readFile(ccpStabilitySpendingPagePath, 'utf8');
  assert.match(html, /<title>中共如何使用維穩費？｜成本、財政與權力運作<\/title>/);
  assert.match(html, /id="definition"/);
  assert.match(html, /id="cost"/);
  assert.match(html, /id="funding"/);
  assert.match(html, /id="system"/);

  for (const path of [
    'styles.css',
    'script.js',
    'assets/fonts/SNPro-Variable.ttf',
    'assets/images/hero-main.webp',
    'assets/images/scenario-core.jpg',
    'assets/vendor/gsap.min.js',
    'public/favicon.ico',
    'public/social-share.png',
  ]) {
    assert.equal(existsSync(new URL(path, ccpStabilitySpendingRootPath)), true, `${path} should load below /ccp-stability-spending/`);
  }
});

test('GA4 tracking is installed once on AI Data and not on the project portal', async () => {
  const [portalPage, aidataPage] = await Promise.all([
    readFile(portalPagePath, 'utf8'),
    readFile(aidataPagePath, 'utf8'),
  ]);
  const measurementId = 'G-BGHM581VD4';

  assert.equal((aidataPage.match(/googletagmanager\.com\/gtag\/js\?id=G-BGHM581VD4/g) || []).length, 1);
  assert.equal((aidataPage.match(/gtag\('config', 'G-BGHM581VD4'\)/g) || []).length, 1);
  assert.match(aidataPage, /window\.dataLayer = window\.dataLayer \|\| \[\]/);
  assert.doesNotMatch(portalPage, new RegExp(measurementId));
});

test('sporttech route publishes its static page and local assets', async () => {
  const html = await readFile(sporttechPagePath, 'utf8');
  assert.match(html, /運動X科技預算(?:查詢)?小幫手/);

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
  assert.equal(existsSync(tpTreesReleaseManifestPath), true, 'site-release-manifest.json should load below /tptrees/');
  assert.equal(existsSync(tpTreesFaviconPath), true, 'favicon.svg should load below /tptrees/');

  for (const path of [
    'favicon.ico',
    'app/analytics.js',
    'app/heroicons.js',
    'app/motion.css',
    'app/motion.js',
    'app/vendor/gsap.min.js',
    'app/vendor/ScrollTrigger.min.js',
    'public/social-preview.png',
  ]) {
    assert.equal(existsSync(new URL(path, tpTreesRootPath)), true, `${path} should load below /tptrees/`);
  }
});

test('portal sync keeps every TP Trees runtime asset', async () => {
  const syncScript = await readFile(syncProjectsPath, 'utf8');
  for (const rule of [
    '--include "/favicon.ico"',
    '--include "/app/***"',
    '--include "/public/***"',
  ]) {
    assert.match(syncScript, new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(syncScript, /site-release-manifest\.json/);
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

test('public report pool uses the latest checked primary-source baseline', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const versionDate = html.match(/<meta name="page-version-date" content="([^"]+)">/)?.[1];
  const sourceCheckedDate = html.match(/<meta name="source-checked-date" content="([^"]+)">/)?.[1];
  const requiredSources = [
    'https://hai.stanford.edu/ai-index/2026-ai-index-report',
    'https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html',
    'https://www.oecd.org/en/about/news/announcements/2026/01/ai-use-by-individuals-surges-across-the-oecd-as-adoption-by-firms-continues-to-expand.html',
    'https://blogs.microsoft.com/on-the-issues/2026/05/07/the-state-of-global-ai-diffusion-in-2026/',
    'https://www.anthropic.com/research/economic-index-june-2026-report',
    'https://www.pwc.com/gx/en/issues/analytics/assets/pwc-ai-analysis-sizing-the-prize-report.pdf',
  ];

  assert.equal(sourceCheckedDate, versionDate);
  assert.match(html, new RegExp(`<time data-source-checked-date datetime="${versionDate}">${versionDate}<\\/time>`));
  assert.match(html, /2017 年發布，2030 年估計/);
  for (const source of requiredSources) {
    assert.match(html, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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

test('hero visual theme rules crossfade light and dark images in one stable grid', async () => {
  const html = await readFile(aidataPagePath, 'utf8');

  assert.match(html, /\.hero-visual \{[^}]*display: grid;/);
  assert.match(html, /\.hero-visual img \{[^}]*display: block;/);
  assert.match(html, /\.hero-visual img \{[^}]*grid-area: 1 \/ 1;/);
  assert.match(html, /\.hero-visual \.hero-visual-image-dark \{ opacity: 0; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.hero-visual \.hero-visual-image-light \{ opacity: 0; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.hero-visual \.hero-visual-image-dark \{ opacity: 1; \}/);
});

test('industry adoption visual theme rules crossfade without changing layout', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/industry-adoption-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/industry-adoption-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="industry-adoption"[\s\S]*class="section-visual"/);
  assert.match(html, /\.section-visual \{[^}]*display: grid;/);
  assert.match(html, /\.section-visual img \{[^}]*display: block;/);
  assert.match(html, /\.section-visual img \{[^}]*grid-area: 1 \/ 1;/);
  assert.match(html, /\.section-visual \.section-visual-image-dark \{ opacity: 0; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.section-visual \.section-visual-image-light \{ opacity: 0; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.section-visual \.section-visual-image-dark \{ opacity: 1; \}/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('only the page hero remains visible while section visuals are retained as hidden assets', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const hiddenSectionVisuals = html.match(/<figure class="section-visual"[^>]*\shidden>/g) || [];

  assert.equal(hiddenSectionVisuals.length, 7);
  assert.match(html, /<figure class="hero-visual"/);
  assert.doesNotMatch(html, /<figure class="hero-visual"[^>]*\shidden>/);
  assert.match(html, /\.section-visual\[hidden\] \{ display: none !important; \}/);
  assert.match(html, /\.analysis-section \+ \.analysis-section::before \{[^}]*transform: scaleX\(var\(--section-divider-progress\)\);/);
  assert.match(html, /:scope > \.section-visual:not\(\[hidden\]\)/);
});

test('aidata motion enhancement is optional and respects reduced motion', async () => {
  const html = await readFile(aidataPagePath, 'utf8');

  assert.match(html, /gsap\/3\.13\.0\/gsap\.min\.js/);
  assert.match(html, /gsap\/3\.13\.0\/ScrollTrigger\.min\.js/);
  assert.match(html, /const canUseMotion = \(\) => Boolean\(window\.gsap && window\.ScrollTrigger/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /initPageMotion\(\);/);
  assert.match(html, /openDrawerWithMotion/);
  assert.match(html, /const setActiveSectionTab/);
  assert.match(html, /\.section-tab\[aria-current="location"\]/);
  assert.match(html, /'--section-progress': '100%'/);
  assert.match(html, /const cardRevealSelector/);
  assert.match(html, /sectionBlocks\.forEach\(block =>/);
  assert.match(html, /trigger: block,[\s\S]*start: 'top 94%',[\s\S]*scrub: 0\.35,[\s\S]*once: true/);
  assert.match(html, /'--section-divider-progress': 1/);
});

test('talent and influence cards open a shared accessible detail drawer', async () => {
  const html = await readFile(aidataPagePath, 'utf8');
  const talentButtons = html.match(/<button class="talent-card"[^>]*data-capability-group="talent"/g) || [];
  const influenceButtons = html.match(/<button class="influence-card"[^>]*data-capability-group="influence"/g) || [];

  assert.equal(talentButtons.length, 4);
  assert.equal(influenceButtons.length, 4);
  assert.match(html, /id="capability-detail-drawer"[^>]*aria-hidden="true"[^>]*aria-labelledby="capability-drawer-title"/);
  assert.match(html, /const capabilityDetailData = \{/);
  assert.match(html, /const openCapabilityDetail = item =>/);
  assert.match(html, /document\.querySelectorAll\('\[data-capability-group\]'\)/);
  assert.match(html, /renderDrawerList\(capabilitySituationList, item\.situations\)/);
  assert.match(html, /renderDrawerList\(capabilityWatchList, item\.watch\)/);
  assert.equal((html.match(/class="impact-detail-drawer[^"]*"[^>]*role="dialog"[^>]*aria-modal="true"/g) || []).length, 5);
  assert.match(html, /event\.key === 'Tab' && openDrawer/);
});

test('responsive navigation and valuation table remain usable at large text sizes', async () => {
  const html = await readFile(aidataPagePath, 'utf8');

  assert.match(html, /\.section-tabs \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/);
  assert.match(html, /\.section-tab \{[^}]*flex: 0 0 auto;[^}]*white-space: nowrap;/);
  assert.match(html, /@media \(max-width: 480px\)[\s\S]*?\.valuation-table th:nth-child\(4\), \.valuation-table td:nth-child\(4\) \{ display: none; \}/);
  assert.match(html, /class="control-group" role="group" aria-label="主題模式"/);
  assert.match(html, /class="control-group" role="group" aria-label="字級大小"/);
});

test('influence radar values expand from an empty default state on hover or focus', async () => {
  const html = await readFile(aidataPagePath, 'utf8');

  assert.match(html, /\.radar-static-area \{[^}]*fill-opacity: 0;[^}]*transform: scale\(0\);/);
  assert.match(html, /\.radar-static-point \{[^}]*opacity: 0;/);
  assert.match(html, /\.influence-card:hover \.radar-static-area,[\s\S]*\.influence-card:focus-visible \.radar-static-area \{[^}]*fill-opacity: 0\.18;[^}]*transform: scale\(1\);/);
  assert.match(html, /\.influence-card:hover \.radar-static-point,[\s\S]*\.influence-card:focus-visible \.radar-static-point \{[^}]*opacity: 1;/);
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
