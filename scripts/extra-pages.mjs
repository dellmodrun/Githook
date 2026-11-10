import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const reader = 'https://r.jina.ai/http://hatchmind.fun';
const known = new Set(['/', '/explore', '/scope', '/rooms', '/launch', '/agents', '/agents/research', '/launches', '/trending', '/outreach', '/claim', '/docs']);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.name === 'index.html') files.push(path);
  }
  return files;
}

const links = new Set();
for (const file of await walk(root)) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/href=["'](\/[^"'#?]*)/gi)) {
    const path = match[1].replace(/\/$/, '') || '/';
    if (!path.startsWith('/_next') && path !== '/hatch-icon.svg') links.add(path);
  }
}

async function download(path) {
  let last;
  for (let attempt = 1; attempt <= 7; attempt += 1) {
    try {
      const response = await fetch(`${reader}${path}`, {
        headers: { 'X-Return-Format': 'html', Accept: 'text/html' },
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      last = error;
      await wait(attempt * 2500);
    }
  }
  throw last;
}

const failures = [];
for (const path of [...links].sort()) {
  if (known.has(path)) continue;
  const target = join(root, path.replace(/^\//, ''), 'index.html');
  try {
    let html = await download(path);
    html = html
      .replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?<\/script><iframe[\s\S]*?<\/iframe>/i, '')
      .replaceAll('鈥?', '—')
      .replaceAll('路', '·')
      .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/src=["']\/repo-media\/[^"']+["']/gi, '')
      .replace(/<link\b[^>]*href=["']\/hatch-icon\.svg[^"']*["'][^>]*>/gi, '')
      .replace('</head>', '<link rel="icon" href="/hatch-icon.svg"></head>');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
    console.log(`saved ${path}`);
    await wait(900);
  } catch (error) {
    failures.push({ path, error: String(error.message || error) });
    console.error(`failed ${path}: ${error.message || error}`);
  }
}

await writeFile(new URL('../extra-pages-report.json', import.meta.url), `${JSON.stringify({ links: [...links].sort(), failures }, null, 2)}\n`);
console.log(`Extra pages complete: ${links.size - known.size - failures.length} saved, ${failures.length} failed.`);
