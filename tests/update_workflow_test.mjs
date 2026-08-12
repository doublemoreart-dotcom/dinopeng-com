import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readProjectFile = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('package exposes the two-step update workflow', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'));

  assert.equal(packageJson.scripts['update:help'], 'node scripts/update-help.mjs');
  assert.equal(packageJson.scripts['update:start'], 'node scripts/update-start.mjs');
  assert.equal(packageJson.scripts['update:status'], 'node scripts/update-status.mjs');
  assert.equal(packageJson.scripts['update:preflight'], 'node scripts/update-status.mjs --working --strict');
  assert.equal(packageJson.scripts['update:finish'], 'node scripts/update-finish.mjs');
  assert.equal(packageJson.scripts['aidata:source:sync'], 'node scripts/aidata-source-sync.mjs');
  assert.equal(packageJson.scripts['aidata:source:status'], 'node scripts/aidata-source-status.mjs');
});

test('update help points editors to the independent source and two-step flow', async () => {
  const script = await readProjectFile('scripts/update-help.mjs');

  assert.match(script, /\.worktrees\/aidata-source/);
  assert.match(script, /update:start/);
  assert.match(script, /update:finish/);
  assert.match(script, /選用診斷/);
  assert.match(script, /doublemoreart-dotcom\/aidata/);
});

test('AI Data source sync validates the source and GA before copying', async () => {
  const script = await readProjectFile('scripts/aidata-source-sync.mjs');

  assert.match(script, /doublemoreart-dotcom\\\/aidata/);
  assert.match(script, /tests\/site\.test\.mjs/);
  assert.match(script, /GA4 must be installed exactly once/);
  assert.match(script, /aidata\/index\.html/);
  assert.match(script, /shared by the portal and other projects/);
  assert.equal((script.match(/'--delete'/g) || []).length, 1, 'only /aidata/assets may be pruned');
});

test('AI Data source status checks repository, page, assets, and GA parity', async () => {
  const script = await readProjectFile('scripts/aidata-source-status.mjs');

  assert.match(script, /doublemoreart-dotcom\\\/aidata/);
  assert.match(script, /page parity/);
  assert.match(script, /asset parity/);
  assert.match(script, /GA4 parity/);
  assert.match(script, /--strict/);
});

test('update start requires source acknowledgement and protects dated snapshots', async () => {
  const script = await readProjectFile('scripts/update-start.mjs');

  assert.match(script, /--valuation-checked/);
  assert.match(script, /--sources-checked/);
  assert.match(script, /Source checks not acknowledged/);
  assert.match(script, /old snapshots must not be overwritten/);
  assert.match(script, /replaceValuationDates/);
  assert.match(script, /replaceSourceDates/);
  assert.match(script, /replaceFooterVersion/);
  assert.match(script, /README\.md/);
  assert.match(script, /source_registry\.json/);
  assert.match(script, /independent AI Data source repo/);
  assert.match(script, /source and deployment snapshot differ/);
});

test('update finish runs a strict preflight before writing the snapshot', async () => {
  const script = await readProjectFile('scripts/update-finish.mjs');
  const sourceSyncIndex = script.indexOf('scripts/aidata-source-sync.mjs');
  const preflightIndex = script.indexOf('scripts/update-status.mjs');
  const prepareIndex = script.indexOf('scripts/release-prepare.mjs');
  const checkIndex = script.indexOf('scripts/release-check.mjs');
  const sourceStatusIndex = script.indexOf('scripts/aidata-source-status.mjs');

  assert.ok(sourceSyncIndex >= 0, 'source should be validated and synchronized first');
  assert.ok(preflightIndex > sourceSyncIndex, 'working page preflight should run after source sync');
  assert.ok(prepareIndex > preflightIndex, 'release prepare should run only after preflight');
  assert.ok(prepareIndex >= 0, 'release prepare should be invoked');
  assert.ok(checkIndex > prepareIndex, 'release check should run after release prepare');
  assert.ok(sourceStatusIndex > checkIndex, 'source parity should be checked after all release checks');
});

test('update status checks source registry coverage and snapshot parity', async () => {
  const script = await readProjectFile('scripts/update-status.mjs');

  assert.match(script, /data\/source_registry\.json/);
  assert.match(script, /source registry coverage/);
  assert.match(script, /dated snapshot/);
  assert.match(script, /source page parity/);
  assert.match(script, /GA4/);
  assert.match(script, /--working/);
  assert.match(script, /--strict/);
});

test('page version, source checks, and README snapshot stay synchronized', async () => {
  const [html, readme, registryText] = await Promise.all([
    readProjectFile('aidata/index.html'),
    readProjectFile('README.md'),
    readProjectFile('data/source_registry.json'),
  ]);
  const registry = JSON.parse(registryText);
  const versionDate = html.match(/<meta name="page-version-date" content="([^"]+)">/)?.[1];
  const checkedDate = html.match(/<meta name="valuation-checked-date" content="([^"]+)">/)?.[1];
  const sourceCheckedDate = html.match(/<meta name="source-checked-date" content="([^"]+)">/)?.[1];
  const markers = [...html.matchAll(/<time data-valuation-checked-date datetime="([^"]+)">([^<]+)<\/time>/g)];
  const sourceMarkers = [...html.matchAll(/<time data-source-checked-date datetime="([^"]+)">([^<]+)<\/time>/g)];

  assert.ok(versionDate, 'page version date should be present');
  assert.equal(checkedDate, versionDate);
  assert.equal(sourceCheckedDate, versionDate);
  assert.equal(registry.checkedDate, versionDate);
  assert.ok(registry.sources.length >= 5);
  for (const source of registry.sources.filter(item => item.status === 'active')) {
    assert.match(html, new RegExp(source.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.ok(markers.length >= 5, `expected at least 5 valuation date markers, got ${markers.length}`);
  for (const [, datetime, text] of markers) {
    assert.equal(datetime, versionDate);
    assert.equal(text, versionDate);
  }
  assert.ok(sourceMarkers.length >= 1, 'expected at least one report source date marker');
  for (const [, datetime, text] of sourceMarkers) {
    assert.equal(datetime, versionDate);
    assert.equal(text, versionDate);
  }
  assert.match(readme, new RegExp(`ai_industry_penetration_${versionDate}\\.html`));
  assert.match(html, new RegExp(`<span data-footer-version-date>${versionDate}<\\/span>`));
});
