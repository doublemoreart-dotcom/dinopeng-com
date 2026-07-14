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
const currentSnapshot = dateSnapshotName(versionDate);

requireFile('index.html');
requireFile('aidata/index.html');
requireFile(currentSnapshot);

if (!/Dino Peng — Projects/.test(portalHtml)) {
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
