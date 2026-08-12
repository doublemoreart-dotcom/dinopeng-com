import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  assertNoZeroByteFiles,
  assertSameFile,
  checkInlineScripts,
  dateSnapshotName,
  extractCompanyLogoPaths,
  extractMeta,
  listFilesRecursive,
  listDateSnapshots,
  readText,
  requireFile,
  rootPath,
} from './release-utils.mjs';

const portalHtml = await readText('index.html');
const aidataHtml = await readText('aidata/index.html');
const versionDate = extractMeta(aidataHtml, 'page-version-date');
const versionNumber = extractMeta(aidataHtml, 'page-version-number');
const valuationCheckedDate = extractMeta(aidataHtml, 'valuation-checked-date');
const sourceCheckedDate = extractMeta(aidataHtml, 'source-checked-date');
const sourceRegistry = JSON.parse(await readText('data/source_registry.json'));
const currentSnapshot = dateSnapshotName(versionDate);

if (!aidataHtml.includes(`<span data-footer-version-date>${versionDate}</span>`)) {
  throw new Error(`Footer version date must match ${versionDate}`);
}
if (!aidataHtml.includes(`<span data-footer-version-number>${versionNumber}</span>`)) {
  throw new Error(`Footer version number must match ${versionNumber}`);
}

if (valuationCheckedDate !== versionDate) {
  throw new Error(`Valuation check date ${valuationCheckedDate} must match page version date ${versionDate}`);
}
const valuationDateMarkers = [...aidataHtml.matchAll(/<time data-valuation-checked-date datetime="([^"]+)">([^<]+)<\/time>/g)];
if (valuationDateMarkers.length < 5) {
  throw new Error(`Expected at least 5 visible valuation check dates, found ${valuationDateMarkers.length}`);
}
for (const [, datetime, text] of valuationDateMarkers) {
  if (datetime !== valuationCheckedDate || text !== valuationCheckedDate) {
    throw new Error(`Visible valuation check date ${text} (${datetime}) does not match ${valuationCheckedDate}`);
  }
}

if (sourceCheckedDate !== versionDate) {
  throw new Error(`Report source check date ${sourceCheckedDate} must match page version date ${versionDate}`);
}
const sourceDateMarkers = [...aidataHtml.matchAll(/<time data-source-checked-date datetime="([^"]+)">([^<]+)<\/time>/g)];
if (sourceDateMarkers.length < 1) {
  throw new Error('Expected at least 1 visible report source check date');
}
for (const [, datetime, text] of sourceDateMarkers) {
  if (datetime !== sourceCheckedDate || text !== sourceCheckedDate) {
    throw new Error(`Visible report source check date ${text} (${datetime}) does not match ${sourceCheckedDate}`);
  }
}
if (sourceRegistry.checkedDate !== sourceCheckedDate) {
  throw new Error(`Source registry date ${sourceRegistry.checkedDate} must match ${sourceCheckedDate}`);
}
const activeSources = sourceRegistry.sources.filter((source) => source.status === 'active');
if (activeSources.length < 5) {
  throw new Error(`Expected at least 5 active report sources, found ${activeSources.length}`);
}
for (const source of activeSources) {
  if (!aidataHtml.includes(source.url)) {
    throw new Error(`Active report source is missing from aidata/index.html: ${source.id}`);
  }
}

requireFile('index.html');
requireFile('aidata/index.html');
requireFile(currentSnapshot);

if (!/Dino Peng｜Learning My New Life/.test(portalHtml)) {
  throw new Error('index.html should remain the dinopeng.com project portal');
}
if (!/AI 對產業的數據觀察/.test(aidataHtml)) {
  throw new Error('aidata/index.html should remain the AI Data report');
}
await assertSameFile('aidata/index.html', currentSnapshot);

for (const file of ['index.html', 'aidata/index.html', currentSnapshot]) {
  const scriptCount = checkInlineScripts(await readText(file), file);
  console.log(`${file}: inline scripts valid (${scriptCount})`);
}

const snapshots = await listDateSnapshots();
for (const snapshot of snapshots) {
  if (snapshot === currentSnapshot) continue;
  const html = await readText(snapshot);
  const snapshotDate = snapshot.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  let metaDate = null;
  try {
    metaDate = extractMeta(html, 'page-version-date');
  } catch (error) {
    console.warn(`${snapshot}: no page-version-date meta; treating as legacy snapshot`);
    continue;
  }
  if (metaDate === versionDate) {
    throw new Error(`${snapshot} has current release date ${versionDate}; old snapshots must not be overwritten`);
  }
  if (snapshotDate && metaDate !== snapshotDate) {
    console.warn(`${snapshot}: meta date ${metaDate} does not match filename date ${snapshotDate}; legacy cleanup recommended`);
  }
}

const logoPaths = extractCompanyLogoPaths(aidataHtml);
if (logoPaths.length === 0) {
  throw new Error('No company logo paths found in index.html');
}
for (const logoPath of logoPaths) {
  if (!existsSync(rootPath(logoPath))) {
    throw new Error(`Missing root logo asset: ${logoPath}`);
  }
  if (!existsSync(rootPath('aidata', logoPath))) {
    throw new Error(`Missing /aidata/ logo asset: aidata/${logoPath}`);
  }
}
await assertNoZeroByteFiles('assets/company-logos');
await assertNoZeroByteFiles('aidata/assets/company-logos');

const testFiles = (await listFilesRecursive('tests')).filter((file) => file.endsWith('.mjs'));
execFileSync('node', ['--test', ...testFiles], {
  cwd: rootPath(),
  stdio: 'inherit',
});

console.log(`Release check passed for ${versionNumber} (${versionDate})`);
