import path from 'node:path';
import { projectRootPath } from './release-utils.mjs';

const sourceRoot = path.join(projectRootPath, '.worktrees/aidata-source');

console.log('AI Data 更新流程');
console.log('');
console.log('1. 完成資料來源與估值排行榜查核後開始更新：');
console.log('   npm run update:start -- --date YYYY-MM-DD --sources-checked --valuation-checked');
console.log('');
console.log('2. 只編輯獨立來源：');
console.log(`   ${path.join(sourceRoot, 'index.html')}`);
console.log(`   ${path.join(sourceRoot, 'assets')}/`);
console.log('');
console.log('3. 完成更新（自動測試、同步、建立快照與檢查 GA4）：');
console.log('   npm run update:finish');
console.log('');
console.log('選用診斷：npm run update:status');
console.log('正式提交：先提交 doublemoreart-dotcom/aidata，再由入口網站自動同步。');
