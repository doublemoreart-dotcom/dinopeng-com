import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { projectRootPath, rootPath } from './release-utils.mjs';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const sourceOptionIndex = args.indexOf('--source');
const sourceRoot = path.resolve(
  projectRootPath,
  sourceOptionIndex >= 0 ? args[sourceOptionIndex + 1] : '.worktrees/aidata-source',
);
const checks = [];

function record(label, passed, detail) {
  checks.push({ label, passed, detail });
}

function git(...gitArgs) {
  return execFileSync('git', ['-C', sourceRoot, ...gitArgs], { encoding: 'utf8' }).trim();
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function listFiles(directory, base = directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listFiles(fullPath, base));
    } else {
      results.push(path.relative(base, fullPath));
    }
  }
  return results.sort();
}

if (!existsSync(path.join(sourceRoot, '.git'))) {
  console.error(`Missing independent AI Data repo: ${sourceRoot}`);
  process.exit(1);
}

const remote = git('remote', 'get-url', 'origin');
const branch = git('branch', '--show-current');
const commit = git('rev-parse', '--short', 'HEAD');
const sourceStatus = git('status', '--short');
record('independent repository', /doublemoreart-dotcom\/aidata(?:\.git)?$/.test(remote), remote);
record('source branch', branch === 'main', `${branch} @ ${commit}`);
record('source working tree', sourceStatus.length === 0, sourceStatus.length === 0 ? 'clean' : 'contains local changes');

const [sourceHtml, deployedHtml] = await Promise.all([
  readFile(path.join(sourceRoot, 'index.html')),
  readFile(rootPath('aidata/index.html')),
]);
record('page parity', sourceHtml.equals(deployedHtml), 'source/index.html vs. portal/aidata/index.html');

const sourceAssetsRoot = path.join(sourceRoot, 'assets');
const rootAssetsRoot = rootPath('assets');
const deployedAssetsRoot = rootPath('aidata/assets');
const [sourceAssets, rootAssets, deployedAssets] = await Promise.all([
  listFiles(sourceAssetsRoot),
  listFiles(rootAssetsRoot),
  listFiles(deployedAssetsRoot),
]);
const sourceAssetList = JSON.stringify(sourceAssets);
const sameAssetList = sourceAssetList === JSON.stringify(rootAssets)
  && sourceAssetList === JSON.stringify(deployedAssets);
let sameAssetContent = sameAssetList;
if (sameAssetList) {
  for (const asset of sourceAssets) {
    const [sourceBuffer, rootBuffer, deployedBuffer] = await Promise.all([
      readFile(path.join(sourceAssetsRoot, asset)),
      readFile(path.join(rootAssetsRoot, asset)),
      readFile(path.join(deployedAssetsRoot, asset)),
    ]);
    const sourceHash = sha256(sourceBuffer);
    if (sourceHash !== sha256(rootBuffer) || sourceHash !== sha256(deployedBuffer)) {
      sameAssetContent = false;
      break;
    }
  }
}
record('asset parity', sameAssetList && sameAssetContent, `${sourceAssets.length} assets across source, root, and /aidata/`);

const gaLoaderPattern = /googletagmanager\.com\/gtag\/js\?id=G-BGHM581VD4/g;
const gaConfigPattern = /gtag\('config', 'G-BGHM581VD4'\)/g;
const sourceText = sourceHtml.toString('utf8');
const deployedText = deployedHtml.toString('utf8');
const sourceLoaderCount = (sourceText.match(gaLoaderPattern) || []).length;
const sourceConfigCount = (sourceText.match(gaConfigPattern) || []).length;
const deployedLoaderCount = (deployedText.match(gaLoaderPattern) || []).length;
const deployedConfigCount = (deployedText.match(gaConfigPattern) || []).length;
record(
  'GA4 parity',
  sourceLoaderCount === 1 && sourceConfigCount === 1 && deployedLoaderCount === 1 && deployedConfigCount === 1,
  `source=${sourceLoaderCount}/${sourceConfigCount}, deployed=${deployedLoaderCount}/${deployedConfigCount}`,
);

console.log(`AI Data source status: ${sourceRoot}`);
for (const check of checks) {
  console.log(`${check.passed ? '[ok]' : '[needs attention]'} ${check.label}: ${check.detail}`);
}

const failures = checks.filter(check => !check.passed && check.label !== 'source working tree');
if (failures.length > 0) {
  console.log(`Status: ${failures.length} synchronization check(s) need attention.`);
  if (strict) process.exitCode = 1;
} else if (sourceStatus.length > 0) {
  console.log('Status: source and deployment snapshot match; source changes are ready for review and commit.');
} else {
  console.log('Status: source and deployment snapshot are fully synchronized.');
}
