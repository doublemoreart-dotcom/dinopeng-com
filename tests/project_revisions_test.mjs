import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compareStates, createState, formatSummary, validateConfig } from '../scripts/project-revisions.mjs';

const config = {
  version: 1,
  sources: [
    { id: 'aidata', repository: 'doublemoreart-dotcom/aidata', ref: 'main' },
    { id: 'sporttech', repository: 'doublemoreart-dotcom/sporttech', ref: 'gh-pages' },
  ],
};

const revisions = {
  aidata: '1111111111111111111111111111111111111111',
  sporttech: '2222222222222222222222222222222222222222',
};

test('source config rejects duplicate or unsafe entries', () => {
  assert.deepEqual(validateConfig(structuredClone(config)), config);
  assert.throws(() => validateConfig({ version: 1, sources: [...config.sources, config.sources[0]] }), /Duplicate/);
  assert.throws(() => validateConfig({ version: 1, sources: [{ id: '../bad', repository: 'owner/repo', ref: 'main' }] }), /Invalid source id/);
  assert.throws(() => validateConfig({ version: 1, sources: [{ id: 'good', repository: 'https:\/\/example.com/repo', ref: 'main' }] }), /Invalid repository/);
});

test('state comparison detects only source or configuration changes', () => {
  const current = createState(config, revisions);
  assert.deepEqual(compareStates(current, current), []);

  const previous = structuredClone(current);
  previous.sources.aidata.sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.deepEqual(compareStates(previous, current), [{
    id: 'aidata',
    status: 'revision',
    before: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    after: revisions.aidata,
  }]);

  previous.sources.aidata = { repository: 'owner/old', ref: 'main', sha: revisions.aidata };
  assert.equal(compareStates(previous, current)[0].status, 'configuration');
});

test('summary exposes every revision and whether an update is needed', () => {
  const current = createState(config, revisions);
  const changes = compareStates({ version: 1, sources: {} }, current);
  const summary = formatSummary(config, current, changes);
  assert.match(summary, /Project source revisions/);
  assert.match(summary, /\| aidata \| `main` \| `1111111` \| Update \|/);
  assert.match(summary, /\| sporttech \| `gh-pages` \| `2222222` \| Update \|/);
});

test('sync workflow skips expensive work when revisions are current', async () => {
  const workflow = await readFile(new URL('../.github/workflows/sync-projects.yml', import.meta.url), 'utf8');
  assert.match(workflow, /force_sync:/);
  assert.match(workflow, /project-revisions\.mjs check config\/project-sources\.json \.project-sync-state\.json/);
  assert.match(workflow, /project-revisions\.mjs checkout config\/project-sources\.json \.\.\/sources/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.ok(
    workflow.match(/if: steps\.revisions\.outputs\.changed == 'true'/g)?.length >= 6,
    'all expensive sync steps should depend on source changes',
  );
  assert.match(workflow, /git add \.project-sync-state\.json/);
});
