import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  lstat,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PROJECT,
  SOURCE_SHA,
  assertExpectedState,
  assertImmutableBaseline,
  assertSafeGitEnvironment,
  applyValidatedArtifact,
  canonicalInventoryText,
  createValidatedArtifact,
  expectedStateText,
  treeDigest,
  validateProject,
  validateRelativePath,
  validateScopeRecords,
  validateSourceSha,
  validateTransportMetadata,
  verifyGitScope,
  verifyPublicationCommit,
  verifyStagedObjects,
  verifyValidatedArtifact,
} from '../scripts/sync-taiwan-food-safety.mjs';

const RAW_ID = '123456';
const RAW_DIGEST = 'a'.repeat(64);
async function temporaryDirectory(t, label) {
  const directory = await mkdtemp(join(tmpdir(), `${label}-`));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function writeFixture(root, files = {}) {
  const fixture = {
    'index.html': '<!doctype html><title>Taiwan Food Safety</title>',
    'favicon.ico': 'ico',
    'opengraph-image.png': 'png',
    '_next/static/app.js': 'console.log("data only");',
    '.nojekyll': '',
    ...files,
  };
  for (const [path, contents] of Object.entries(fixture)) {
    const destination = join(root, path);
    await mkdir(join(destination, '..'), { recursive: true });
    await writeFile(destination, contents);
  }
}

async function validArtifact(t) {
  const directory = await temporaryDirectory(t, 'tfs-artifact');
  const raw = join(directory, 'raw');
  const validated = join(directory, 'validated');
  await mkdir(raw);
  await writeFixture(raw);
  const manifest = await createValidatedArtifact(raw, validated, SOURCE_SHA, RAW_ID, RAW_DIGEST);
  return { directory, raw, validated, manifest };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

function safeGit(cwd, args) {
  return execFileSync('git', [
    '-C', cwd,
    '-c', 'core.autocrlf=false',
    '-c', 'core.attributesFile=/dev/null',
    '-c', 'core.hooksPath=/dev/null',
    ...args,
  ], { encoding: 'utf8' }).trim();
}

async function gitFixture(t) {
  const root = await temporaryDirectory(t, 'tfs-git');
  execFileSync('git', ['init', '-q', root]);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'user.email', 'test@example.com']);
  await writeFile(join(root, '.project-sync-state.json'), '{}\n');
  await mkdir(join(root, PROJECT));
  await writeFile(join(root, PROJECT, 'index.html'), 'before');
  git(root, ['add', '--', '.project-sync-state.json', PROJECT]);
  git(root, ['commit', '-q', '-m', 'fixture']);
  return root;
}

async function publicationFixture(t) {
  const root = await temporaryDirectory(t, 'tfs-publication');
  execFileSync('git', ['init', '-q', root]);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'user.email', 'test@example.com']);
  await writeFile(join(root, '.project-sync-state.json'), stateText());
  await mkdir(join(root, PROJECT));
  await writeFile(join(root, PROJECT, 'index.html'), 'old publication');
  git(root, ['add', '--', '.project-sync-state.json', PROJECT]);
  git(root, ['commit', '-q', '-m', 'portal base']);
  const portalSha = git(root, ['rev-parse', 'HEAD']);
  const artifact = await validArtifact(t);
  return { root, portalSha, ...artifact };
}

async function publicationBuildIdFixture(t) {
  const fixture = await publicationFixture(t);
  const manifestBytes = 'self.__BUILD_MANIFEST={};\n';
  const oldBuildPath = join(
    fixture.root,
    PROJECT,
    '_next/static/old-build/_buildManifest.js',
  );
  await mkdir(join(oldBuildPath, '..'), { recursive: true });
  await writeFile(oldBuildPath, manifestBytes);
  git(fixture.root, ['add', '--', PROJECT]);
  git(fixture.root, ['commit', '-q', '-m', 'old build id']);
  const portalSha = git(fixture.root, ['rev-parse', 'HEAD']);

  const newBuildPath = join(fixture.raw, '_next/static/new-build/_buildManifest.js');
  await mkdir(join(newBuildPath, '..'), { recursive: true });
  await writeFile(newBuildPath, manifestBytes);
  await rm(fixture.validated, { recursive: true, force: true });
  const manifest = await createValidatedArtifact(
    fixture.raw,
    fixture.validated,
    SOURCE_SHA,
    RAW_ID,
    RAW_DIGEST,
  );
  return { ...fixture, portalSha, manifest };
}

