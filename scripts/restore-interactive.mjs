import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const reader = 'https://r.jina.ai/http://hatchmind.fun';
const routes = ['/', '/explore', '/scope', '/rooms', '/launch', '/agents', '/agents/research', '/launches', '/trending', '/outreach', '/claim', '/docs', '/agents/automatic', '/how-it-works'];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (all, key) => {
    if (key[0] === '#') {
      const number = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : all;
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" })[key.toLowerCase()] ?? all;
  });
}

function unwrap(html) {
  const match = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
  return match ? decode(match[1]) : html;
}

function cleanCloudflare(html) {
  return html
    .replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?<\/script><iframe[\s\S]*?<\/iframe>/i, '')
    .replaceAll('鈥?', '—')
    .replaceAll('路', '·');
}

async function get(path, format = 'html') {
  let last;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(`${reader}${path}`, {
        headers: { 'X-Return-Format': format, Accept: 'text/html' },
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      last = error;
      await pause(Math.min(20_000, attempt * 3000));
    }
  }
  throw last;
}

const assets = new Set();
for (const route of routes) {
  const raw = cleanCloudflare(await get(route));
  const target = route === '/' ? join(root, 'index.html') : join(root, route.slice(1), 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, raw);
  for (const match of raw.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"'?]+)[^"']*["']/gi)) assets.add(match[1]);
  console.log(`restored ${route}`);
  await pause(500);
}

const failed = [];
for (const asset of [...assets].sort()) {
  const target = join(root, asset.slice(1));
  try {
    const raw = await get(asset);
    const body = ['.js', '.css', '.map', '.json'].includes(extname(asset).toLowerCase()) ? unwrap(raw) : raw;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    console.log(`asset ${asset}`);
    await pause(650);
  } catch (error) {
    failed.push({ asset, error: String(error.message || error) });
    console.error(`failed ${asset}: ${error.message || error}`);
  }
}

await writeFile(new URL('../interactive-report.json', import.meta.url), `${JSON.stringify({ routes, assets: assets.size, failed }, null, 2)}\n`);
console.log(`Interactive restore complete: ${assets.size - failed.length}/${assets.size} assets.`);
