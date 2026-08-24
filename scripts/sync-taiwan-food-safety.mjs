#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const PROJECT = 'taiwan-food-safety';
export const SOURCE_REPOSITORY = 'doublemoreart-dotcom/taiwan-food-safety';
export const SOURCE_REF = 'main';
export const SOURCE_SHA = '1fe44a0f72d21ddddc149129faff691e60b4019f';
export const REQUIRED_FILES = ['favicon.ico', 'index.html', 'opengraph-image.png'];

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/i;
const ARTIFACT_ID_PATTERN = /^[1-9][0-9]*$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TREE_BYTES = 384 * 1024 * 1024;
const SAFE_GIT_CONFIG = [
  '-c', 'core.autocrlf=false',
  '-c', 'core.attributesFile=/dev/null',
  '-c', 'core.hooksPath=/dev/null',
];
const FORBIDDEN_GIT_CONTROL_NAMES = new Set([
  '.gitattributes',
  '.gitignore',
  '.gitmodules',
]);

function fail(message) {
  throw new Error(message);
}

export function validateProject(value) {
  if (value !== PROJECT) fail(`Only project=${PROJECT} is allowed.`);
  return value;
}

export function validateSourceSha(value) {
  if (!SHA_PATTERN.test(value ?? '') || value !== SOURCE_SHA) {
    fail(`Source SHA must equal the approved pin ${SOURCE_SHA}.`);
  }
  return value;
}

export function validatePortalSha(value) {
  if (!SHA_PATTERN.test(value ?? '')) fail(`Invalid immutable portal SHA: ${value}`);
  return value;
}

export function validateTransportMetadata(artifactId, artifactDigest) {
  if (!ARTIFACT_ID_PATTERN.test(artifactId ?? '')) fail(`Invalid artifact id: ${artifactId}`);
  if (!DIGEST_PATTERN.test(artifactDigest ?? '')) fail(`Invalid artifact digest: ${artifactDigest}`);
  return { artifactId, artifactDigest: artifactDigest.toLowerCase() };
}

export function gitSafeFoldComponent(value) {
  return value
    .normalize('NFKC')
    .replace(/\p{Default_Ignorable_Code_Point}/gu, '')
    .replace(/[ .]+$/u, '')
    .toLowerCase();
}

export function validateGitControlComponent(value) {
  const folded = gitSafeFoldComponent(value);
  if (/^\.git(?:~[0-9]+)?$/u.test(folded) || FORBIDDEN_GIT_CONTROL_NAMES.has(folded)) {
    fail(`Artifact path contains a forbidden Git control component: ${value}`);
  }
  return value;
}

export function validateRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0) fail('Artifact paths must be non-empty strings.');
  if (CONTROL_PATTERN.test(value)) fail(`Artifact path contains control characters: ${JSON.stringify(value)}`);
  if (value.includes('\\')) fail(`Artifact path contains a backslash: ${value}`);
  if (isAbsolute(value) || /^[A-Za-z]:/.test(value)) fail(`Artifact path is absolute: ${value}`);
  const parts = value.split('/');
  if (parts.some(part => part === '' || part === '.' || part === '..')) {
    fail(`Artifact path contains an empty or traversal segment: ${value}`);
  }
  for (const part of parts) validateGitControlComponent(part);
  if (posix.normalize(value) !== value) fail(`Artifact path is not canonical: ${value}`);
  return value;
}

function validateContainedPath(root, target) {
  const rel = relative(root, target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    fail(`Path escapes its approved root: ${target}`);
  }
}

async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