async function applyAndStagePublication(fixture) {
  await applyValidatedArtifact(
    fixture.validated,
    fixture.root,
    fixture.portalSha,
    SOURCE_SHA,
    fixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  safeGit(fixture.root, ['add', '--', '.project-sync-state.json', PROJECT]);
}

function configureMarkerFilter(root, marker) {
  const helper = `sh -c 'printf invoked > "${marker}"; exit 1'`;
  git(root, ['config', 'filter.evil.clean', helper]);
  git(root, ['config', 'filter.evil.process', helper]);
  git(root, ['config', 'filter.evil.smudge', helper]);
  git(root, ['config', 'filter.evil.required', 'true']);
}

function configureExternalMarkerFilter(configPath, attributesPath, marker) {
  const helper = `sh -c 'printf invoked > "${marker}"; exit 1'`;
  for (const [key, value] of [
    ['core.attributesFile', attributesPath],
    ['filter.evil.clean', helper],
    ['filter.evil.process', helper],
    ['filter.evil.smudge', helper],
    ['filter.evil.required', 'true'],
  ]) {
    execFileSync('git', ['config', '--file', configPath, key, value]);
  }
}

async function withGitConfigEnvironment(overrides, callback) {
  const keys = [
    'HOME',
    'XDG_CONFIG_HOME',
    'GIT_CONFIG_GLOBAL',
    'GIT_CONFIG_SYSTEM',
    'GIT_CONFIG_NOSYSTEM',
  ];
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) {
      const value = overrides[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('project and source selection reject empty, broad, multi, traversal, and shell values', () => {
  assert.equal(validateProject(PROJECT), PROJECT);
  for (const value of [
    undefined,
    '',
    'unknown',
    'all',
    'force',
    'force-all',
    `${PROJECT},aidata`,
    `${PROJECT},${PROJECT}`,
    '../taiwan-food-safety',
    'taiwan-food-safety/..',
    'taiwan-food-safety;id',
    '$(id)',
    '`id`',
  ]) {
    assert.throws(() => validateProject(value), /Only project=/);
  }
  assert.equal(validateSourceSha(SOURCE_SHA), SOURCE_SHA);
  assert.throws(() => validateSourceSha('b'.repeat(40)), /approved pin/);
  assert.throws(() => validateSourceSha(''), /approved pin/);
});

test('artifact paths reject traversal, absolute, backslash, empty segments, and controls', () => {
  assert.equal(validateRelativePath('_next/static/app.js'), '_next/static/app.js');
  for (const value of [
    '',
    '/absolute',
    'C:/absolute',
    '../escape',
    'safe/../escape',
    'safe//file',
    './file',
    'safe\\file',
    'safe\nfile',
    'safe\u0000file',
  ]) {
    assert.throws(() => validateRelativePath(value), /Artifact path/);
  }
});

test('real temporary Git fixtures reject root, nested, and case-equivalent Git control paths', async t => {
  const controls = [
    '.git',
    '.GIT',
    '.git.',
    '.git ',
    '.git~1',
    '.gitattributes',
    '.GITATTRIBUTES',
    '.gitmodules',
    '.GITMODULES',
    '.gitignore',
    '.GITIGNORE',
    'nested/.git',
    'nested/.GiT',
    'nested/.gitattributes',
    'nested/.gitmodules',
    'nested/.gitignore',
  ];
  for (const [index, control] of controls.entries()) {
    const repository = await temporaryDirectory(t, `tfs-control-${index}`);
    execFileSync('git', ['init', '-q', repository]);
    const raw = join(repository, 'raw');
    await mkdir(raw);
    await writeFixture(raw);
    const target = join(raw, control);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, 'forbidden');
    await assert.rejects(
      createValidatedArtifact(raw, join(repository, 'validated'), SOURCE_SHA, RAW_ID, RAW_DIGEST),
      /forbidden Git control component/i,
      control,
    );
  }
});

test('real temporary Git fixture rejects a nested repository before artifact validation', async t => {
  const repository = await temporaryDirectory(t, 'tfs-nested-repository');
  execFileSync('git', ['init', '-q', repository]);
  const raw = join(repository, 'raw');
  await mkdir(raw);
  await writeFixture(raw);
  execFileSync('git', ['init', '-q', join(raw, 'nested-repository')]);
  await assert.rejects(
    createValidatedArtifact(raw, join(repository, 'validated'), SOURCE_SHA, RAW_ID, RAW_DIGEST),
    /forbidden Git control component/i,
  );
});

test('transport metadata requires an immutable numeric id and SHA-256 digest', () => {
  assert.deepEqual(validateTransportMetadata(RAW_ID, RAW_DIGEST), {
    artifactId: RAW_ID,
    artifactDigest: RAW_DIGEST,
  });
  for (const id of ['', '0', '-1', '1,2', '../1', 'artifact']) {
    assert.throws(() => validateTransportMetadata(id, RAW_DIGEST), /artifact id/i);
  }
  assert.throws(() => validateTransportMetadata(RAW_ID, 'bad'), /artifact digest/i);
});

test('canonical inventory rejects duplicate entries and binds source, paths, sizes, and hashes', () => {
  const files = [{ path: 'index.html', size: 4, sha256: 'b'.repeat(64) }];
  const text = canonicalInventoryText(files);
  assert.match(text, new RegExp(`SOURCE\\t${SOURCE_SHA}`));
  assert.match(text, /FILE\tindex\.html\t4\t/);
  assert.equal(treeDigest(files), sha256(text));
  assert.throws(() => canonicalInventoryText([...files, ...files]), /duplicate path/);
});

test('trusted validator creates and verifies a canonical data-only artifact', async t => {
  const { validated, manifest } = await validArtifact(t);
  const verified = await verifyValidatedArtifact(
    validated,
    SOURCE_SHA,
    manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(verified.treeSha256, manifest.treeSha256);
  assert.deepEqual(
    verified.files.map(file => file.path),
    [...verified.files.map(file => file.path)].sort((left, right) => left.localeCompare(right, 'en')),
  );
  for (const required of ['index.html', 'favicon.ico', 'opengraph-image.png']) {
    assert.ok(verified.files.some(file => file.path === required));
  }
});

test('artifact verification rejects file tamper and transport or tree digest mismatch', async t => {
  const { validated, manifest } = await validArtifact(t);
  await writeFile(join(validated, 'payload', 'index.html'), 'tampered');
  await assert.rejects(
    verifyValidatedArtifact(validated, SOURCE_SHA, manifest.treeSha256, RAW_ID, RAW_DIGEST),
    /inventory|digest/i,
  );

  const second = await validArtifact(t);
  await assert.rejects(
    verifyValidatedArtifact(second.validated, SOURCE_SHA, 'b'.repeat(64), RAW_ID, RAW_DIGEST),
    /tree digest/i,
  );
  await assert.rejects(
    verifyValidatedArtifact(second.validated, SOURCE_SHA, second.manifest.treeSha256, '999', RAW_DIGEST),
    /transport metadata/i,
  );
  await assert.rejects(
    verifyValidatedArtifact(second.validated, SOURCE_SHA, second.manifest.treeSha256, RAW_ID, 'c'.repeat(64)),
    /transport metadata/i,
  );
});

test('artifact verification rejects manifest duplicate, missing, extra, and noncanonical inventory', async t => {
  const duplicate = await validArtifact(t);
  const duplicatePath = join(duplicate.validated, 'manifest.json');
  const duplicateManifest = JSON.parse(await readFile(duplicatePath, 'utf8'));
  duplicateManifest.files.push(duplicateManifest.files[0]);
  await writeFile(duplicatePath, `${JSON.stringify(duplicateManifest, null, 2)}\n`);
  await assert.rejects(
    verifyValidatedArtifact(duplicate.validated, SOURCE_SHA, duplicate.manifest.treeSha256, RAW_ID, RAW_DIGEST),
    /duplicate path/i,
  );

  const missing = await validArtifact(t);
  await rm(join(missing.validated, 'payload', 'favicon.ico'));
  await assert.rejects(
    verifyValidatedArtifact(missing.validated, SOURCE_SHA, missing.manifest.treeSha256, RAW_ID, RAW_DIGEST),
    /missing required|inventory/i,
  );

  const extra = await validArtifact(t);
  await writeFile(join(extra.validated, 'unexpected.txt'), 'extra');
  await assert.rejects(
    verifyValidatedArtifact(extra.validated, SOURCE_SHA, extra.manifest.treeSha256, RAW_ID, RAW_DIGEST),
    /only manifest\.json and payload/i,
  );

  const noncanonical = await validArtifact(t);
  const manifestPath = join(noncanonical.validated, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  await writeFile(manifestPath, JSON.stringify(manifest));
  await assert.rejects(
    verifyValidatedArtifact(noncanonical.validated, SOURCE_SHA, noncanonical.manifest.treeSha256, RAW_ID, RAW_DIGEST),
    /canonical JSON/i,
  );
});

test('raw and validated trees reject symlinks and missing required files', async t => {
  const directory = await temporaryDirectory(t, 'tfs-invalid-tree');
  const raw = join(directory, 'raw');
  await mkdir(raw);
  await writeFixture(raw);
  await symlink('index.html', join(raw, 'alias.html'));
  await assert.rejects(
    createValidatedArtifact(raw, join(directory, 'validated'), SOURCE_SHA, RAW_ID, RAW_DIGEST),
    /symlinks are forbidden/i,
  );

  const missing = join(directory, 'missing');
  await mkdir(missing);
  await writeFile(join(missing, 'index.html'), 'only one file');
  await assert.rejects(
    createValidatedArtifact(missing, join(directory, 'missing-validated'), SOURCE_SHA, RAW_ID, RAW_DIGEST),
    /missing required file/i,
  );
});

function stateText(tfsSha = '1f7f4baf470c0c7c7abf9c599cb4c7508d8cab19') {
  return `${JSON.stringify({
    version: 1,
    sources: {
      aidata: {
        repository: 'doublemoreart-dotcom/aidata',
        ref: 'main',
        sha: '955cc42efefd1ad3cb616eb5e33283798819f2e8',
      },
      [PROJECT]: {
        repository: 'doublemoreart-dotcom/taiwan-food-safety',
        ref: 'main',
        sha: tfsSha,
      },
    },
  }, null, 2)}\n`;
}

function assertPostApplyStateClosure(baseline, actual) {
  const expected = expectedStateText(baseline);
  assert.equal(actual, expected, 'Post-apply state bytes differ from the unique approved transition.');
  assertExpectedState(baseline, actual);
  return expected;
}

test('state update changes only the selected SHA and preserves every other byte', () => {
  const before = stateText();
  const after = expectedStateText(before);
  assert.equal(assertPostApplyStateClosure(before, after), after);
  assert.match(after, new RegExp(SOURCE_SHA));
  assert.match(after, /955cc42efefd1ad3cb616eb5e33283798819f2e8/);
  const changedOther = after.replace('955cc42efefd1ad3cb616eb5e33283798819f2e8', 'b'.repeat(40));
  assert.throws(() => assertPostApplyStateClosure(before, changedOther), /Post-apply state bytes differ/);
  assert.throws(
    () => assertPostApplyStateClosure(before, after.replace(SOURCE_SHA, '1f7f4baf470c0c7c7abf9c599cb4c7508d8cab19')),
    /Post-apply state bytes differ/,
  );
  assert.throws(
    () => assertPostApplyStateClosure(before, after.replace('955cc42efefd1ad3cb616eb5e33283798819f2e8', SOURCE_SHA)),
    /Post-apply state bytes differ/,
  );
  assert.throws(() => assertPostApplyStateClosure(before, after.trim()), /Post-apply state bytes differ/);
});

test('state gate rejects baseline tamper, noncanonical text, duplicate keys, and an already-published pin', () => {
  const baseline = stateText();
  assert.equal(assertImmutableBaseline(baseline, baseline), true);
  assert.throws(() => assertImmutableBaseline(baseline, baseline.replace('aidata', 'tampered')), /immutable Git object/);
  assert.throws(() => expectedStateText(JSON.stringify(JSON.parse(baseline))), /canonical JSON/);
  const duplicate = baseline.replace(
    `"${PROJECT}": {`,
    `"${PROJECT}": {"repository":"bad"},\n    "${PROJECT}": {`,
  );
  assert.throws(() => expectedStateText(duplicate), /canonical JSON|invalid immutable/i);
  assert.throws(() => expectedStateText(stateText(SOURCE_SHA)), /already contains/);
});

test('scope validator rejects extra subtree, rename/copy, traversal, and missing state', () => {
  assert.deepEqual(validateScopeRecords([
    { status: 'M', path: '.project-sync-state.json' },
    { status: 'A', path: `${PROJECT}/index.html` },
  ]), ['.project-sync-state.json', `${PROJECT}/index.html`]);
  assert.throws(() => validateScopeRecords([
    { status: 'M', path: '.project-sync-state.json' },
    { status: 'A', path: 'aidata/index.html' },
  ]), /forbidden path/);
  assert.throws(() => validateScopeRecords([
    { status: 'M', path: '.project-sync-state.json' },
    { status: 'R100', path: `${PROJECT}/new.html`, oldPath: `${PROJECT}/old.html` },
  ]), /Rename\/copy/);
  assert.throws(() => validateScopeRecords([{ status: 'A', path: `${PROJECT}/index.html` }]), /must update/);
});

test('git scope gate accepts only exact unstaged and staged publication paths', async t => {
  const root = await gitFixture(t);
  await writeFile(join(root, '.project-sync-state.json'), '{"changed":true}\n');
  await writeFile(join(root, PROJECT, 'index.html'), 'after');
  assert.equal(await verifyGitScope(root, 'unstaged'), true);
  git(root, ['add', '--', '.project-sync-state.json', PROJECT]);
  assert.equal(await verifyGitScope(root, 'staged'), true);
  await writeFile(join(root, 'escape.txt'), 'escape');
  await assert.rejects(verifyGitScope(root, 'staged'), /forbidden path|unstaged0/);
});

test('git scope gate accepts in-scope build-id replacement and rejects cross-scope and ignored escapes', async t => {
  const replacement = await gitFixture(t);
  const oldBuildPath = join(replacement, PROJECT, '_next/static/old-build/_buildManifest.js');
  const newBuildPath = join(replacement, PROJECT, '_next/static/new-build/_buildManifest.js');
  await mkdir(join(oldBuildPath, '..'), { recursive: true });
  await writeFile(oldBuildPath, 'self.__BUILD_MANIFEST={};\n');
  git(replacement, ['add', '--', PROJECT]);
  git(replacement, ['commit', '-q', '-m', 'old build id']);
  await writeFile(join(replacement, '.project-sync-state.json'), '{"changed":true}\n');
  await mkdir(join(newBuildPath, '..'), { recursive: true });
  await writeFile(newBuildPath, 'self.__BUILD_MANIFEST={};\n');
  await rm(oldBuildPath);
  git(replacement, ['add', '--', '.project-sync-state.json', PROJECT]);
  assert.match(
    git(replacement, ['diff', '--cached', '--name-status', '-M']),
    /R100\s+taiwan-food-safety\/_next\/static\/old-build\/_buildManifest\.js\s+taiwan-food-safety\/_next\/static\/new-build\/_buildManifest\.js/,
  );
  assert.equal(await verifyGitScope(replacement, 'staged'), true);

  const escaped = await gitFixture(t);
  await writeFile(join(escaped, '.project-sync-state.json'), '{"changed":true}\n');
  await writeFile(join(escaped, 'escaped.html'), 'before');
  await rm(join(escaped, PROJECT, 'index.html'));
  git(escaped, ['add', '--', '.project-sync-state.json', PROJECT, 'escaped.html']);
  await assert.rejects(verifyGitScope(escaped, 'staged'), /forbidden path/);

  const ignored = await gitFixture(t);
  await writeFile(join(ignored, '.gitignore'), 'ignored.txt\n');
  git(ignored, ['add', '--', '.gitignore']);
  git(ignored, ['commit', '-q', '-m', 'ignore fixture']);
  await writeFile(join(ignored, '.project-sync-state.json'), '{"changed":true}\n');
  await writeFile(join(ignored, PROJECT, 'index.html'), 'after');
  await writeFile(join(ignored, 'ignored.txt'), 'escape');
  await assert.rejects(verifyGitScope(ignored, 'unstaged'), /Ignored artifact paths/);
});

test('committed publication accepts an in-scope build-id replacement as actual A/D paths', async t => {
  const fixture = await publicationBuildIdFixture(t);
  await applyAndStagePublication(fixture);
  assert.match(
    git(fixture.root, ['diff', '--cached', '--name-status', '-M']),
    /R100\s+taiwan-food-safety\/_next\/static\/old-build\/_buildManifest\.js\s+taiwan-food-safety\/_next\/static\/new-build\/_buildManifest\.js/,
  );
  const staged = await verifyStagedObjects(
    fixture.validated,
    fixture.root,
    fixture.portalSha,
    SOURCE_SHA,
    fixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(staged.treeSha256, fixture.manifest.treeSha256);

  safeGit(fixture.root, ['commit', '-q', '-m', 'replace build id']);
  assert.match(
    git(fixture.root, ['diff', '--name-status', '-M', fixture.portalSha, 'HEAD']),
    /R100\s+taiwan-food-safety\/_next\/static\/old-build\/_buildManifest\.js\s+taiwan-food-safety\/_next\/static\/new-build\/_buildManifest\.js/,
  );
  const committed = await verifyPublicationCommit(
    fixture.validated,
    fixture.root,
    fixture.portalSha,
    SOURCE_SHA,
    fixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(committed.treeSha256, fixture.manifest.treeSha256);
});

test('root attributes remain forbidden for publication staging', async t => {
  const withAttributes = await publicationFixture(t);
  await writeFile(join(withAttributes.root, '.gitattributes'), `${PROJECT}/** filter=evil\n`);
  git(withAttributes.root, ['add', '--', '.gitattributes']);
  git(withAttributes.root, ['commit', '-q', '-m', 'root attributes']);
  const attributesSha = git(withAttributes.root, ['rev-parse', 'HEAD']);
  await assert.rejects(
    assertSafeGitEnvironment(
      withAttributes.root,
      attributesSha,
      withAttributes.manifest.files.map(file => file.path),
    ),
    /Root \.gitattributes/,
  );
});

test('inert installed filters allow the complete publication path without executing helpers', async t => {
  const fixture = await publicationFixture(t);
  const marker = join(fixture.directory, 'filter-invoked');
  configureMarkerFilter(fixture.root, marker);

  assert.equal(
    await assertSafeGitEnvironment(
      fixture.root,
      fixture.portalSha,
      fixture.manifest.files.map(file => file.path),
    ),
    true,
  );
  await applyAndStagePublication(fixture);
  const staged = await verifyStagedObjects(
    fixture.validated,
    fixture.root,
    fixture.portalSha,
    SOURCE_SHA,
    fixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(staged.treeSha256, fixture.manifest.treeSha256);
  safeGit(fixture.root, ['commit', '-q', '-m', 'publish with inert filter']);
  const committed = await verifyPublicationCommit(
    fixture.validated,
    fixture.root,
    fixture.portalSha,
    SOURCE_SHA,
    fixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(committed.treeSha256, fixture.manifest.treeSha256);
  await assert.rejects(lstat(marker), error => error.code === 'ENOENT');
});

test('global and system attribute sources cannot transform staged or committed publication bytes', async t => {
  for (const source of ['global', 'system']) {
    const fixture = await publicationFixture(t);
    const environmentRoot = await temporaryDirectory(t, `tfs-${source}-attributes`);
    const home = join(environmentRoot, 'home');
    const xdg = join(environmentRoot, 'xdg');
    const configPath = join(environmentRoot, `${source}.gitconfig`);
    const attributesPath = join(environmentRoot, `${source}.attributes`);
    const marker = join(environmentRoot, `${source}-filter-invoked`);
    await mkdir(home);
    await mkdir(xdg);
    await writeFile(attributesPath, `${PROJECT}/** filter=evil\n`);
    configureExternalMarkerFilter(configPath, attributesPath, marker);

    const environment = source === 'global'
      ? {
        HOME: home,
        XDG_CONFIG_HOME: xdg,
        GIT_CONFIG_GLOBAL: configPath,
        GIT_CONFIG_SYSTEM: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
      }
      : {
        HOME: home,
        XDG_CONFIG_HOME: xdg,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_SYSTEM: configPath,
        GIT_CONFIG_NOSYSTEM: undefined,
      };

    await withGitConfigEnvironment(environment, async () => {
      const payloadPath = `${PROJECT}/index.html`;
      const hostileAttribute = execFileSync(
        'git',
        ['-C', fixture.root, 'check-attr', 'filter', '--', payloadPath],
        { encoding: 'utf8' },
      ).trim();
      assert.equal(hostileAttribute, `${payloadPath}: filter: evil`, `${source} attribute fixture is effective`);
      await assert.rejects(lstat(marker), error => error.code === 'ENOENT');

      await applyValidatedArtifact(
        fixture.validated,
        fixture.root,
        fixture.portalSha,
        SOURCE_SHA,
        fixture.manifest.treeSha256,
        RAW_ID,
        RAW_DIGEST,
      );
      assert.equal(
        await readFile(join(fixture.root, '.project-sync-state.json'), 'utf8'),
        expectedStateText(stateText()),
      );
      assert.deepEqual(
        await readFile(join(fixture.root, PROJECT, 'index.html')),
        await readFile(join(fixture.validated, 'payload', 'index.html')),
      );
      await assert.rejects(lstat(marker), error => error.code === 'ENOENT');

      safeGit(fixture.root, ['add', '--', '.project-sync-state.json', PROJECT]);
      const staged = await verifyStagedObjects(
        fixture.validated,
        fixture.root,
        fixture.portalSha,
        SOURCE_SHA,
        fixture.manifest.treeSha256,
        RAW_ID,
        RAW_DIGEST,
      );
      assert.equal(staged.treeSha256, fixture.manifest.treeSha256);
      safeGit(fixture.root, ['commit', '-q', '-m', `publish with ${source} attributes disabled`]);
      const committed = await verifyPublicationCommit(
        fixture.validated,
        fixture.root,
        fixture.portalSha,
        SOURCE_SHA,
        fixture.manifest.treeSha256,
        RAW_ID,
        RAW_DIGEST,
      );
      assert.equal(committed.treeSha256, fixture.manifest.treeSha256);
      await assert.rejects(lstat(marker), error => error.code === 'ENOENT');
    });
  }
});

test('an applicable info attribute filter fails before payload copy without executing its helper', async t => {
  const fixture = await publicationFixture(t);
  const marker = join(fixture.directory, 'filter-invoked');
  configureMarkerFilter(fixture.root, marker);
  const gitDirectory = git(fixture.root, ['rev-parse', '--git-dir']);
  const absoluteGitDirectory = gitDirectory.startsWith('/') ? gitDirectory : join(fixture.root, gitDirectory);
  await mkdir(join(absoluteGitDirectory, 'info'), { recursive: true });
  await writeFile(join(absoluteGitDirectory, 'info', 'attributes'), `${PROJECT}/** filter=evil\n`);
  const stateBefore = await readFile(join(fixture.root, '.project-sync-state.json'), 'utf8');
  const payloadBefore = await readFile(join(fixture.root, PROJECT, 'index.html'), 'utf8');
  await assert.rejects(
    applyValidatedArtifact(
      fixture.validated,
      fixture.root,
      fixture.portalSha,
      SOURCE_SHA,
      fixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    /Applicable Git attributes/,
  );
  assert.equal(await readFile(join(fixture.root, '.project-sync-state.json'), 'utf8'), stateBefore);
  assert.equal(await readFile(join(fixture.root, PROJECT, 'index.html'), 'utf8'), payloadBefore);
  await assert.rejects(lstat(marker), error => error.code === 'ENOENT');
});

test('applicable filter and non-filter attributes fail closed for payload and state paths', async t => {
  const cases = [
    [`${PROJECT}/**`, 'text'],
    [`${PROJECT}/**`, 'eol=lf'],
    [`${PROJECT}/**`, 'working-tree-encoding=UTF-16'],
    ['.project-sync-state.json', 'ident'],
  ];
  for (const [pattern, attribute] of cases) {
    const fixture = await publicationFixture(t);
    const gitDirectory = git(fixture.root, ['rev-parse', '--git-dir']);
    const absoluteGitDirectory = gitDirectory.startsWith('/') ? gitDirectory : join(fixture.root, gitDirectory);
    await mkdir(join(absoluteGitDirectory, 'info'), { recursive: true });
    await writeFile(join(absoluteGitDirectory, 'info', 'attributes'), `${pattern} ${attribute}\n`);
    await assert.rejects(
      assertSafeGitEnvironment(fixture.root, fixture.portalSha, fixture.manifest.files.map(file => file.path)),
      /Applicable Git attributes/,
      `${pattern} ${attribute}`,
    );
  }
});

test('staged index objects and committed tree exactly equal the validated artifact', async t => {
  const fixture = await publicationFixture(t);
  await applyAndStagePublication(fixture);
  const staged = await verifyStagedObjects(
    fixture.validated,
    fixture.root,
    fixture.portalSha,
    SOURCE_SHA,
    fixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(staged.treeSha256, fixture.manifest.treeSha256);
  safeGit(fixture.root, ['commit', '-q', '-m', 'publish fixture']);
  const committed = await verifyPublicationCommit(
    fixture.validated,
    fixture.root,
    fixture.portalSha,
    SOURCE_SHA,
    fixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(committed.treeSha256, fixture.manifest.treeSha256);
});

test('post-stage index blob and executable-mode tamper are detected', async t => {
  const blobFixture = await publicationFixture(t);
  await applyAndStagePublication(blobFixture);
  const maliciousOid = execFileSync(
    'git',
    ['-C', blobFixture.root, 'hash-object', '-w', '--stdin'],
    { input: 'malicious staged bytes', encoding: 'utf8' },
  ).trim();
  git(blobFixture.root, [
    'update-index', '--cacheinfo', `100644,${maliciousOid},${PROJECT}/index.html`,
  ]);
  await assert.rejects(
    verifyStagedObjects(
      blobFixture.validated,
      blobFixture.root,
      blobFixture.portalSha,
      SOURCE_SHA,
      blobFixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    /blob differs|inventory/i,
  );

  const modeFixture = await publicationFixture(t);
  await applyAndStagePublication(modeFixture);
  git(modeFixture.root, ['update-index', '--chmod=+x', `${PROJECT}/index.html`]);
  await assert.rejects(
    verifyStagedObjects(
      modeFixture.validated,
      modeFixture.root,
      modeFixture.portalSha,
      SOURCE_SHA,
      modeFixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    /mode must be 100644/i,
  );
});

test('staged and committed gitlink mode 160000 are rejected', async t => {
  const stagedFixture = await publicationFixture(t);
  await applyAndStagePublication(stagedFixture);
  git(stagedFixture.root, [
    'update-index', '--add', '--cacheinfo', `160000,${stagedFixture.portalSha},${PROJECT}/submodule`,
  ]);
  await assert.rejects(
    verifyStagedObjects(
      stagedFixture.validated,
      stagedFixture.root,
      stagedFixture.portalSha,
      SOURCE_SHA,
      stagedFixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    /Gitlink\/submodule mode/,
  );

  const committedFixture = await publicationFixture(t);
  await applyAndStagePublication(committedFixture);
  git(committedFixture.root, [
    'update-index', '--add', '--cacheinfo', `160000,${committedFixture.portalSha},${PROJECT}/submodule`,
  ]);
  safeGit(committedFixture.root, ['commit', '-q', '-m', 'gitlink tamper']);
  await assert.rejects(
    verifyPublicationCommit(
      committedFixture.validated,
      committedFixture.root,
      committedFixture.portalSha,
      SOURCE_SHA,
      committedFixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    /Gitlink\/submodule mode/,
  );
});

test('post-commit blob, path, and inventory tamper are detected from committed objects', async t => {
  const fixture = await publicationFixture(t);
  await applyAndStagePublication(fixture);
  await writeFile(join(fixture.root, PROJECT, 'index.html'), 'post-stage tamper');
  await writeFile(join(fixture.root, PROJECT, 'extra.html'), 'extra');
  safeGit(fixture.root, ['add', '--', '.project-sync-state.json', PROJECT]);
  safeGit(fixture.root, ['commit', '-q', '-m', 'committed tamper']);
  await assert.rejects(
    verifyPublicationCommit(
      fixture.validated,
      fixture.root,
      fixture.portalSha,
      SOURCE_SHA,
      fixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    /missing, extra|blob differs|inventory/i,
  );
});

test('blob-only and state-only committed tamper are independently detected', async t => {
  const blobFixture = await publicationFixture(t);
  await applyAndStagePublication(blobFixture);
  const validBlobStage = await verifyStagedObjects(
    blobFixture.validated,
    blobFixture.root,
    blobFixture.portalSha,
    SOURCE_SHA,
    blobFixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(validBlobStage.treeSha256, blobFixture.manifest.treeSha256);
  await writeFile(join(blobFixture.root, PROJECT, 'index.html'), 'blob-only committed tamper');
  safeGit(blobFixture.root, ['add', '--', `${PROJECT}/index.html`]);
  safeGit(blobFixture.root, ['commit', '-q', '-m', 'blob-only tamper']);
  await assert.rejects(
    verifyPublicationCommit(
      blobFixture.validated,
      blobFixture.root,
      blobFixture.portalSha,
      SOURCE_SHA,
      blobFixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    error => {
      assert.equal(
        error.message,
        `Git blob differs from validated artifact bytes: ${PROJECT}/index.html`,
      );
      assert.doesNotMatch(error.message, /state|inventory|scope|mode|missing|extra/i);
      return true;
    },
  );

  const stateFixture = await publicationFixture(t);
  await applyAndStagePublication(stateFixture);
  const validStateStage = await verifyStagedObjects(
    stateFixture.validated,
    stateFixture.root,
    stateFixture.portalSha,
    SOURCE_SHA,
    stateFixture.manifest.treeSha256,
    RAW_ID,
    RAW_DIGEST,
  );
  assert.equal(validStateStage.treeSha256, stateFixture.manifest.treeSha256);
  const validExpectedState = expectedStateText(stateText());
  await writeFile(join(stateFixture.root, '.project-sync-state.json'), `${validExpectedState} `);
  safeGit(stateFixture.root, ['add', '--', '.project-sync-state.json']);
  safeGit(stateFixture.root, ['commit', '-q', '-m', 'state-only tamper']);
  await assert.rejects(
    verifyPublicationCommit(
      stateFixture.validated,
      stateFixture.root,
      stateFixture.portalSha,
      SOURCE_SHA,
      stateFixture.manifest.treeSha256,
      RAW_ID,
      RAW_DIGEST,
    ),
    error => {
      assert.equal(
        error.message,
        'Staged/committed state blob differs from expected immutable bytes.',
      );
      assert.doesNotMatch(error.message, /inventory|scope|mode|missing|extra/i);
      return true;
    },
  );
});

test('production permits installed filters only through the applicable-attribute gate', async () => {
  const script = await readFile(new URL('../scripts/sync-taiwan-food-safety.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /Installed Git filters/);
  assert.match(script, /check-attr/);
  assert.match(script, /Applicable Git attributes are forbidden/);
  assert.match(script, /\.project-sync-state\.json/);
});

test('publication pipeline keeps checkout and worktree inspection in the safe Git context', async () => {
  const script = await readFile(new URL('../scripts/sync-taiwan-food-safety.mjs', import.meta.url), 'utf8');
  const pipeline = script.slice(
    script.indexOf('export async function assertSafeGitEnvironment'),
    script.indexOf('async function main()'),
  );
  const apply = pipeline.slice(
    pipeline.indexOf('export async function applyValidatedArtifact'),
    pipeline.indexOf('export async function verifyStateFromImmutableObject'),
  );

  assert.doesNotMatch(pipeline, /await git\(/);
  assert.match(pipeline, /safeGit\(root, \['rev-parse', '--show-toplevel'\]\)/);
  assert.match(pipeline, /safeGit\(root, \['rev-parse', 'HEAD'\]\)/);
  assert.match(apply, /initialStatus = await safeGit\(root, \['status'/);
  assert.doesNotMatch(apply, /initialStatus = await git\(/);
  for (const command of ['status', 'diff', 'ls-files', 'ls-tree', 'cat-file', 'check-attr']) {
    assert.match(pipeline, new RegExp(`safeGit(?:Buffer)?\\([^;]+['"]${command}['"]`, 's'), command);
  }
});

test('dedicated workflow is dispatch-only, pinned, and isolated into three jobs', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync-taiwan-food-safety.yml', import.meta.url), 'utf8');
  assert.match(workflow, /^name: Sync Taiwan Food Safety$/m);
  assert.match(workflow, /workflow_dispatch:\n    inputs:\n      project:/);
  assert.match(workflow, /required: true\n        type: choice\n        options:\n          - taiwan-food-safety/);
  assert.doesNotMatch(workflow, /schedule:|force_sync:|force-all|default:/);
  assert.match(workflow, new RegExp(`EXPECTED_SOURCE_SHA: ${SOURCE_SHA}`));
  assert.match(workflow, /jobs:\n  build:/);
  assert.match(workflow, /\n  validate_artifact:\n    needs: build/);
  assert.match(workflow, /\n  publish:\n    needs: \[build, validate_artifact\]/);
  assert.match(workflow, /concurrency:\n  group: sync-project-sites\n  cancel-in-progress: false/);
});

test('build has no write permission, pins source, and every checkout drops credentials', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync-taiwan-food-safety.yml', import.meta.url), 'utf8');
  const build = workflow.slice(workflow.indexOf('  build:'), workflow.indexOf('  validate_artifact:'));
  const checkoutCount = (workflow.match(/uses: actions\/checkout@v7/g) ?? []).length;
  const persistFalseCount = (workflow.match(/persist-credentials: false/g) ?? []).length;
  assert.equal(checkoutCount, 4);
  assert.equal(persistFalseCount, checkoutCount);
  assert.match(build, /permissions:\n      contents: read/);
  assert.doesNotMatch(build, /contents: write|PUSH_TOKEN|git push/);
  assert.match(build, /repository: doublemoreart-dotcom\/taiwan-food-safety/);
  assert.match(build, new RegExp(`ref: ${SOURCE_SHA}`));
  assert.match(build, /git -C source rev-parse HEAD/);
  assert.ok(build.indexOf('Verify pinned source checkout') < build.indexOf('npm ci'));
});

test('artifact jobs bind ids and digests and never execute downloaded data', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync-taiwan-food-safety.yml', import.meta.url), 'utf8');
  const validator = workflow.slice(workflow.indexOf('  validate_artifact:'), workflow.indexOf('  publish:'));
  const publish = workflow.slice(workflow.indexOf('  publish:'));
  assert.match(validator, /artifact-ids: \$\{\{ needs\.build\.outputs\.raw_artifact_id \}\}/);
  assert.match(validator, /validate-transport "\$RAW_ARTIFACT_ID" "\$RAW_ARTIFACT_DIGEST"/);
  assert.match(validator, /validate-raw/);
  assert.match(publish, /artifact-ids: \$\{\{ needs\.validate_artifact\.outputs\.validated_artifact_id \}\}/);
  assert.match(publish, /verify-artifact/);
  assert.doesNotMatch(publish, /working-directory: source|npm ci|npm run build|source\/package|source\/out/);
});

test('publish derives state from immutable objects and safely binds stage, commit, and one push', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync-taiwan-food-safety.yml', import.meta.url), 'utf8');
  const script = await readFile(new URL('../scripts/sync-taiwan-food-safety.mjs', import.meta.url), 'utf8');
  const publish = workflow.slice(workflow.indexOf('  publish:'));
  assert.match(script, /\['show', `\$\{portalSha\}:\.project-sync-state\.json`\]/);
  assert.match(publish, /verify-stage-ready/);
  assert.match(publish, /add -- \.project-sync-state\.json taiwan-food-safety/);
  assert.match(publish, /verify-staged/);
  assert.match(publish, /git -c core\.autocrlf=false[\s\S]*-c core\.attributesFile=\/dev\/null[\s\S]*-c core\.hooksPath=\/dev\/null[\s\S]*add -- \.project-sync-state\.json taiwan-food-safety/);
  assert.match(publish, /-c core\.hooksPath=\/dev\/null[\s\S]*commit -m "chore: sync taiwan-food-safety"/);
  assert.match(publish, /verify-commit/);
  assert.match(publish, /git ls-remote --exit-code .* refs\/heads\/main/);
  assert.equal((workflow.match(/\$\{\{ github\.token \}\}/g) ?? []).length, 1);
  assert.equal((workflow.match(/git -c http\.https:\/\/github\.com\/\.extraheader=/g) ?? []).length, 1);
  assert.doesNotMatch(workflow, /git remote set-url|credential\.helper|persist-credentials: true/);
  assert.ok(publish.indexOf('Bind staged index objects') < publish.indexOf('PUSH_TOKEN:'));
  assert.ok(publish.indexOf('Verify remote main remains') < publish.indexOf('PUSH_TOKEN:'));
});

test('shared workflow and immutable dependency closure remain byte-exact to approved base', async () => {
  const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
  const bindings = new Map([
    ['.github/workflows/sync-projects.yml', ['a43d267bf904ccf0669f7509c77ef5e31116c726', 'b6e10f95b9275129204f668cd5af2f94a7d68492aa638feb31860c3a4a650bc6']],
    ['scripts/project-revisions.mjs', ['ec400be0bff65396be7ea009436c825fbd4bc1dc', 'fb47d2ca72859fa5396d110594f653c0108e97b05c7b775377d20f90b67ae655']],
    ['scripts/sync-projects.sh', ['d989659b28e0c322673ffb2d4c2471271d183489', '2ff6cafd8359cc4057e67d9497fd32eccba608d72311580950578a44d8efa6bb']],
    ['tests/project_revisions_test.mjs', ['a53253393879b753d85b43c8c5868aa7d59e59f2', '5bd31444654bc84edf0dbf6d8721ab30bb3ede762a81a663d978389e76772b8d']],
  ]);
  for (const [path, [blob, digest]] of bindings) {
    const bytes = await readFile(new URL(`../${path}`, import.meta.url));
    assert.equal(git(repositoryRoot, ['hash-object', path]), blob, `${path} blob drift`);
    assert.equal(sha256(bytes), digest, `${path} byte drift`);
  }
  const blobBindings = new Map([
    ['config/project-sources.json', 'c01cf139bbe0522e2d18e366a2c729c0523a4e3e'],
    ['package.json', '33858308643261e6b9aeb7bd7e92d6e9f9f2cf60'],
    ['tests/aidata_route_test.mjs', '223d3d93cdb1ec398345aa764932ba7c833c540e'],
  ]);
  for (const [path, blob] of blobBindings) {
    assert.equal(git(repositoryRoot, ['hash-object', path]), blob, `${path} blob drift`);
  }
  const immutableStateBlob = '018e67238959a367c16495770d75fa6fd31e18af';
  assert.equal(
    git(repositoryRoot, ['rev-parse', 'HEAD:.project-sync-state.json']),
    immutableStateBlob,
    '.project-sync-state.json immutable HEAD blob drift',
  );
  const immutableState = execFileSync(
    'git',
    ['-C', repositoryRoot, 'show', 'HEAD:.project-sync-state.json'],
    { encoding: 'utf8' },
  );
  const workingState = await readFile(new URL('../.project-sync-state.json', import.meta.url), 'utf8');
  if (workingState === immutableState) {
    assert.equal(assertImmutableBaseline(immutableState, workingState), true);
  } else {
    assert.equal(assertPostApplyStateClosure(immutableState, workingState), workingState);
  }
});
