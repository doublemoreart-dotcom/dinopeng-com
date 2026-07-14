import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const portalPagePath = new URL('../index.html', import.meta.url);
const aidataPagePath = new URL('../aidata/index.html', import.meta.url);
const aidataRootPath = new URL('../aidata/', import.meta.url);
const readmePath = new URL('../README.md', import.meta.url);
const updateGuidePath = new URL('../DATA_UPDATE.md', import.meta.url);

test('root publishes a project portal while /aidata/ keeps the AI report', async () => {
  const [portalPage, aidataPage] = await Promise.all([
    readFile(portalPagePath, 'utf8'),
    readFile(aidataPagePath, 'utf8'),
  ]);

  assert.match(portalPage, /Dino Peng — Projects/);
  assert.match(portalPage, /href="\/tptrees\/"/);
  assert.match(portalPage, /href="\/aidata\/"/);
  assert.doesNotMatch(portalPage, /href="\/sporttech\/"/);
  assert.match(aidataPage, /AI 對產業的數據觀察/);
  assert.notEqual(aidataPage, portalPage);
});

test('aidata route includes every relative company logo asset used by the page', async () => {
  assert.equal(existsSync(aidataPagePath), true, 'aidata/index.html should exist');
  const html = await readFile(aidataPagePath, 'utf8');
  const paths = [...html.matchAll(/'([^']*assets\/company-logos\/[^']+)'/g)].map(match => match[1]);

  assert.ok(paths.length >= 7, `expected at least 7 logo paths, got ${paths.length}`);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, aidataRootPath)), true, `${path} should load below /aidata/`);
  }
});

test('project docs identify the portal and /aidata/ as separate public entries', async () => {
  const [readme, updateGuide] = await Promise.all([
    readFile(readmePath, 'utf8'),
    readFile(updateGuidePath, 'utf8'),
  ]);

  assert.match(readme, /https:\/\/dinopeng\.com\//);
  assert.match(readme, /https:\/\/dinopeng\.com\/aidata\//);
  assert.match(updateGuide, /aidata\/index\.html/);
  assert.doesNotMatch(updateGuide, /aidata\/index\.html.*index\.html.*完全同步/);
});