async function walkTree(root) {
  const resolvedRoot = resolve(root);
  const rootInfo = await lstat(resolvedRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    fail(`Artifact root must be a real directory: ${resolvedRoot}`);
  }

  const files = [];
  let totalBytes = 0;

  async function visit(directory, prefix = '') {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of entries) {
      const relativePath = validateRelativePath(prefix ? `${prefix}/${entry.name}` : entry.name);
      const absolutePath = resolve(directory, entry.name);
      validateContainedPath(resolvedRoot, absolutePath);
      const info = await lstat(absolutePath);
      if (info.isSymbolicLink()) fail(`Artifact symlinks are forbidden: ${relativePath}`);
      if (info.isDirectory()) {
        await visit(absolutePath, relativePath);
        continue;
      }
      if (!info.isFile()) fail(`Artifact contains a non-regular entry: ${relativePath}`);
      if (info.size > MAX_FILE_BYTES) fail(`Artifact file exceeds the size limit: ${relativePath}`);
      totalBytes += info.size;
      if (totalBytes > MAX_TREE_BYTES) fail('Artifact exceeds the total size limit.');
      files.push({
        path: relativePath,
        size: info.size,
        sha256: await hashFile(absolutePath),
      });
      if (files.length > MAX_FILES) fail('Artifact contains too many files.');
    }
  }

  await visit(resolvedRoot);
  files.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  if (files.length === 0) fail('Artifact contains no regular files.');
  for (const required of REQUIRED_FILES) {
    if (!files.some(file => file.path === required)) fail(`Artifact is missing required file: ${required}`);
  }
  return files;
}

export function canonicalInventoryText(files, sourceSha = SOURCE_SHA) {
  validateSourceSha(sourceSha);
  const seen = new Set();
  const sorted = [...files].sort((left, right) => left.path.localeCompare(right.path, 'en'));
  const lines = ['TREE-MANIFEST-V1', `PROJECT\t${PROJECT}`, `SOURCE\t${sourceSha}`];
  for (const file of sorted) {
    validateRelativePath(file.path);
    if (seen.has(file.path)) fail(`Artifact manifest contains duplicate path: ${file.path}`);
    seen.add(file.path);
    if (!Number.isSafeInteger(file.size) || file.size < 0) fail(`Invalid artifact size: ${file.path}`);
    if (!DIGEST_PATTERN.test(file.sha256 ?? '')) fail(`Invalid file digest: ${file.path}`);
    lines.push(`FILE\t${file.path}\t${file.size}\t${file.sha256.toLowerCase()}`);
  }
  return `${lines.join('\n')}\n`;
}

export function treeDigest(files, sourceSha = SOURCE_SHA) {
  return createHash('sha256').update(canonicalInventoryText(files, sourceSha)).digest('hex');
}

