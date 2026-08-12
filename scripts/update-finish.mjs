import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { projectRootPath, rootPath } from './release-utils.mjs';

for (const script of [
  ['scripts/aidata-source-sync.mjs'],
  ['scripts/update-status.mjs', '--working', '--strict'],
  ['scripts/release-prepare.mjs'],
  ['scripts/release-check.mjs'],
  ['scripts/aidata-source-status.mjs', '--strict'],
]) {
  execFileSync(process.execPath, script, {
    cwd: rootPath(),
    stdio: 'inherit',
  });
}

console.log('Update finished: source, GA4, deployment snapshot, dated snapshot, assets, and checks are current.');
console.log('Next Git target: doublemoreart-dotcom/aidata');
console.log(`- cd ${path.join(projectRootPath, '.worktrees/aidata-source')}`);
console.log('- review: git status --short && git diff --check');
console.log('- commit and push the source repo; the portal snapshot will update through Sync project sites');
