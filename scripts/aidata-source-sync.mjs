import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRootPath, rootPath } from './release-utils.mjs';

const args = process.argv.slice(2);
const sourceOptionIndex = args.indexOf('--source');
const sourceRoot = path.resolve(
  projectRootPath,
  sourceOptionIndex >= 0 ? args[sourceOptionIndex + 1] : '.worktrees/aidata-source',
);

function git(...gitArgs) {
  return execFileSync('git', ['-C', sourceRoot, ...gitArgs], { encoding: 'utf8' }).trim();
}

if (!existsSync(path.join(sourceRoot, '.git'))) {
  throw new Error(`Missing independent AI Data repo: ${sourceRoot}`);
}

const remote = git('remote', 'get-url', 'origin');
if (!/doublemoreart-dotcom\/aidata(?:\.git)?$/.test(remote)) {
  throw new Error(`Refusing to sync from an unexpected repository: ${remote}`);
}

const sourceHtmlPath = path.join(sourceRoot, 'index.html');
const sourceAssetsPath = path.join(sourceRoot, 'assets');
if (!existsSync(sourceHtmlPath) || !existsSync(sourceAssetsPath)) {
  throw new Error('AI Data source must include index.html and assets/.');
}

execFileSync(process.execPath, ['--test', 'tests/site.test.mjs'], {
  cwd: sourceRoot,
  stdio: 'inherit',
});

const sourceHtml = await readFile(sourceHtmlPath, 'utf8');
const gaLoaderCount = (sourceHtml.match(/googletagmanager\.com\/gtag\/js\?id=G-BGHM581VD4/g) || []).length;
const gaConfigCount = (sourceHtml.match(/gtag\('config', 'G-BGHM581VD4'\)/g) || []).length;
if (gaLoaderCount !== 1 || gaConfigCount !== 1) {
  throw new Error(`GA4 must be installed exactly once in the source page; loader=${gaLoaderCount}, config=${gaConfigCount}`);
}

await mkdir(rootPath('aidata/assets'), { recursive: true });
await mkdir(rootPath('assets'), { recursive: true });
await writeFile(rootPath('aidata/index.html'), sourceHtml);

// The root assets directory is shared by the portal and other projects, so it
// may receive AI Data files but must never be pruned by this project.
execFileSync('rsync', ['-a', `${sourceAssetsPath}/`, `${rootPath('assets')}/`], {
  stdio: 'inherit',
});
execFileSync('rsync', ['-a', '--delete', `${sourceAssetsPath}/`, `${rootPath('aidata/assets')}/`], {
  stdio: 'inherit',
});

console.log('AI Data source synchronized to the portal deployment snapshot.');
console.log(`- source: ${sourceRoot}`);
console.log('- page: aidata/index.html');
console.log('- assets: assets/ and aidata/assets/');
console.log('- GA4: G-BGHM581VD4 (one loader, one config)');
