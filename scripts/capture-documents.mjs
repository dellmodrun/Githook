import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const origin = 'https://hatchmind.fun';
const root = fileURLToPath(new URL('../site/', import.meta.url));
const report = JSON.parse(await readFile(new URL('../browser-full-report.json', import.meta.url), 'utf8'));
const targets = await fetch('http://127.0.0.1:9335/json/list').then((r) => r.json());
const target = targets.find((item) => item.type === 'page' && item.url.startsWith(origin));
if (!target) throw new Error('Hatchmind browser tab not found.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
let documentRequest = null;
const finished = new Set();
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
  if (message.method === 'Network.responseReceived' && message.params.type === 'Document' && message.params.response.url.startsWith(origin)) {
    documentRequest = { id: message.params.requestId, url: message.params.response.url, status: message.params.response.status };
  }
  if (message.method === 'Network.loadingFinished') finished.add(message.params.requestId);
});
function cdp(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++sequence;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await cdp('Page.enable');
await cdp('Network.enable', { maxTotalBufferSize: 100_000_000, maxResourceBufferSize: 50_000_000 });
await cdp('Network.setCacheDisabled', { cacheDisabled: true });

let saved = 0;
for (const route of report.routes) {
  documentRequest = null;
  await cdp('Page.navigate', { url: `${origin}${route}` });
  for (let attempt = 0; attempt < 40 && (!documentRequest || !finished.has(documentRequest.id)); attempt += 1) await sleep(100);
  if (!documentRequest || documentRequest.status >= 400) {
    console.error(`missing document ${route}`);
    continue;
  }
  const result = await cdp('Network.getResponseBody', { requestId: documentRequest.id });
  if (result.error || !result.result) {
    console.error(`unavailable document ${route}`);
    continue;
  }
  let html = result.result.base64Encoded ? Buffer.from(result.result.body, 'base64').toString('utf8') : result.result.body;
  html = html.replace(/<script>\(function\(\)\{function c\(\)[\s\S]*?<\/script>/gi, '');
  const clean = route.split('?')[0];
  const file = clean === '/' ? join(root, 'index.html') : join(root, clean.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  saved += 1;
  console.log(`document ${saved}: ${route}`);
}
console.log(`Captured ${saved}/${report.routes.length} initial documents.`);
socket.close();
