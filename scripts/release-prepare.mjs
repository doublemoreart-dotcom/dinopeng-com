import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  dateSnapshotName,
  extractMeta,
  projectRootPath,
  readText,
  rootPath,
} from './release-utils.mjs';

const aidataHtml = await readText('aidata/index.html');
const versionDate = extractMeta(aidataHtml, 'page-version-date');
const snapshotName = dateSnapshotName(versionDate);

await mkdir(rootPath('aidata'), { recursive: true });
await writeFile(rootPath(snapshotName), aidataHtml);

await mkdir(rootPath('aidata/assets'), { recursive: true });
await cp(rootPath('assets'), rootPath('aidata/assets'), {
  recursive: true,
  force: true,
  dereference: false,
});

console.log(`Prepared release ${versionDate}`);
console.log(`- synced aidata/index.html -> ${path.relative(projectRootPath, rootPath(snapshotName))}`);
console.log(`- synced assets/ -> aidata/assets/`);
