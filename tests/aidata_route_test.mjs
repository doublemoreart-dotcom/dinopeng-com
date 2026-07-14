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
  const paths = [...html.matchAll(/src="(assets\/(?:ai-industry-data-observation|industry-adoption|investment-productivity|industry-impact|adoption-stages|industry-clusters|hybrid-talent|hybrid-influence)-hero(?:-dark)?\.svg)"/g)].map(match => match[1]);

  assert.deepEqual(paths.sort(), [
    'assets/adoption-stages-hero-dark.svg',
    'assets/adoption-stages-hero.svg',
    'assets/ai-industry-data-observation-hero-dark.svg',
    'assets/ai-industry-data-observation-hero.svg',
    'assets/hybrid-influence-hero-dark.svg',
    'assets/hybrid-influence-hero.svg',
    'assets/hybrid-talent-hero-dark.svg',
    'assets/hybrid-talent-hero.svg',
    'assets/industry-adoption-hero-dark.svg',
    'assets/industry-adoption-hero.svg',
    'assets/industry-clusters-hero-dark.svg',
    'assets/industry-clusters-hero.svg',
    'assets/industry-impact-hero-dark.svg',
    'assets/industry-impact-hero.svg',
    'assets/investment-productivity-hero-dark.svg',
    'assets/investment-productivity-hero.svg',
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

test('industry adoption visual theme rules override the generic image display rule', async () => {
  const html = await readFile(rootPagePath, 'utf8');

  assert.match(html, /id="industry-adoption"[\s\S]*class="section-visual"/);
  assert.match(html, /\.section-visual img \{[^}]*display: block;/);
  assert.match(html, /\.section-visual \.section-visual-image-dark \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.section-visual \.section-visual-image-light \{ display: none; \}/);
  assert.match(html, /:root\[data-theme="dark"\] \.section-visual \.section-visual-image-dark \{ display: block; \}/);
});

test('investment productivity visual is placed in its analysis section', async () => {
  const html = await readFile(rootPagePath, 'utf8');

  assert.match(html, /id="investment-productivity"[\s\S]*src="assets\/investment-productivity-hero\.svg"/);
  assert.match(html, /id="investment-productivity"[\s\S]*src="assets\/investment-productivity-hero-dark\.svg"/);
});

test('industry impact visual is placed in its analysis section', async () => {
  const html = await readFile(rootPagePath, 'utf8');

  assert.match(html, /id="industry-impact"[\s\S]*src="assets\/industry-impact-hero\.svg"/);
  assert.match(html, /id="industry-impact"[\s\S]*src="assets\/industry-impact-hero-dark\.svg"/);
});

test('adoption stages visual is placed in its analysis section', async () => {
  const html = await readFile(rootPagePath, 'utf8');

  assert.match(html, /id="adoption-stages"[\s\S]*src="assets\/adoption-stages-hero\.svg"/);
  assert.match(html, /id="adoption-stages"[\s\S]*src="assets\/adoption-stages-hero-dark\.svg"/);
});

test('industry clusters visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(rootPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/industry-clusters-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/industry-clusters-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="industry-clusters"[\s\S]*src="assets\/industry-clusters-hero\.svg"/);
  assert.match(html, /id="industry-clusters"[\s\S]*src="assets\/industry-clusters-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('hybrid talent visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(rootPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/hybrid-talent-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/hybrid-talent-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="hybrid-talent"[\s\S]*src="assets\/hybrid-talent-hero\.svg"/);
  assert.match(html, /id="hybrid-talent"[\s\S]*src="assets\/hybrid-talent-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
});

test('hybrid influence visual is placed in its analysis section and has no visible text nodes', async () => {
  const html = await readFile(rootPagePath, 'utf8');
  const [lightSvg, darkSvg] = await Promise.all([
    readFile(new URL('../assets/hybrid-influence-hero.svg', import.meta.url), 'utf8'),
    readFile(new URL('../assets/hybrid-influence-hero-dark.svg', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /id="hybrid-influence"[\s\S]*src="assets\/hybrid-influence-hero\.svg"/);
  assert.match(html, /id="hybrid-influence"[\s\S]*src="assets\/hybrid-influence-hero-dark\.svg"/);
  assert.doesNotMatch(lightSvg, /<text\b/);
  assert.doesNotMatch(darkSvg, /<text\b/);
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
