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
  if (selection === undefined) return validated.sources;

  const ids = selection.split(',');
  if (ids.length === 0 || ids.some(id => id.length === 0)) {
    throw new Error('Project selection must be a comma-separated list of source ids.');
  }
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate project selection: ${selection}`);

  const sourcesById = new Map(validated.sources.map(source => [source.id, source]));
  return ids.map(id => {
    const source = sourcesById.get(id);
    if (!source) throw new Error(`Unknown project selection: ${id}`);
    return source;
  });
}

export function formatSummary(config, current, changes, forced = false) {
  const changedIds = new Set(changes.map(change => change.id));
  const lines = [
    '## Project source revisions',
    '',
    forced ? '> Forced sync requested.' : changes.length ? '> Source changes detected.' : '> All published snapshots are current.',
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

async function collectRevisions(config, resolver) {
  const entries = await Promise.all(config.sources.map(async source => [source.id, await resolver(source)]));
  return Object.fromEntries(entries);
}

async function check(configPath, statePath) {
  const config = validateConfig(await readJson(configPath));
  const previous = await readJson(statePath, { version: 1, sources: {} });
  const revisions = await collectRevisions(config, remoteRevision);
  const current = createState(config, revisions);
  const changes = compareStates(previous, current);
  const forced = /^(1|true|yes)$/i.test(process.env.FORCE_SYNC ?? '');
  const shouldSync = forced || changes.length > 0;
  const changedProjects = forced
    ? config.sources.map(source => source.id)
    : changes.map(change => change.id);

  await writeOutput('changed', String(shouldSync));
  await writeOutput('changed_projects', changedProjects.join(','));
  await writeSummary(formatSummary(config, current, changes, forced));
  console.log(shouldSync ? `Sync required: ${forced ? 'forced' : changes.map(change => change.id).join(', ')}` : 'No source changes detected.');
}

async function checkout(configPath, sourcesRootPath, selection) {
  const config = validateConfig(await readJson(configPath));
  const selectedSources = selectSources(config, selection);
  const sourcesRoot = resolve(sourcesRootPath);
  if (basename(sourcesRoot) !== 'sources') {
    throw new Error(`Refusing to replace a checkout directory not named sources: ${sourcesRoot}`);
  }
  await rm(sourcesRoot, { recursive: true, force: true });
  await mkdir(sourcesRoot, { recursive: true });

  await Promise.all(selectedSources.map(async source => {
    const destination = join(sourcesRoot, source.id);
    console.log(`Checking out ${source.repository}@${source.ref} into ${destination}`);
    await execFileAsync('git', [
      'clone', '--depth', '1', '--no-tags', '--single-branch', '--branch', source.ref,
      `https://github.com/${source.repository}.git`, destination,
    ], { maxBuffer: 10 * 1024 * 1024 });
  }));
}

async function capture(configPath, sourcesRootPath, statePath, selection) {
  const config = validateConfig(await readJson(configPath));
  const previous = await readJson(statePath, { version: 1, sources: {} });
  const selectedSources = selectSources(config, selection);
  const selectedIds = new Set(selectedSources.map(source => source.id));
  const sourcesRoot = resolve(sourcesRootPath);
  const revisions = await collectRevisions(config, async source => {
    if (selectedIds.has(source.id)) return localRevision(source, sourcesRoot);

    const previousSource = previous?.sources?.[source.id];
    if (
      previousSource?.repository !== source.repository
      || previousSource?.ref !== source.ref
      || !SHA_PATTERN.test(previousSource?.sha ?? '')
    ) {
      throw new Error(`Cannot preserve an invalid published revision for ${source.id}`);
    }
    return previousSource.sha;
  });
  const state = createState(config, revisions);
  const destination = resolve(statePath);
  const temporary = `${destination}.tmp`;
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temporary, destination);
  console.log(`Recorded ${config.sources.length} source revisions in ${destination}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'check' && args.length === 2) return check(args[0], args[1]);
  if (command === 'checkout' && (args.length === 2 || args.length === 3)) return checkout(args[0], args[1], args[2]);
  if (command === 'capture' && (args.length === 3 || args.length === 4)) return capture(args[0], args[1], args[2], args[3]);
  throw new Error('Usage: project-revisions.mjs <check CONFIG STATE | checkout CONFIG SOURCES_ROOT [PROJECT_IDS] | capture CONFIG SOURCES_ROOT STATE [PROJECT_IDS]>');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
