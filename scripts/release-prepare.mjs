import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  dateSnapshotName,
  extractMeta,
  projectRootPath,
  readText,
  rootPath,
} from './release-utils.mjs';

const indexHtml = await readText('index.html');
const versionDate = extractMeta(indexHtml, 'page-version-date');
const snapshotName = dateSnapshotName(versionDate);

await mkdir(rootPath('aidata'), { recursive: true });
await writeFile(rootPath('aidata/index.html'), indexHtml);
await writeFile(rootPath(snapshotName), indexHtml);

await mkdir(rootPath('aidata/assets'), { recursive: true });
await cp(rootPath('assets'), rootPath('aidata/assets'), {
  recursive: true,
  force: true,
  dereference: false,
});

console.log(`Prepared release ${versionDate}`);
console.log(`- synced index.html -> aidata/index.html`);
console.log(`- synced index.html -> ${path.relative(projectRootPath, rootPath(snapshotName))}`);
console.log(`- synced assets/ -> aidata/assets/`);
