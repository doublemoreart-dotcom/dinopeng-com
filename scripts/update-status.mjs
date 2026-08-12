import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  checkInlineScripts,
  dateSnapshotName,
  extractMeta,
  fileSha256,
  projectRootPath,
  readText,
  rootPath,
} from './release-utils.mjs';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const workingOnly = args.includes('--working');
const sourceOptionIndex = args.indexOf('--source');
const sourceRoot = path.resolve(
  projectRootPath,
  sourceOptionIndex >= 0 ? args[sourceOptionIndex + 1] : '.worktrees/aidata-source',
);
const checks = [];

function record(label, passed, detail) {
  checks.push({ label, passed, detail });
}

const [html, readme, registryText] = await Promise.all([
  readText('aidata/index.html'),
  readText('README.md'),
  readText('data/source_registry.json'),
]);
const registry = JSON.parse(registryText);
const versionDate = extractMeta(html, 'page-version-date');
const versionNumber = extractMeta(html, 'page-version-number');
const valuationCheckedDate = extractMeta(html, 'valuation-checked-date');
const sourceCheckedDate = extractMeta(html, 'source-checked-date');
const snapshotName = dateSnapshotName(versionDate);

const sourcePagePath = path.join(sourceRoot, 'index.html');
const sourceAvailable = existsSync(path.join(sourceRoot, '.git')) && existsSync(sourcePagePath);
record('independent source', sourceAvailable, sourceRoot);
if (sourceAvailable) {
  const sourceHtml = await readFile(sourcePagePath, 'utf8');
  record('source page parity', sourceHtml === html, 'source/index.html vs. portal/aidata/index.html');

  const gaLoaderPattern = /googletagmanager\.com\/gtag\/js\?id=G-BGHM581VD4/g;
  const gaConfigPattern = /gtag\('config', 'G-BGHM581VD4'\)/g;
  const sourceLoaderCount = (sourceHtml.match(gaLoaderPattern) || []).length;
  const sourceConfigCount = (sourceHtml.match(gaConfigPattern) || []).length;
  const deployedLoaderCount = (html.match(gaLoaderPattern) || []).length;
  const deployedConfigCount = (html.match(gaConfigPattern) || []).length;
  record(
    'GA4',
    sourceLoaderCount === 1 && sourceConfigCount === 1 && deployedLoaderCount === 1 && deployedConfigCount === 1,
    `source=${sourceLoaderCount}/${sourceConfigCount}, deployed=${deployedLoaderCount}/${deployedConfigCount}`,
  );
}

const expectedVersionPrefix = `v${versionDate.replaceAll('-', '.')}-`;
record('page version', versionNumber.startsWith(expectedVersionPrefix), `${versionNumber} (${versionDate})`);
record('valuation check', valuationCheckedDate === versionDate, valuationCheckedDate);
record('report source check', sourceCheckedDate === versionDate, sourceCheckedDate);
record('source registry date', registry.checkedDate === sourceCheckedDate, registry.checkedDate);
record('README snapshot', readme.includes(snapshotName), snapshotName);

const activeSources = registry.sources.filter(source => source.status === 'active');
const missingSources = activeSources.filter(source => !html.includes(source.url));
record(
  'source registry coverage',
  activeSources.length >= 5 && missingSources.length === 0,
  missingSources.length === 0 ? `${activeSources.length} active sources` : `missing: ${missingSources.map(source => source.id).join(', ')}`,
);

try {
  const inlineScriptCount = checkInlineScripts(html, 'aidata/index.html');
  record('inline JavaScript', true, `${inlineScriptCount} script block(s)`);
} catch (error) {
  record('inline JavaScript', false, error.message);
}

if (!workingOnly) {
  const snapshotExists = existsSync(rootPath(snapshotName));
  let snapshotMatches = false;
  if (snapshotExists) {
    const [pageHash, snapshotHash] = await Promise.all([
      fileSha256('aidata/index.html'),
      fileSha256(snapshotName),
    ]);
    snapshotMatches = pageHash === snapshotHash;
  }
  record('dated snapshot', snapshotExists && snapshotMatches, snapshotExists ? snapshotName : `${snapshotName} missing`);
}

console.log(`Update status: ${versionNumber}`);
for (const check of checks) {
  console.log(`${check.passed ? '[ok]' : '[needs attention]'} ${check.label}: ${check.detail}`);
}

const failures = checks.filter(check => !check.passed);
if (failures.length > 0) {
  console.log(`Status: ${failures.length} check(s) need attention.`);
  if (strict) process.exitCode = 1;
} else {
  console.log(workingOnly ? 'Status: working page is ready to finish.' : 'Status: update is complete and synchronized.');
}
