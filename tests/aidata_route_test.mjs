import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rootPagePath = new URL('../index.html', import.meta.url);
const aidataPagePath = new URL('../aidata/index.html', import.meta.url);
const aidataRootPath = new URL('../aidata/', import.meta.url);
const readmePath = new URL('../README.md', import.meta.url);
const updateGuidePath = new URL('../DATA_UPDATE.md', import.meta.url);

test('aidata route publishes the same page as the root entry', async () => {
  assert.equal(existsSync(aidataPagePath), true, 'aidata/index.html should exist');

  const [rootPage, aidataPage] = await Promise.all([
    readFile(rootPagePath, 'utf8'),
    readFile(aidataPagePath, 'utf8'),
  ]);

  assert.equal(aidataPage, rootPage, 'aidata/index.html should stay byte-identical to index.html');
});

test('aidata route includes every relative company logo asset used by the page', async () => {
  const html = await readFile(rootPagePath, 'utf8');
  const paths = [...html.matchAll(/'([^']*assets\/company-logos\/[^']+)'/g)].map(match => match[1]);

  assert.ok(paths.length >= 7, `expected at least 7 logo paths, got ${paths.length}`);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, aidataRootPath)), true, `${path} should load below /aidata/`);
  }
});

test('aidata route includes the hero visual asset used by the page', async () => {
  const html = await readFile(rootPagePath, 'utf8');
  const paths = [...html.matchAll(/src="(assets\/ai-industry-data-observation-hero(?:-dark)?\.svg)"/g)].map(match => match[1]);

  assert.deepEqual(paths.sort(), [
    'assets/ai-industry-data-observation-hero-dark.svg',
    'assets/ai-industry-data-observation-hero.svg',
  ]);
  for (const path of paths) {
    assert.equal(existsSync(new URL(path, new URL('../', import.meta.url))), true, `${path} should exist below root`);
    assert.equal(existsSync(new URL(path, aidataRootPath)), true, `${path} should load below /aidata/`);
  }
});

test('hero visual theme rules override the generic image display rule', async () => {
  const html = await readFile(rootPagePath, 'utf8');

  assert.match(html, /\.hero-visual img \{[^}]*display: block;/);
  assert.match(html, /\.hero-visual \.hero-visual-image-dark \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.hero-visual \.hero-visual-image-light \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.hero-visual \.hero-visual-image-dark \{ display: block; \}/);
});

test('project docs identify /aidata/ as the public project URL and require route sync', async () => {
  const [readme, updateGuide] = await Promise.all([
    readFile(readmePath, 'utf8'),
    readFile(updateGuidePath, 'utf8'),
  ]);

  assert.match(readme, /https:\/\/dinopeng\.com\/aidata\//);
  assert.match(updateGuide, /aidata\/index\.html/);
  assert.match(updateGuide, /index\.html.*同步|同步.*index\.html/);
});
