#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SAFE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const SINGLE_PROJECT_ID = 'taiwan-food-safety';

export function validateConfig(config) {
  if (config?.version !== 1 || !Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error('Project source config must contain a non-empty version 1 sources array.');
  }

  const ids = new Set();
  for (const source of config.sources) {
    if (!SAFE_ID_PATTERN.test(source.id ?? '')) throw new Error(`Invalid source id: ${source.id}`);
    if (ids.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
    if (!SAFE_REPOSITORY_PATTERN.test(source.repository ?? '')) {
      throw new Error(`Invalid repository for ${source.id}: ${source.repository}`);
    }
    if (!SAFE_REF_PATTERN.test(source.ref ?? '')) throw new Error(`Invalid ref for ${source.id}: ${source.ref}`);
    ids.add(source.id);
  }

  return config;
}

export function createState(config, revisions) {
  const sources = {};
  for (const source of config.sources) {
    const sha = revisions[source.id];
    if (!SHA_PATTERN.test(sha ?? '')) throw new Error(`Invalid revision for ${source.id}: ${sha}`);
    sources[source.id] = { repository: source.repository, ref: source.ref, sha };
  }
  return { version: 1, sources };
}

export function validatePublishedState(config, state) {
  const validated = validateConfig(config);
  if (state?.version !== 1 || !state.sources || typeof state.sources !== 'object') {
    throw new Error('Published state must contain a version 1 sources object.');
  }

  const expectedIds = validated.sources.map(source => source.id);
  const actualIds = Object.keys(state.sources);
  if (actualIds.length !== expectedIds.length || actualIds.some(id => !expectedIds.includes(id))) {
    throw new Error('Published state source ids must exactly match the source config.');
  }

  for (const source of validated.sources) {
    const published = state.sources[source.id];
    if (
      published?.repository !== source.repository
      || published?.ref !== source.ref
      || !SHA_PATTERN.test(published?.sha ?? '')
    ) {
      throw new Error(`Invalid published state for ${source.id}`);
    }
  }

  return state;
}

export function compareStates(previous, current) {
  return Object.entries(current.sources).flatMap(([id, source]) => {
    const oldSource = previous?.sources?.[id];
    if (!oldSource) return [{ id, status: 'new', before: null, after: source.sha }];
    if (oldSource.repository !== source.repository || oldSource.ref !== source.ref) {
      return [{ id, status: 'configuration', before: oldSource.sha ?? null, after: source.sha }];
    }
    if (oldSource.sha !== source.sha) {
      return [{ id, status: 'revision', before: oldSource.sha ?? null, after: source.sha }];
    }
    return [];
  });
}

export function selectSources(config, selection) {
  const validated = validateConfig(config);
  if (typeof selection !== 'string' || selection.length === 0) {
    throw new Error('Exactly one project selection is required.');
  }
  if (selection.includes(',')) throw new Error(`Multiple project selection is not allowed: ${selection}`);
  if (selection === 'all' || selection === 'force-all') {
    throw new Error(`All-project selection is not allowed: ${selection}`);
  }
  if (selection !== SINGLE_PROJECT_ID) throw new Error(`Unknown project selection: ${selection}`);

  const source = validated.sources.find(candidate => candidate.id === selection);
  if (!source) throw new Error(`Unknown project selection: ${selection}`);
  return [source];
}

export function formatSummary(config, current, changes) {
  const changedIds = new Set(changes.map(change => change.id));
  const lines = [
    '## Project source revisions',
    '',
    changes.length ? '> Source changes detected.' : '> The selected published snapshot is current.',
    '',
    '| Project | Ref | Revision | Result |',
    '| --- | --- | --- | --- |',
  ];

  for (const source of config.sources) {
    lines.push(`| ${source.id} | \`${source.ref}\` | \`${current.sources[source.id].sha.slice(0, 7)}\` | ${changedIds.has(source.id) ? 'Update' : 'Current'} |`);
  }
  return `${lines.join('\n')}\n`;
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}

async function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function writeSummary(summary) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
}

async function remoteRevision(source) {
  const url = `https://github.com/${source.repository}.git`;
  const { stdout } = await execFileAsync('git', ['ls-remote', '--exit-code', url, `refs/heads/${source.ref}`], {
    maxBuffer: 1024 * 1024,
  });
  const sha = stdout.trim().split(/\s+/)[0];
  if (!SHA_PATTERN.test(sha ?? '')) throw new Error(`Unable to resolve ${source.repository}@${source.ref}`);
  return sha;
}

