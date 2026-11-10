import { readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const assetRoot = join(root, '_next', 'static');
const reader = 'https://r.jina.ai/http://hatchmind.fun';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(path));
    else if (/\.(?:js|css)$/.test(entry.name)) found.push(path);
  }
  return found;
}

async function fetchText(path) {
  let last;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(`${reader}${path}`, {
        headers: { 'X-Return-Format': 'text', Accept: 'text/plain' },
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const body = await response.text();
      if (/^(?:Title:|URL Source:|<html)/.test(body)) throw new Error('proxy returned a wrapper');
      return body;
    } catch (error) {
      last = error;
      await sleep(Math.min(20_000, attempt * 2500));
    }
  }
  throw last;
}

const failures = [];
for (const file of await walk(assetRoot)) {
  const path = `/${relative(root, file).replaceAll('\\', '/')}`;
  try {
    const body = await fetchText(path);
    await writeFile(file, body);
    console.log(`repaired ${path}`);
    await sleep(500);
  } catch (error) {
    failures.push({ path, error: String(error.message || error) });
    console.error(`failed ${path}`);
  }
}
console.log(`Asset repair complete; ${failures.length} failed.`);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
