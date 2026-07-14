import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../aidata/index.html', import.meta.url), 'utf8');
const htmlWithoutStyles = html.replace(/<style[\s\S]*?<\/style>/gi, '');
const scriptBlocks = [...htmlWithoutStyles.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const scriptStringLiterals = scriptBlocks.flatMap(([, script]) =>
  [...script.matchAll(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/gs)]
    .map(([literal]) => literal.slice(1, -1)),
);
const dynamicReaderCopy = scriptStringLiterals.flatMap(literal => {
  if (/<[a-z][\s\S]*?>/i.test(literal)) {
    const visibleText = literal
      .replace(/<[^>]*>/g, ' ')
      .replace(/\$\{[^}]*\}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return visibleText ? [visibleText] : [];
  }

  return /[\u3400-\u9fff]/u.test(literal) ? [literal] : [];
});
const readerHtml = htmlWithoutStyles
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const copyCorpus = `${readerHtml}\n${dynamicReaderCopy.join('\n')}`;

test('reader-facing copy excludes implementation and maintenance language', () => {
  const forbidden = [
    '新增 CSV',
    'tooltip',
    'KPI 抽屜',
    '請先將程式中的 reportEmail',
    '新增來源用法',
    '後續若要改圖表',
    '本區把新增',
  ];

  const found = forbidden.filter(phrase => copyCorpus.includes(phrase));
  assert.deepEqual(found, [], `unexpected reader-facing phrases: ${found.join(', ')}`);
});

test('interactive sections explain how readers can use them', () => {
  const required = [
    '下拉選單',
    '將游標移至長條',
    '點擊卡片',
    '右上角',
    '泡泡大小',
    '星級代表影響深度',
    '雷達圖代表五項能力的相對需求',
    '引用與比較提醒',
  ];

  const missing = required.filter(phrase => !readerHtml.includes(phrase));
  assert.deepEqual(missing, [], `missing reader guidance: ${missing.join(', ')}`);
});

test('copy preserves estimation and methodology qualifiers', () => {
  const required = ['2025 年分析估計', '不直接混用', '2030 年估計', '使用率不等於規模化部署'];
  const missing = required.filter(phrase => !readerHtml.includes(phrase));
  assert.deepEqual(missing, [], `missing qualifiers: ${missing.join(', ')}`);
});

test('analysis framing uses neutral summary and evaluation language', () => {
  const forbidden = [
    '本週觀察',
    '本週值得注意的變化',
    '本週主要觀察',
    '核心洞察',
    '下一步觀察',
    '後續觀察',
    '分榜觀察',
    '真正值得追蹤的是',
  ];
  const required = ['重點摘要', '資料摘要', '主要結論', '後續評估', '分榜比較'];

  const found = forbidden.filter(phrase => copyCorpus.includes(phrase));
  const missing = required.filter(phrase => !copyCorpus.includes(phrase));
  assert.deepEqual(found, [], `subjective or time-bound framing remains: ${found.join(', ')}`);
  assert.deepEqual(missing, [], `missing neutral framing: ${missing.join(', ')}`);
});
