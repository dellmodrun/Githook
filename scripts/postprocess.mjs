import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%230d1420'/%3E%3Ccircle cx='400' cy='220' r='92' fill='none' stroke='%2388a8dc' stroke-width='2' opacity='.38'/%3E%3Cpath d='M356 217l30 18 33-22 30 17c-4 42-25 67-49 67s-45-25-44-80zm21-20c5-25 16-42 25-42 11 0 22 14 28 36l-19-8-14 13-14-10z' fill='%23d9e6ff' opacity='.82'/%3E%3C/svg%3E`;

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.name === 'index.html') files.push(path);
  }
  return files;
}

for (const file of await walk(root)) {
  let html = await readFile(file, 'utf8');
  html = html
    .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/src=["']\/repo-media\/[^"']+["']/gi, `src="${placeholder}"`)
    .replace(/<link\b[^>]*href=["']\/hatch-icon\.svg[^"']*["'][^>]*>/gi, '')
    .replace('</head>', '<link rel="icon" href="/hatch-icon.svg"></head>');
  await writeFile(file, html);
}

console.log('Prepared static local pages.');
