import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const origin = 'https://hatchmind.fun';
const reader = 'https://r.jina.ai/http://hatchmind.fun';
const output = fileURLToPath(new URL('../site/', import.meta.url));
const routes = [
  '/', '/explore', '/scope', '/rooms', '/launch', '/agents',
  '/agents/research', '/launches', '/trending', '/outreach', '/claim', '/docs',
];
const queue = routes.map((path) => ({ path, page: true }));
const seen = new Set();
const failed = [];

const entities = new Map([
  ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"], ['#39', "'"],
]);

function decodeHtml(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (all, key) => {
    if (key[0] === '#') {
      const numeric = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : all;
    }
    return entities.get(key.toLowerCase()) ?? all;
  });
}

function unwrapPre(html) {
  const match = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
  return match ? decodeHtml(match[1]) : html;
}

function cleanPage(html) {
  return html
    .replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?<\/script><iframe[\s\S]*?<\/iframe>/i, '')
    .replaceAll('鈥?', '—')
    .replaceAll('路', '·');
}

function localPath(ref, base = '/') {
  if (!ref || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(ref)) return null;
  let url;
  try { url = new URL(ref, `${origin}${base}`); } catch { return null; }
  if (url.origin !== origin) return null;
  url.hash = '';
  url.search = '';
  if (/^\/(?:api|rpc|cdn-cgi)\//.test(url.pathname)) return null;
  return url.pathname || '/';
}

function destination(path, page) {
  if (page) return path === '/' ? join(output, 'index.html') : join(output, path, 'index.html');
  return join(output, path.replace(/^\//, ''));
}

function refsFrom(text, base) {
  const refs = new Set();
  const patterns = [
    /(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi,
    /\b(?:import|from)\s*(?:\(\s*)?["']([^"']+)["']/g,
    /new\s+URL\(\s*["']([^"']+)["']/g,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /["'`](\/_next\/static\/[^"'`?#\s)]+)["'`]/g,
    /["'`](\/(?:images|fonts|assets)\/[^"'`?#\s)]+)["'`]/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const path = localPath(match[1], base);
      if (path) refs.add(path);
    }
  }
  return refs;
}

async function fetchReader(path) {
  const response = await fetch(`${reader}${path}`, {
    headers: { 'X-Return-Format': 'html', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

while (queue.length) {
  const item = queue.shift();
  const key = `${item.page ? 'page' : 'asset'}:${item.path}`;
  if (seen.has(key)) continue;
  seen.add(key);
  try {
    const raw = await fetchReader(item.path);
    const extension = extname(item.path).toLowerCase();
    const textual = item.page || ['.js', '.css', '.json', '.svg', '.txt', '.map'].includes(extension);
    let body = textual && !item.page ? unwrapPre(raw) : raw;
    if (item.page) body = cleanPage(body);
    const target = destination(item.path, item.page);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    if (textual) {
      for (const ref of refsFrom(body, item.path)) {
        const isRoute = routes.includes(ref);
        if (isRoute) continue;
        const ext = extname(ref).toLowerCase();
        if (ext || ref.startsWith('/_next/')) queue.push({ path: ref, page: false });
      }
    }
    console.log(`saved ${item.page ? 'page ' : 'asset'} ${item.path}`);
  } catch (error) {
    failed.push({ ...item, error: String(error.message || error) });
    console.error(`failed ${item.path}: ${error.message || error}`);
  }
}

await writeFile(new URL('../mirror-report.json', import.meta.url), `${JSON.stringify({
  source: origin,
  mirroredAt: new Date().toISOString(),
  pages: routes,
  saved: seen.size - failed.length,
  failed,
}, null, 2)}\n`);
console.log(`Finished: ${seen.size - failed.length} saved, ${failed.length} failed.`);
