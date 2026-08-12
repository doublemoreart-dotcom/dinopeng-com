import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  dateSnapshotName,
  extractMeta,
  projectRootPath,
  rootPath,
} from './release-utils.mjs';

function taipeiDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function readOption(name) {
  const args = process.argv.slice(2);
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function replaceMeta(html, name, value) {
  const pattern = new RegExp(`(<meta\\s+name=["']${name}["']\\s+content=["'])[^"']+(["'])`, 'i');
  if (!pattern.test(html)) throw new Error(`Missing meta[name="${name}"]`);
  return html.replace(pattern, `$1${value}$2`);
}

function replaceValuationDates(html, value) {
  const pattern = /<time data-valuation-checked-date datetime="[^"]+">[^<]+<\/time>/g;
  const matches = html.match(pattern) || [];
  if (matches.length < 5) {
    throw new Error(`Expected at least 5 valuation date markers, found ${matches.length}`);
  }
  return html.replace(pattern, `<time data-valuation-checked-date datetime="${value}">${value}</time>`);
}

function replaceSourceDates(html, value) {
  const pattern = /<time data-source-checked-date datetime="[^"]+">[^<]+<\/time>/g;
  const matches = html.match(pattern) || [];
  if (matches.length < 1) {
    throw new Error(`Expected at least 1 source date marker, found ${matches.length}`);
  }
  return html.replace(pattern, `<time data-source-checked-date datetime="${value}">${value}</time>`);
}

function replaceFooterVersion(html, date, version) {
  const datePattern = /(<span data-footer-version-date>)[^<]+(<\/span>)/g;
  const versionPattern = /(<span data-footer-version-number>)[^<]+(<\/span>)/g;
  if (!datePattern.test(html) || !versionPattern.test(html)) {
    throw new Error('Missing footer version fallback markers');
  }
  return html
    .replace(datePattern, `$1${date}$2`)
    .replace(versionPattern, `$1${version}$2`);
}

if (process.argv.slice(2).includes('--help')) {
  console.log('Usage: npm run update:start -- --date YYYY-MM-DD --sources-checked --valuation-checked [--source PATH]');
  console.log('Run only after checking the core report sources and AI company valuation ranking.');
  process.exit(0);
}

const targetDate = readOption('--date') || taipeiDate();
const sourcesChecked = process.argv.slice(2).includes('--sources-checked');
const valuationChecked = process.argv.slice(2).includes('--valuation-checked');
if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
  throw new Error(`Invalid --date value: ${targetDate}; expected YYYY-MM-DD`);
}
if (!sourcesChecked || !valuationChecked) {
  throw new Error('Source checks not acknowledged. Verify core reports and the AI valuation ranking, then rerun with --sources-checked --valuation-checked.');
}

const sourceRoot = path.resolve(projectRootPath, readOption('--source') || '.worktrees/aidata-source');
const sourceGitPath = path.join(sourceRoot, '.git');
const sourcePagePath = path.join(sourceRoot, 'index.html');
if (!existsSync(sourceGitPath) || !existsSync(sourcePagePath)) {
  throw new Error(`Missing independent AI Data source repo at ${sourceRoot}`);
}
const sourceRemote = execFileSync('git', ['-C', sourceRoot, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
if (!/doublemoreart-dotcom\/aidata(?:\.git)?$/.test(sourceRemote)) {
  throw new Error(`Unexpected AI Data source repository: ${sourceRemote}`);
}

const aidataPath = rootPath('aidata/index.html');
const readmePath = rootPath('README.md');
const sourceRegistryPath = rootPath('data/source_registry.json');
const [sourceHtml, deployedHtml] = await Promise.all([
  readFile(sourcePagePath, 'utf8'),
  readFile(aidataPath, 'utf8'),
]);
if (sourceHtml !== deployedHtml) {
  throw new Error('AI Data source and deployment snapshot differ. Review them before starting a new update.');
}
let aidataHtml = sourceHtml;
let readme = await readFile(readmePath, 'utf8');
const sourceRegistry = JSON.parse(await readFile(sourceRegistryPath, 'utf8'));
const currentDate = extractMeta(aidataHtml, 'page-version-date');
if (targetDate < currentDate) {
  throw new Error(`Target date ${targetDate} is older than current version ${currentDate}`);
}

const snapshotName = dateSnapshotName(targetDate);
if (targetDate !== currentDate && existsSync(rootPath(snapshotName))) {
  throw new Error(`${snapshotName} already exists; old snapshots must not be overwritten`);
}

const currentVersion = extractMeta(aidataHtml, 'page-version-number');
const targetVersion = targetDate === currentDate
  ? currentVersion
  : `v${targetDate.replaceAll('-', '.')}-1`;

aidataHtml = replaceMeta(aidataHtml, 'page-version-date', targetDate);
aidataHtml = replaceMeta(aidataHtml, 'page-version-number', targetVersion);
aidataHtml = replaceMeta(aidataHtml, 'valuation-checked-date', targetDate);
aidataHtml = replaceMeta(aidataHtml, 'source-checked-date', targetDate);
aidataHtml = replaceValuationDates(aidataHtml, targetDate);
aidataHtml = replaceSourceDates(aidataHtml, targetDate);
aidataHtml = replaceFooterVersion(aidataHtml, targetDate, targetVersion);
readme = readme.replace(
  /ai_industry_penetration_\d{4}-\d{2}-\d{2}\.html/,
  snapshotName,
);
sourceRegistry.checkedDate = targetDate;

await writeFile(sourcePagePath, aidataHtml);
await writeFile(aidataPath, aidataHtml);
await writeFile(readmePath, readme);
await writeFile(sourceRegistryPath, `${JSON.stringify(sourceRegistry, null, 2)}\n`);

console.log(`Started update ${targetVersion}`);
console.log(`- page date: ${targetDate}`);
console.log(`- report source check acknowledged: ${targetDate}`);
console.log(`- valuation check acknowledged: ${targetDate}`);
console.log(`- planned snapshot: ${snapshotName}`);
console.log(`- edit only: ${sourcePagePath}`);
console.log('- next: edit the source page, then run npm run update:finish');
console.log('- optional diagnosis while editing: npm run update:status');
