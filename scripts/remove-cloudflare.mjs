import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(path));
    else if (entry.name === 'index.html') found.push(path);
  }
  return found;
}
let changed = 0;
for (const file of await walk(root)) {
  const original = await readFile(file, 'utf8');
  const cleaned = original
    .replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*style="[^"]*visibility:\s*hidden;?[^"]*"[^>]*><\/iframe>/gi, '');
  if (cleaned !== original) {
    await writeFile(file, cleaned);
    changed += 1;
  }
}
console.log(`Removed Cloudflare challenge from ${changed} pages.`);
