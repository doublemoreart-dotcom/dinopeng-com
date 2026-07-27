import { request } from 'node:https';
import { existsSync } from 'node:fs';
import {
  checkInlineScripts,
  fileSha256,
  readText,
  requireFile,
  rootPath,
  sha256,
} from './release-utils.mjs';

const shouldVerifyRemote = process.argv.includes('--remote');
const commit = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || Date.now().toString();
const baseUrl = 'https://dinopeng.com';
const pagePath = 'small-parties/index.html';

const requiredFiles = [
  pagePath,
  'small-parties/favicon.ico',
  'small-parties/favicon.svg',
  'small-parties/assets/hero-social-discourse.png',
  'small-parties/assets/menu-icon.png',
  'small-parties/assets/social-thumbnail.png',
  'small-parties/assets/tpp-logo.png',
];

const requiredHtml = [
  ['canonical route', 'https://dinopeng.com/small-parties/'],
  ['Google Analytics tag', 'G-T2WMCYX21T'],
  ['social preview image', 'assets/social-thumbnail.png'],
  ['favicon ico', 'favicon.ico'],
  ['GSAP', 'gsap@3/dist/gsap.min.js'],
  ['ScrollTrigger', 'gsap@3/dist/ScrollTrigger.min.js'],
  ['ScrollToPlugin', 'gsap@3/dist/ScrollToPlugin.min.js'],
  ['calculator active tier scroll', 'scrollToActiveTier'],
  ['mobile process flow', 'mobile-flow-item'],
];

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

for (const file of requiredFiles) {
  requireFile(file);
}

const html = await readText(pagePath);
if (!/為什麼小黨可以攪動社群言論？/.test(html)) {
  throw new Error(`${pagePath} should remain the Small Parties article`);
}

for (const [label, text] of requiredHtml) {
  if (!html.includes(text)) {
    throw new Error(`${pagePath} is missing ${label}: ${text}`);
  }
}

const scriptCount = checkInlineScripts(html, pagePath);
console.log(`${pagePath}: inline scripts valid (${scriptCount})`);

for (const file of requiredFiles.slice(1)) {
  if (existsSync(rootPath(file))) {
    const hash = await fileSha256(file);
    console.log(`${file}: ${hash.slice(0, 12)}`);
  }
}

if (shouldVerifyRemote) {
  await assertRemoteMatches(pagePath, '/small-parties/');
  await assertRemoteMatches('small-parties/favicon.ico', '/small-parties/favicon.ico');
  await assertRemoteMatches('small-parties/assets/social-thumbnail.png', '/small-parties/assets/social-thumbnail.png');
  await assertRemoteMatches('small-parties/assets/menu-icon.png', '/small-parties/assets/menu-icon.png');
  console.log(`Small Parties remote verification passed for ${commit}`);
} else {
  console.log('Small Parties local release check passed');
}
