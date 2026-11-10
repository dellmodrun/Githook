import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const page = fileURLToPath(new URL('../site/index.html', import.meta.url));
let html = await readFile(page, 'utf8');
html = html
  .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/src=["']\/repo-media\/[^"']+["']/gi, '')
  .replace('</body>', '<script src="/home-controller.js"></script></body>');
await writeFile(page, html);
console.log('Home animation controller enabled.');
