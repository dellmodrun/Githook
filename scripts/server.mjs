import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../site/', import.meta.url));
const port = Number(process.env.HATCHMIND_PORT || 4392);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const manifestPath = join(root, '__api-manifest.json');
const apiManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const safe = normalize(pathname).replace(/^(?:\.\.[/\\])+/, '');
  const apiKey = `${requestUrl.pathname}${requestUrl.search}`;
  const mapped = apiManifest[apiKey];
  let file = mapped
    ? join(root, mapped.replace(/^[/\\]/, ''))
    : join(root, safe === '/' ? 'index.html' : safe.replace(/^[/\\]/, ''));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) && !extname(file)) file = join(file, 'index.html');
  if (!existsSync(file)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Hatchmind local: http://127.0.0.1:${port}/`));
