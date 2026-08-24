import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compareStates,
  createState,
  expectedStateText,
  formatSummary,
  selectSources,
  validateConfig,
  validatePublishedState,
  validateScopePaths,
  verifyStateTextChange,
} from '../scripts/project-revisions.mjs';

const SOURCE_PIN = '1fe44a0f72d21ddddc149129faff691e60b4019f';
const OLD_SOURCE_SHA = '1f7f4baf470c0c7c7abf9c599cb4c7508d8cab19';
const OTHER_SHA = '2222222222222222222222222222222222222222';
const projectRevisionsScript = fileURLToPath(new URL('../scripts/project-revisions.mjs', import.meta.url));
const syncProjectsScript = fileURLToPath(new URL('../scripts/sync-projects.sh', import.meta.url));

const config = {
  version: 1,
  sources: [
    { id: 'aidata', repository: 'doublemoreart-dotcom/aidata', ref: 'main' },
    { id: 'taiwan-food-safety', repository: 'doublemoreart-dotcom/taiwan-food-safety', ref: 'main' },
  ],
};

const revisions = {
  aidata: OTHER_SHA,
  'taiwan-food-safety': OLD_SOURCE_SHA,
};

async function withTempDir(run) {
  const directory = await mkdtemp(join(tmpdir(), 'project-revisions-test-'));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function writeFakeGit(directory) {
  const binDirectory = join(directory, 'bin');
  const fakeGit = join(binDirectory, 'git');
  await mkdir(binDirectory, { recursive: true });
  await writeFile(fakeGit, String.raw`#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_GIT_LOG"
if [[ "$1" == "ls-remote" ]]; then
  printf '%s\trefs/heads/main\n' "$FAKE_REMOTE_SHA"
  exit 0
fi
if [[ "$1" == "clone" ]]; then
  destination="${'$'}{@: -1}"
  mkdir -p "$destination"
  exit 0
fi
if [[ "$1" == "-C" && "$3" == "rev-parse" && "$4" == "HEAD" ]]; then
  printf '%s\n' "${'$'}{FAKE_CHECKOUT_SHA:-$FAKE_REMOTE_SHA}"
  exit 0
fi
exit 99
`);
  await chmod(fakeGit, 0o755);
  return binDirectory;
}

function spawnProjectRevisions(args, environment) {
  return spawnSync(process.execPath, [projectRevisionsScript, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
}

test('source config rejects duplicate or unsafe entries', () => {
  assert.deepEqual(validateConfig(structuredClone(config)), config);
  assert.throws(() => validateConfig({ version: 1, sources: [...config.sources, config.sources[0]] }), /Duplicate/);
  assert.throws(() => validateConfig({ version: 1, sources: [{ id: '../bad', repository: 'owner/repo', ref: 'main' }] }), /Invalid source id/);
  assert.throws(() => validateConfig({ version: 1, sources: [{ id: 'good', repository: 'https:\/\/example.com/repo', ref: 'main' }] }), /Invalid repository/);
});

test('published state must exactly match configured source identities', () => {
  const state = createState(config, revisions);
  assert.deepEqual(validatePublishedState(config, structuredClone(state)), state);
  const missing = structuredClone(state);
  delete missing.sources.aidata;
  assert.throws(() => validatePublishedState(config, missing), /exactly match/);
  const changed = structuredClone(state);
  changed.sources.aidata.ref = 'other';
  assert.throws(() => validatePublishedState(config, changed), /Invalid published state/);
});

test('state comparison detects only source or configuration changes', () => {
  const current = createState(config, revisions);
  assert.deepEqual(compareStates(current, current), []);

  const previous = structuredClone(current);
  previous.sources['taiwan-food-safety'].sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.deepEqual(compareStates(previous, current), [{
    id: 'taiwan-food-safety',
    status: 'revision',
    before: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    after: revisions['taiwan-food-safety'],
  }]);
});

test('project selection permits only one literal Taiwan Food Safety id', () => {
  assert.deepEqual(
    selectSources(config, 'taiwan-food-safety').map(source => source.id),
    ['taiwan-food-safety'],
  );
  for (const selection of [undefined, '', 'aidata', 'unknown', 'all', 'force-all', 'taiwan-food-safety,aidata', 'taiwan-food-safety,taiwan-food-safety']) {
    assert.throws(() => selectSources(config, selection), /required|Unknown|not allowed/);
  }
});

test('summary exposes only the selected revision and update result', () => {
  const selectedConfig = { version: 1, sources: [config.sources[1]] };
  const current = createState(selectedConfig, { 'taiwan-food-safety': SOURCE_PIN });
  const changes = compareStates({ version: 1, sources: {} }, current);
  const summary = formatSummary(selectedConfig, current, changes);
  assert.match(summary, /Project source revisions/);
  assert.match(summary, /\| taiwan-food-safety \| `main` \| `1fe44a0` \| Update \|/);
  assert.doesNotMatch(summary, /aidata/);
});

test('state verification accepts only the canonical selected SHA replacement', () => {
  const beforeState = createState(config, revisions);
  const beforeText = `${JSON.stringify(beforeState, null, 2)}\n`;
  const afterText = expectedStateText(config, beforeText, 'taiwan-food-safety', SOURCE_PIN);
  assert.equal(verifyStateTextChange(config, beforeText, afterText, 'taiwan-food-safety', SOURCE_PIN), true);

  const changedOtherSource = JSON.parse(afterText);
  changedOtherSource.sources.aidata.sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.throws(
    () => verifyStateTextChange(
      config,
      beforeText,
      `${JSON.stringify(changedOtherSource, null, 2)}\n`,
      'taiwan-food-safety',
      SOURCE_PIN,
    ),
    /changed outside/,
  );
  assert.throws(
    () => expectedStateText(config, beforeText.trimEnd(), 'taiwan-food-safety', SOURCE_PIN),
    /canonical byte form/,
  );
});

test('scope allowlist rejects every extra subtree or missing state update', () => {
  assert.deepEqual(
    validateScopePaths(['.project-sync-state.json', 'taiwan-food-safety/index.html'], 'taiwan-food-safety'),
    ['.project-sync-state.json', 'taiwan-food-safety/index.html'],
  );
  assert.throws(
    () => validateScopePaths(['.project-sync-state.json', 'aidata/index.html'], 'taiwan-food-safety'),
    /forbidden paths/,
  );
  assert.throws(
    () => validateScopePaths(['taiwan-food-safety/index.html'], 'taiwan-food-safety'),
    /must update/,
  );
});

test('check and checkout query and clone exactly one pinned source', async () => {
  await withTempDir(async directory => {
    const configPath = join(directory, 'config.json');
    const statePath = join(directory, 'state.json');
    const outputPath = join(directory, 'output.txt');
    const logPath = join(directory, 'git.log');
    const sourcesRoot = join(directory, 'sources');
    const binDirectory = await writeFakeGit(directory);
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    await writeFile(statePath, `${JSON.stringify(createState(config, revisions), null, 2)}\n`);

    const environment = {
      PATH: `${binDirectory}:${process.env.PATH}`,
      FAKE_GIT_LOG: logPath,
      FAKE_REMOTE_SHA: SOURCE_PIN,
      GITHUB_OUTPUT: outputPath,
    };
    const checked = spawnProjectRevisions(
      ['check', configPath, statePath, 'taiwan-food-safety', SOURCE_PIN],
      environment,
    );
    assert.equal(checked.status, 0, checked.stderr);
    assert.match(await readFile(outputPath, 'utf8'), /changed_projects=taiwan-food-safety/);

    const checkedOut = spawnProjectRevisions(
      ['checkout', configPath, sourcesRoot, 'taiwan-food-safety', SOURCE_PIN],
      environment,
    );
    assert.equal(checkedOut.status, 0, checkedOut.stderr);

    const gitCalls = (await readFile(logPath, 'utf8')).trim().split('\n');
    assert.equal(gitCalls.filter(call => call.startsWith('ls-remote ')).length, 1);
    assert.equal(gitCalls.filter(call => call.startsWith('clone ')).length, 1);
    assert.ok(gitCalls.every(call => !call.includes('doublemoreart-dotcom/aidata')));
    assert.match(gitCalls.find(call => call.startsWith('clone ')), /doublemoreart-dotcom\/taiwan-food-safety\.git/);
  });
});

test('source SHA drift fails before sync and after checkout races', async () => {
  await withTempDir(async directory => {
    const configPath = join(directory, 'config.json');
    const statePath = join(directory, 'state.json');
    const logPath = join(directory, 'git.log');
    const binDirectory = await writeFakeGit(directory);
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    await writeFile(statePath, `${JSON.stringify(createState(config, revisions), null, 2)}\n`);

    const driftedCheck = spawnProjectRevisions(
      ['check', configPath, statePath, 'taiwan-food-safety', SOURCE_PIN],
      {
        PATH: `${binDirectory}:${process.env.PATH}`,
        FAKE_GIT_LOG: logPath,
        FAKE_REMOTE_SHA: OTHER_SHA,
      },
    );
    assert.notEqual(driftedCheck.status, 0);
    assert.match(driftedCheck.stderr, /Source SHA drift/);

    const racedCheckout = spawnProjectRevisions(
      ['checkout', configPath, join(directory, 'sources'), 'taiwan-food-safety', SOURCE_PIN],
      {
        PATH: `${binDirectory}:${process.env.PATH}`,
        FAKE_GIT_LOG: logPath,
        FAKE_REMOTE_SHA: SOURCE_PIN,
        FAKE_CHECKOUT_SHA: OTHER_SHA,
      },
    );
    assert.notEqual(racedCheckout.status, 0);
    assert.match(racedCheckout.stderr, /Checked out SHA drift/);
  });
});

test('sync shell rejects empty, multi, force-all, and every other project before source access', () => {
  for (const selection of ['', 'aidata', 'unknown', 'all', 'force-all', 'taiwan-food-safety,aidata', 'taiwan-food-safety,taiwan-food-safety']) {
    const result = spawnSync('bash', [syncProjectsScript, '/missing-sources', '/missing-portal', selection], { encoding: 'utf8' });
    assert.notEqual(result.status, 0, selection);
    assert.match(result.stderr, /Exactly one project id|Unknown project id/);
    assert.doesNotMatch(result.stderr, /No such file or directory/);
  }
});

test('sync shell maps only source out into the Taiwan Food Safety subtree', async () => {
  await withTempDir(async directory => {
    const sourcesRoot = join(directory, 'sources');
    const sourceOut = join(sourcesRoot, 'taiwan-food-safety', 'out');
    const portalRoot = join(directory, 'portal');
    await mkdir(sourceOut, { recursive: true });
    await mkdir(portalRoot, { recursive: true });
    await writeFile(join(sourceOut, 'index.html'), 'safe');
    await writeFile(join(sourceOut, 'favicon.ico'), 'icon');
    await writeFile(join(sourceOut, 'opengraph-image.png'), 'image');
    await writeFile(join(portalRoot, 'index.html'), 'portal');
    await writeFile(join(portalRoot, 'CNAME'), 'dinopeng.com\n');
    await writeFile(join(portalRoot, '.nojekyll'), '');

    const result = spawnSync(
      'bash', [syncProjectsScript, sourcesRoot, portalRoot, 'taiwan-food-safety'],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(join(portalRoot, 'taiwan-food-safety', 'index.html'), 'utf8'), 'safe');
    await assert.rejects(readFile(join(portalRoot, 'aidata', 'index.html')));
  });
});

test('workflow is dispatch-only, pinned, literal-staged, and single-project scoped', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync-projects.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:\n    inputs:\n      project:/);
  assert.match(workflow, /required: true\n        type: choice\n        options:\n          - taiwan-food-safety/);
  assert.doesNotMatch(workflow, /schedule:|force_sync:|FORCE_SYNC|project_paths|IFS=/);
  assert.match(workflow, new RegExp(`EXPECTED_SOURCE_SHA: ${SOURCE_PIN}`));
  assert.match(workflow, /if \[\[ "\$SELECTED_PROJECT" != "\$EXPECTED_PROJECT" \]\]/);
  assert.ok(workflow.indexOf('Validate requested project') < workflow.indexOf('Check out portal'));
  assert.ok(workflow.indexOf('Validate requested project') < workflow.indexOf('Check source revisions'));
  assert.match(workflow, /project-revisions\.mjs check config\/project-sources\.json \.project-sync-state\.json "\$SELECTED_PROJECT" "\$EXPECTED_SOURCE_SHA"/);
  assert.match(workflow, /project-revisions\.mjs checkout config\/project-sources\.json \.\.\/sources "\$SELECTED_PROJECT" "\$EXPECTED_SOURCE_SHA"/);
  assert.match(workflow, /project-revisions\.mjs capture config\/project-sources\.json \.\.\/sources \.project-sync-state\.json "\$SELECTED_PROJECT" "\$EXPECTED_SOURCE_SHA"/);
  assert.match(workflow, /project-revisions\.mjs verify-state/);
  assert.match(workflow, /project-revisions\.mjs verify-scope \. "\$SELECTED_PROJECT" unstaged/);
  assert.match(workflow, /git add -- \.project-sync-state\.json taiwan-food-safety/);
  assert.match(workflow, /project-revisions\.mjs verify-scope \. "\$SELECTED_PROJECT" staged/);
});