async function localRevision(source, sourcesRoot) {
  const { stdout } = await execFileAsync('git', ['-C', join(sourcesRoot, source.id), 'rev-parse', 'HEAD']);
  const sha = stdout.trim();
  if (!SHA_PATTERN.test(sha)) throw new Error(`Unable to read local revision for ${source.id}`);
  return sha;
}

function validateExpectedSha(expectedSha) {
  if (!SHA_PATTERN.test(expectedSha ?? '')) throw new Error(`Invalid expected source SHA: ${expectedSha}`);
  return expectedSha;
}

async function check(configPath, statePath, selection, expectedSha) {
  const config = validateConfig(await readJson(configPath));
  const previous = validatePublishedState(config, await readJson(statePath));
  const [source] = selectSources(config, selection);
  const pinnedSha = validateExpectedSha(expectedSha);
  const resolvedSha = await remoteRevision(source);
  if (resolvedSha !== pinnedSha) {
    throw new Error(`Source SHA drift for ${source.id}: expected ${pinnedSha}, received ${resolvedSha}`);
  }

  const selectedConfig = { version: 1, sources: [source] };
  const current = createState(selectedConfig, { [source.id]: resolvedSha });
  const selectedPrevious = { version: 1, sources: { [source.id]: previous.sources[source.id] } };
  const changes = compareStates(selectedPrevious, current);
  const shouldSync = changes.length > 0;
  const changedProject = shouldSync ? source.id : '';

  await writeOutput('changed', String(shouldSync));
  await writeOutput('changed_projects', changedProject);
  await writeOutput('selected_sha', resolvedSha);
  await writeSummary(formatSummary(selectedConfig, current, changes));
  console.log(shouldSync ? `Sync required: ${source.id}` : `No source changes detected for ${source.id}.`);
}

async function checkout(configPath, sourcesRootPath, selection, expectedSha) {
  const config = validateConfig(await readJson(configPath));
  const [source] = selectSources(config, selection);
  const pinnedSha = validateExpectedSha(expectedSha);
  const sourcesRoot = resolve(sourcesRootPath);
  if (basename(sourcesRoot) !== 'sources') {
    throw new Error(`Refusing to replace a checkout directory not named sources: ${sourcesRoot}`);
  }
  await rm(sourcesRoot, { recursive: true, force: true });
  await mkdir(sourcesRoot, { recursive: true });

  const destination = join(sourcesRoot, source.id);
  console.log(`Checking out ${source.repository}@${source.ref} into ${destination}`);
  await execFileAsync('git', [
    'clone', '--depth', '1', '--no-tags', '--single-branch', '--branch', source.ref,
    `https://github.com/${source.repository}.git`, destination,
  ], { maxBuffer: 10 * 1024 * 1024 });

  const checkedOutSha = await localRevision(source, sourcesRoot);
  if (checkedOutSha !== pinnedSha) {
    throw new Error(`Checked out SHA drift for ${source.id}: expected ${pinnedSha}, received ${checkedOutSha}`);
  }
}

async function capture(configPath, sourcesRootPath, statePath, selection, expectedSha) {
  const config = validateConfig(await readJson(configPath));
  const previous = validatePublishedState(config, await readJson(statePath));
  const [source] = selectSources(config, selection);
  const pinnedSha = validateExpectedSha(expectedSha);
  const sourcesRoot = resolve(sourcesRootPath);
  const checkedOutSha = await localRevision(source, sourcesRoot);
  if (checkedOutSha !== pinnedSha) {
    throw new Error(`Cannot capture unpinned SHA for ${source.id}: expected ${pinnedSha}, received ${checkedOutSha}`);
  }

  const state = structuredClone(previous);
  state.sources[source.id] = { ...state.sources[source.id], sha: checkedOutSha };
  const destination = resolve(statePath);
  const temporary = `${destination}.tmp`;
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temporary, destination);
  console.log(`Recorded ${config.sources.length} source revisions in ${destination}`);
}

export function expectedStateText(config, beforeText, selection, expectedSha) {
  const before = validatePublishedState(config, JSON.parse(beforeText));
  const [source] = selectSources(config, selection);
  const pinnedSha = validateExpectedSha(expectedSha);
  const canonicalBefore = `${JSON.stringify(before, null, 2)}\n`;
  if (beforeText !== canonicalBefore) {
    throw new Error('Published state baseline is not in canonical byte form.');
  }

  const expected = structuredClone(before);
  expected.sources[source.id] = { ...expected.sources[source.id], sha: pinnedSha };
  return `${JSON.stringify(expected, null, 2)}\n`;
}