async function copyInventory(sourceRoot, destinationRoot, files) {
  for (const file of files) {
    const source = resolve(sourceRoot, file.path);
    const destination = resolve(destinationRoot, file.path);
    validateContainedPath(resolve(sourceRoot), source);
    validateContainedPath(resolve(destinationRoot), destination);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

function assertExactObjectKeys(value, keys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} contains unexpected keys.`);
  }
}

function assertInventoriesEqual(expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    fail('Artifact inventory, sizes, or file digests do not match the canonical manifest.');
  }
}

export async function createValidatedArtifact(
  rawRoot,
  validatedRoot,
  sourceSha,
  rawArtifactId,
  rawArtifactDigest,
) {
  validateSourceSha(sourceSha);
  const transport = validateTransportMetadata(rawArtifactId, rawArtifactDigest);
  const destination = resolve(validatedRoot);
  try {
    await lstat(destination);
    fail(`Validated artifact destination already exists: ${destination}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const rawFiles = await walkTree(rawRoot);
  const payloadRoot = join(destination, 'payload');
  await mkdir(payloadRoot, { recursive: true });
  await copyInventory(resolve(rawRoot), payloadRoot, rawFiles);
  const copiedFiles = await walkTree(payloadRoot);
  assertInventoriesEqual(rawFiles, copiedFiles);
  const digest = treeDigest(copiedFiles, sourceSha);
  const manifest = {
    version: 1,
    project: PROJECT,
    sourceSha,
    rawArtifactId: transport.artifactId,
    rawArtifactDigest: transport.artifactDigest,
    treeSha256: digest,
    files: copiedFiles,
  };
  await writeFile(join(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return manifest;
}

export async function verifyValidatedArtifact(
  artifactRoot,
  sourceSha,
  expectedTreeSha,
  rawArtifactId,
  rawArtifactDigest,
) {
  validateSourceSha(sourceSha);
  if (!DIGEST_PATTERN.test(expectedTreeSha ?? '')) fail(`Invalid expected tree digest: ${expectedTreeSha}`);
  const transport = validateTransportMetadata(rawArtifactId, rawArtifactDigest);
  const root = resolve(artifactRoot);
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) fail('Validated artifact root must be a real directory.');
  const rootEntries = (await readdir(root)).sort();
  if (JSON.stringify(rootEntries) !== JSON.stringify(['manifest.json', 'payload'])) {
    fail('Validated artifact root must contain only manifest.json and payload.');
  }

  const manifestInfo = await lstat(join(root, 'manifest.json'));
  if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile()) fail('Artifact manifest must be a regular file.');
  const manifestText = await readFile(join(root, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  assertExactObjectKeys(
    manifest,
    ['version', 'project', 'sourceSha', 'rawArtifactId', 'rawArtifactDigest', 'treeSha256', 'files'],
    'Artifact manifest',
  );
  if (manifestText !== `${JSON.stringify(manifest, null, 2)}\n`) fail('Artifact manifest is not canonical JSON.');
  if (manifest.version !== 1 || manifest.project !== PROJECT || manifest.sourceSha !== sourceSha) {
    fail('Artifact manifest identity does not match the approved project and source pin.');
  }
  if (
    manifest.rawArtifactId !== transport.artifactId
    || manifest.rawArtifactDigest !== transport.artifactDigest
  ) {
    fail('Artifact transport metadata does not match the validated raw artifact.');
  }
  if (!Array.isArray(manifest.files)) fail('Artifact manifest files must be an array.');
  for (const file of manifest.files) {
    assertExactObjectKeys(file, ['path', 'size', 'sha256'], `Artifact file ${file?.path ?? '<unknown>'}`);
  }
  const files = await walkTree(join(root, 'payload'));
  canonicalInventoryText(manifest.files, sourceSha);
  assertInventoriesEqual(manifest.files, files);
  const digest = treeDigest(files, sourceSha);
  if (manifest.treeSha256 !== digest || expectedTreeSha.toLowerCase() !== digest) {
    fail('Artifact tree digest does not match the canonical inventory.');
  }
  return manifest;
}

function validatePublishedState(state) {
  if (state?.version !== 1 || !state.sources || typeof state.sources !== 'object' || Array.isArray(state.sources)) {
    fail('Published state must contain a version 1 sources object.');
  }
  const selected = state.sources[PROJECT];
  if (
    selected?.repository !== SOURCE_REPOSITORY
    || selected?.ref !== SOURCE_REF
    || !SHA_PATTERN.test(selected?.sha ?? '')
  ) {
    fail(`Published state identity for ${PROJECT} is invalid.`);
  }
  return state;
}

export function assertImmutableBaseline(expectedText, actualText) {
  if (expectedText !== actualText) fail('Working-tree state differs from the immutable Git object baseline.');
  return true;
}

export function expectedStateText(baselineText, sourceSha = SOURCE_SHA) {
  validateSourceSha(sourceSha);
  let state;
  try {
    state = validatePublishedState(JSON.parse(baselineText));
  } catch (error) {
    fail(`Invalid immutable state baseline: ${error.message}`);
  }
  if (baselineText !== `${JSON.stringify(state, null, 2)}\n`) {
    fail('Immutable state baseline is not canonical JSON.');
  }
  if (state.sources[PROJECT].sha === sourceSha) fail('Published state already contains the approved source pin.');
  const expected = structuredClone(state);
  expected.sources[PROJECT].sha = sourceSha;
  const result = `${JSON.stringify(expected, null, 2)}\n`;
  let differences = 0;
  const length = Math.max(baselineText.length, result.length);
  for (let index = 0; index < length; index += 1) {
    if (baselineText[index] !== result[index]) differences += 1;
  }
  if (differences === 0) fail('State replacement produced no byte change.');
  return result;
}

export function assertExpectedState(baselineText, actualText, sourceSha = SOURCE_SHA) {
  const expected = expectedStateText(baselineText, sourceSha);
  if (actualText !== expected) fail(`Published state changed outside sources.${PROJECT}.sha.`);
  return true;
}

export function validateScopeRecords(records) {
  const paths = [];
  for (const record of records) {
    if (/[RC]/.test(record.status)) fail(`Rename/copy status is forbidden: ${record.status} ${record.path}`);
    validateRelativePath(record.path);
    if (record.path !== '.project-sync-state.json' && !record.path.startsWith(`${PROJECT}/`)) {
      fail(`Project sync changed a forbidden path: ${record.path}`);
    }
    paths.push(record.path);
  }
  if (!paths.includes('.project-sync-state.json')) fail('Project sync must update .project-sync-state.json.');
  return [...new Set(paths)].sort();
}

function parseNameStatus(output) {
  const tokens = output.split('\0').filter(Boolean);
  const records = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    if (/^[RC]/.test(status)) {
      const oldPath = tokens[index++];
      const newPath = tokens[index++];
      records.push({ status, path: newPath, oldPath });
    } else {
      records.push({ status, path: tokens[index++] });
    }
  }
  return records;
}

function parsePorcelain(output) {
  const tokens = output.split('\0').filter(Boolean);
  const records = [];
  for (let index = 0; index < tokens.length;) {
    const record = tokens[index++];
    if (record.length < 4 || record[2] !== ' ') fail(`Cannot parse git status record: ${record}`);
    const status = record.slice(0, 2);
    const path = record.slice(3);
    if (/[RC]/.test(status)) {
      const oldPath = tokens[index++];
      records.push({ status, path, oldPath });
    } else {
      records.push({ status, path });
    }
  }
  return records;
}

async function git(cwd, args, options = {}) {
  const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  return stdout;
}

async function safeGit(cwd, args, options = {}) {
  return git(cwd, [...SAFE_GIT_CONFIG, ...args], options);
}

async function safeGitBuffer(cwd, args) {
  const { stdout } = await execFileAsync('git', ['-C', cwd, ...SAFE_GIT_CONFIG, ...args], {
    encoding: null,
    maxBuffer: 384 * 1024 * 1024,
  });
  return stdout;
}

function chunks(values, size = 400) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export async function assertSafeGitEnvironment(portalRoot, portalSha, payloadPaths) {
  validatePortalSha(portalSha);
  const root = resolve(portalRoot);
  const rootAttributes = await safeGit(root, ['ls-tree', '--name-only', portalSha, '--', '.gitattributes']);
  if (rootAttributes.trim() !== '') fail('Root .gitattributes is forbidden for publication staging.');

  const canonicalPaths = ['.project-sync-state.json', ...payloadPaths.map(path => {
    validateRelativePath(path);
    return `${PROJECT}/${path}`;
  })];
  for (const group of chunks(canonicalPaths)) {
    const attributes = await safeGit(root, ['check-attr', '-a', '-z', '--', ...group]);
    if (attributes !== '') fail('Applicable Git attributes are forbidden for publication payload or state paths.');
  }
  return true;
}

function parseStageEntries(output) {
  return output.split('\0').filter(Boolean).map(record => {
    const match = /^([0-7]{6}) ([0-9a-f]{40,64}) ([0-3])\t([\s\S]+)$/u.exec(record);
    if (!match) fail(`Cannot parse staged index record: ${record}`);
    const [, mode, oid, stage, path] = match;
    validateRelativePath(path);
    return { mode, oid, stage, path, type: mode === '160000' ? 'commit' : 'blob' };
  });
}

function parseTreeEntries(output) {
  return output.split('\0').filter(Boolean).map(record => {
    const match = /^([0-7]{6}) (blob|tree|commit) ([0-9a-f]{40,64})\t([\s\S]+)$/u.exec(record);
    if (!match) fail(`Cannot parse committed tree record: ${record}`);
    const [, mode, type, oid, path] = match;
    validateRelativePath(path);
    return { mode, type, oid, stage: '0', path };
  });
}

async function expectedStateFromObject(portalRoot, portalSha, sourceSha) {
  const baseline = await immutableStateText(portalRoot, portalSha);
  return { baseline, expected: expectedStateText(baseline, sourceSha) };
}

async function verifyObjectInventory(
  entries,
  artifactRoot,
  manifest,
  expectedState,
  readBlob,
) {
  const byPath = new Map();
  for (const entry of entries) {
    if (byPath.has(entry.path)) fail(`Git object inventory contains duplicate path: ${entry.path}`);
    if (entry.stage !== '0') fail(`Unmerged index stage is forbidden: ${entry.path}`);
    if (entry.mode === '160000' || entry.type === 'commit') fail(`Gitlink/submodule mode is forbidden: ${entry.path}`);
    if (entry.mode !== '100644' || entry.type !== 'blob') {
      fail(`Git object mode must be 100644 blob: ${entry.path} (${entry.mode} ${entry.type})`);
    }
    byPath.set(entry.path, entry);
  }

  const expectedPaths = [
    '.project-sync-state.json',
    ...manifest.files.map(file => `${PROJECT}/${file.path}`),
  ].sort((left, right) => left.localeCompare(right, 'en'));
  const actualPaths = [...byPath.keys()].sort((left, right) => left.localeCompare(right, 'en'));
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    fail('Git object inventory has missing, extra, or transformed publication paths.');
  }

  const stateBlob = await readBlob(byPath.get('.project-sync-state.json').oid);
  if (!stateBlob.equals(Buffer.from(expectedState))) fail('Staged/committed state blob differs from expected immutable bytes.');

  const objectFiles = [];
  for (const expectedFile of manifest.files) {
    const gitPath = `${PROJECT}/${expectedFile.path}`;
    const blob = await readBlob(byPath.get(gitPath).oid);
    const artifactBytes = await readFile(join(resolve(artifactRoot), 'payload', expectedFile.path));
    if (!blob.equals(artifactBytes)) fail(`Git blob differs from validated artifact bytes: ${gitPath}`);
    objectFiles.push({
      path: expectedFile.path,
      size: blob.length,
      sha256: createHash('sha256').update(blob).digest('hex'),
    });
  }
  objectFiles.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  assertInventoriesEqual(manifest.files, objectFiles);
  if (treeDigest(objectFiles, manifest.sourceSha) !== manifest.treeSha256) {
    fail('Git object tree digest differs from validated artifact digest.');
  }
  return true;
}

async function assertPortalCheckout(portalRoot, portalSha) {
  validatePortalSha(portalSha);
  const root = resolve(portalRoot);
  const topLevel = (await safeGit(root, ['rev-parse', '--show-toplevel'])).trim();
  if (await realpath(topLevel) !== await realpath(root)) fail('Portal root is not the Git worktree root.');
  const head = (await safeGit(root, ['rev-parse', 'HEAD'])).trim();
  if (head !== portalSha) fail(`Portal HEAD drift: expected ${portalSha}, received ${head}`);
  return root;
}

async function ignoredPaths(portalRoot) {
  return (await safeGit(portalRoot, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z']))
    .split('\0')
    .filter(Boolean);
}

export async function verifyGitScope(portalRoot, mode) {
  if (!['unstaged', 'staged'].includes(mode)) fail(`Unknown scope mode: ${mode}`);
  const root = resolve(portalRoot);
  const statusRecords = parsePorcelain(await safeGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  validateScopeRecords(statusRecords);
  const ignored = await ignoredPaths(root);
  if (ignored.length > 0) fail(`Ignored artifact paths are forbidden: ${ignored.join(', ')}`);

  const staged = parseNameStatus(await safeGit(root, ['diff', '--cached', '--name-status', '-z']));
  const unstaged = parseNameStatus(await safeGit(root, ['diff', '--name-status', '-z']));
  const untracked = (await safeGit(root, ['ls-files', '--others', '--exclude-standard', '-z']))
    .split('\0')
    .filter(Boolean)
    .map(path => ({ status: '??', path }));

  if (mode === 'unstaged') {
    if (staged.length > 0) fail('Unexpected staged paths before literal staging.');
    validateScopeRecords([...unstaged, ...untracked]);
  } else {
    validateScopeRecords(staged);
    if (unstaged.length > 0 || untracked.length > 0) {
      fail('Staged gate requires unstaged0 and untracked0.');
    }
  }
  return true;
}

async function copyPayloadToPortal(payloadRoot, portalRoot) {
  const files = await walkTree(payloadRoot);
  const target = resolve(portalRoot, PROJECT);
  validateContainedPath(resolve(portalRoot), target);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await copyInventory(resolve(payloadRoot), target, files);
}

async function immutableStateText(portalRoot, portalSha) {
  return safeGit(portalRoot, ['show', `${portalSha}:.project-sync-state.json`]);
}

export async function applyValidatedArtifact(
  artifactRoot,
  portalRoot,
  portalSha,
  sourceSha,
  expectedTreeSha,
  rawArtifactId,
  rawArtifactDigest,
) {
  validateSourceSha(sourceSha);
  const root = await assertPortalCheckout(portalRoot, portalSha);
  const manifest = await verifyValidatedArtifact(
    artifactRoot,
    sourceSha,
    expectedTreeSha,
    rawArtifactId,
    rawArtifactDigest,
  );
  await assertSafeGitEnvironment(root, portalSha, manifest.files.map(file => file.path));
  const initialStatus = await safeGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (initialStatus !== '') fail('Portal checkout must be clean before publication.');
  const initialIgnored = await ignoredPaths(root);
  if (initialIgnored.length > 0) fail('Portal checkout contains ignored artifacts before publication.');
  const baseline = await immutableStateText(root, portalSha);
  const statePath = join(root, '.project-sync-state.json');
  assertImmutableBaseline(baseline, await readFile(statePath, 'utf8'));
  await copyPayloadToPortal(join(resolve(artifactRoot), 'payload'), root);
  const expectedState = expectedStateText(baseline, sourceSha);
  await writeFile(statePath, expectedState);
  assertExpectedState(baseline, await readFile(statePath, 'utf8'), sourceSha);
  await verifyGitScope(root, 'unstaged');
  return manifest;
}

export async function verifyStateFromImmutableObject(portalRoot, portalSha, sourceSha = SOURCE_SHA) {
  validateSourceSha(sourceSha);
  const root = await assertPortalCheckout(portalRoot, portalSha);
  const baseline = await immutableStateText(root, portalSha);
  const current = await readFile(join(root, '.project-sync-state.json'), 'utf8');
  return assertExpectedState(baseline, current, sourceSha);
}

export async function verifyStageReady(
  artifactRoot,
  portalRoot,
  portalSha,
  sourceSha,
  expectedTreeSha,
  rawArtifactId,
  rawArtifactDigest,
) {
  const root = await assertPortalCheckout(portalRoot, portalSha);
  const manifest = await verifyValidatedArtifact(
    artifactRoot,
    sourceSha,
    expectedTreeSha,
    rawArtifactId,
    rawArtifactDigest,
  );
  await verifyStateFromImmutableObject(root, portalSha, sourceSha);
  await verifyGitScope(root, 'unstaged');
  await assertSafeGitEnvironment(root, portalSha, manifest.files.map(file => file.path));
  return manifest;
}

export async function verifyStagedObjects(
  artifactRoot,
  portalRoot,
  portalSha,
  sourceSha,
  expectedTreeSha,
  rawArtifactId,
  rawArtifactDigest,
) {
  const root = await assertPortalCheckout(portalRoot, portalSha);
  const manifest = await verifyValidatedArtifact(
    artifactRoot,
    sourceSha,
    expectedTreeSha,
    rawArtifactId,
    rawArtifactDigest,
  );
  await assertSafeGitEnvironment(root, portalSha, manifest.files.map(file => file.path));
  const { expected } = await expectedStateFromObject(root, portalSha, sourceSha);
  const entries = parseStageEntries(await safeGit(root, [
    'ls-files', '--stage', '-z', '--', '.project-sync-state.json', PROJECT,
  ]));
  await verifyObjectInventory(
    entries,
    artifactRoot,
    manifest,
    expected,
    oid => safeGitBuffer(root, ['cat-file', 'blob', oid]),
  );
  await verifyGitScope(root, 'staged');
  return manifest;
}

export async function verifyPublicationCommit(
  artifactRoot,
  portalRoot,
  portalSha,
  sourceSha,
  expectedTreeSha,
  rawArtifactId,
  rawArtifactDigest,
) {
  validateSourceSha(sourceSha);
  validatePortalSha(portalSha);
  const root = resolve(portalRoot);
  const topLevel = (await safeGit(root, ['rev-parse', '--show-toplevel'])).trim();
  if (await realpath(topLevel) !== await realpath(root)) fail('Portal root is not the Git worktree root.');
  const manifest = await verifyValidatedArtifact(
    artifactRoot,
    sourceSha,
    expectedTreeSha,
    rawArtifactId,
    rawArtifactDigest,
  );
  await assertSafeGitEnvironment(root, portalSha, manifest.files.map(file => file.path));
  const parent = (await safeGit(root, ['rev-parse', 'HEAD^'])).trim();
  if (parent !== portalSha) fail(`Publication commit parent drift: expected ${portalSha}, received ${parent}`);
  const count = Number((await safeGit(root, ['rev-list', '--count', `${portalSha}..HEAD`])).trim());
  if (count !== 1) fail(`Publication must create exactly one commit, received ${count}.`);
  const records = parseNameStatus(await safeGit(root, ['diff', '--name-status', '-z', portalSha, 'HEAD']));
  validateScopeRecords(records);
  const { expected } = await expectedStateFromObject(root, portalSha, sourceSha);
  const entries = parseTreeEntries(await safeGit(root, [
    'ls-tree', '-r', '-z', 'HEAD', '--', '.project-sync-state.json', PROJECT,
  ]));
  await verifyObjectInventory(
    entries,
    artifactRoot,
    manifest,
    expected,
    oid => safeGitBuffer(root, ['cat-file', 'blob', oid]),
  );
  const status = await safeGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (status !== '') fail('Publication worktree must be clean after commit.');
  const ignored = await ignoredPaths(root);
  if (ignored.length > 0) fail('Publication worktree contains ignored artifacts after commit.');
  return manifest;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'validate-project' && args.length === 1) {
    validateProject(args[0]);
    return;
  }
  if (command === 'validate-transport' && args.length === 2) {
    validateTransportMetadata(args[0], args[1]);
    return;
  }
  if (command === 'validate-raw' && args.length === 5) {
    const manifest = await createValidatedArtifact(args[0], args[1], args[2], args[3], args[4]);
    process.stdout.write(`${manifest.treeSha256}\n`);
    return;
  }
  if (command === 'verify-artifact' && args.length === 5) {
    await verifyValidatedArtifact(args[0], args[1], args[2], args[3], args[4]);
    return;
  }
  if (command === 'apply' && args.length === 7) {
    await applyValidatedArtifact(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    return;
  }
  if (command === 'verify-state' && args.length === 3) {
    await verifyStateFromImmutableObject(args[0], args[1], args[2]);
    return;
  }
  if (command === 'verify-scope' && args.length === 2) {
    await verifyGitScope(args[0], args[1]);
    return;
  }
  if (command === 'verify-stage-ready' && args.length === 7) {
    await verifyStageReady(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    return;
  }
  if (command === 'verify-staged' && args.length === 7) {
    await verifyStagedObjects(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    return;
  }
  if (command === 'verify-commit' && args.length === 7) {
    await verifyPublicationCommit(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    return;
  }
  fail('Usage: sync-taiwan-food-safety.mjs <validate-project|validate-transport|validate-raw|verify-artifact|apply|verify-state|verify-scope|verify-stage-ready|verify-staged|verify-commit> ...');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
