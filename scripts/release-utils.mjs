import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const projectRoot = new URL('../', import.meta.url);
export const projectRootPath = fileURLToPath(projectRoot);

export function rootPath(...parts) {
  return path.join(projectRootPath, ...parts);
}

export async function readText(relativePath) {
  return readFile(rootPath(relativePath), 'utf8');
}

export async function readBuffer(relativePath) {
  return readFile(rootPath(relativePath));
}

export function extractMeta(html, name) {
  const pattern = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i');
  const match = html.match(pattern);
  if (!match) {
    throw new Error(`Missing meta[name="${name}"]`);
  }
  return match[1];
}

export function dateSnapshotName(versionDate) {
  return `ai_industry_penetration_${versionDate}.html`;
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function fileSha256(relativePath) {
  return sha256(await readBuffer(relativePath));
}

export async function assertSameFile(left, right) {
  const [leftBuffer, rightBuffer] = await Promise.all([
    readBuffer(left),
    readBuffer(right),
  ]);
  if (!leftBuffer.equals(rightBuffer)) {
    throw new Error(`${left} and ${right} are not byte-identical`);
  }
}

export async function listDateSnapshots() {
  const entries = await readdir(projectRootPath);
  return entries
    .filter((name) => /^ai_industry_penetration_\d{4}-\d{2}-\d{2}\.html$/.test(name))
    .sort();
}

export async function listFilesRecursive(relativeDir) {
  const base = rootPath(relativeDir);
  if (!existsSync(base)) return [];

  const results = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
    results.push(path.relative(projectRootPath, fullPath));
      }
    }
  }
  await walk(base);
  return results.sort();
}

export async function assertNoZeroByteFiles(relativeDir) {
  const files = await listFilesRecursive(relativeDir);
  for (const file of files) {
    const info = await stat(rootPath(file));
    if (info.size === 0) {
      throw new Error(`${file} is zero bytes`);
    }
  }
}

export function extractCompanyLogoPaths(html) {
  return [...new Set([...html.matchAll(/assets\/company-logos\/[^'"`)]+/g)].map((match) => match[0]))].sort();
}

export function checkInlineScripts(html, fileLabel) {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
  for (const [index, code] of scripts.entries()) {
    try {
      new Function(code);
    } catch (error) {
      throw new Error(`${fileLabel} inline script ${index + 1} is invalid: ${error.message}`);
    }
  }
  return scripts.length;
}

export function requireFile(relativePath) {
  if (!existsSync(rootPath(relativePath))) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}
