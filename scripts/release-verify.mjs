import { request } from 'node:https';
import {
  dateSnapshotName,
  extractMeta,
  fileSha256,
  readText,
  sha256,
} from './release-utils.mjs';

const commit = process.argv[2] || Date.now().toString();
const baseUrl = 'https://dinopeng.com';

function fetchBuffer(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    request(url, (response) => {
      const statusCode = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        if (redirectCount > 5) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        const nextUrl = new URL(response.headers.location, url).toString();
        response.resume();
        fetchBuffer(nextUrl, redirectCount + 1).then(resolve, reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`${url} returned HTTP ${statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject).end();
  });
}

async function assertRemoteMatches(relativePath, urlPath) {
  const url = `${baseUrl}${urlPath}?v=${encodeURIComponent(commit)}`;
  const [localHash, remoteBuffer] = await Promise.all([
    fileSha256(relativePath),
    fetchBuffer(url),
  ]);
  const remoteHash = sha256(remoteBuffer);
  if (localHash !== remoteHash) {
    throw new Error(`${urlPath} does not match ${relativePath}\nlocal:  ${localHash}\nremote: ${remoteHash}`);
  }
  console.log(`${urlPath} matches ${relativePath}`);
}

const indexHtml = await readText('index.html');
const versionDate = extractMeta(indexHtml, 'page-version-date');
const snapshotName = dateSnapshotName(versionDate);

await assertRemoteMatches('aidata/index.html', '/aidata/');
await assertRemoteMatches(snapshotName, `/${snapshotName}`);
await assertRemoteMatches('aidata/assets/company-logos/openai.ico', '/aidata/assets/company-logos/openai.ico');

console.log(`Remote release verification passed for ${commit}`);