export function verifyStateTextChange(config, beforeText, afterText, selection, expectedSha) {
  const expected = expectedStateText(config, beforeText, selection, expectedSha);
  if (afterText !== expected) {
    throw new Error(`Published state changed outside sources.${selection}.sha.`);
  }
  return true;
}

export function validateScopePaths(paths, selection) {
  if (selection !== SINGLE_PROJECT_ID) throw new Error(`Unknown project selection: ${selection}`);
  const uniquePaths = [...new Set(paths)];
  const invalid = uniquePaths.filter(path => (
    path !== '.project-sync-state.json'
    && !path.startsWith(`${selection}/`)
  ));
  if (invalid.length > 0) throw new Error(`Project sync changed forbidden paths: ${invalid.join(', ')}`);
  if (!uniquePaths.includes('.project-sync-state.json')) {
    throw new Error('Project sync must update .project-sync-state.json.');
  }
  return uniquePaths;
}

function porcelainPaths(output) {
  return output.split('\0').filter(Boolean).map(record => {
    if (record.length < 4 || record[2] !== ' ') throw new Error(`Unable to parse git status record: ${record}`);
    const status = record.slice(0, 2);
    if (/[RC]/.test(status)) throw new Error(`Renamed or copied paths are not allowed: ${record}`);
    return record.slice(3);
  });
}

async function verifyState(configPath, beforeStatePath, currentStatePath, selection, expectedSha) {
  const config = validateConfig(await readJson(configPath));
  const beforeText = await readFile(beforeStatePath, 'utf8');
  const afterText = await readFile(currentStatePath, 'utf8');
  verifyStateTextChange(config, beforeText, afterText, selection, expectedSha);
  console.log(`Verified byte-exact state update for ${selection}.`);
}

async function verifyScope(portalRootPath, selection, mode) {
  if (!['unstaged', 'staged'].includes(mode)) throw new Error(`Unknown scope verification mode: ${mode}`);
  const portalRoot = resolve(portalRootPath);
  const { stdout: statusOutput } = await execFileAsync(
    'git', ['-C', portalRoot, 'status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { encoding: 'utf8' },
  );
  validateScopePaths(porcelainPaths(statusOutput), selection);

  const { stdout: stagedOutput } = await execFileAsync(
    'git', ['-C', portalRoot, 'diff', '--cached', '--name-only', '-z'],
    { encoding: 'utf8' },
  );
  const stagedPaths = stagedOutput.split('\0').filter(Boolean);

  if (mode === 'unstaged') {
    if (stagedPaths.length > 0) throw new Error(`Unexpected staged paths before staging: ${stagedPaths.join(', ')}`);
  } else {
    validateScopePaths(stagedPaths, selection);
    const { stdout: unstagedOutput } = await execFileAsync(
      'git', ['-C', portalRoot, 'diff', '--name-only', '-z'],
      { encoding: 'utf8' },
    );
    const { stdout: untrackedOutput } = await execFileAsync(
      'git', ['-C', portalRoot, 'ls-files', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8' },
    );
    if (unstagedOutput || untrackedOutput) {
      throw new Error('Every allowed project sync path must be staged, with no untracked files remaining.');
    }
  }

  console.log(`Verified ${mode} project sync scope for ${selection}.`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'check' && args.length === 4) return check(args[0], args[1], args[2], args[3]);
  if (command === 'checkout' && args.length === 4) return checkout(args[0], args[1], args[2], args[3]);
  if (command === 'capture' && args.length === 5) return capture(args[0], args[1], args[2], args[3], args[4]);
  if (command === 'verify-state' && args.length === 5) return verifyState(args[0], args[1], args[2], args[3], args[4]);
  if (command === 'verify-scope' && args.length === 3) return verifyScope(args[0], args[1], args[2]);
  throw new Error('Usage: project-revisions.mjs <check CONFIG STATE PROJECT EXPECTED_SHA | checkout CONFIG SOURCES_ROOT PROJECT EXPECTED_SHA | capture CONFIG SOURCES_ROOT STATE PROJECT EXPECTED_SHA | verify-state CONFIG BEFORE_STATE CURRENT_STATE PROJECT EXPECTED_SHA | verify-scope PORTAL_ROOT PROJECT unstaged|staged>');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
