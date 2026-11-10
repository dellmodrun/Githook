import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceOrigin = 'https://hatchmind.fun';
const output = fileURLToPath(new URL('../browser-capture/', import.meta.url));
const targets = await fetch('http://127.0.0.1:9335/json/list').then((r) => r.json());
const target = targets.find((item) => item.type === 'page' && item.url.startsWith(sourceOrigin));
if (!target) throw new Error('Hatchmind browser tab was not found on port 9335.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
const responses = new Map();
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
  if (message.method === 'Network.responseReceived') responses.set(message.params.requestId, message.params.response);
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
await cdp('Runtime.enable');
await cdp('Network.enable', { maxTotalBufferSize: 200_000_000, maxResourceBufferSize: 100_000_000 });
await cdp('Network.setCacheDisabled', { cacheDisabled: true });
await cdp('Page.reload', { ignoreCache: true });
await sleep(12_000);

const saved = [];
const failed = [];
for (const [requestId, response] of responses) {
  if (!finished.has(requestId) || !response.url.startsWith(sourceOrigin)) continue;
  const url = new URL(response.url);
  if (response.status >= 400 || url.pathname === '/' || url.pathname.startsWith('/cdn-cgi/')) continue;
  try {
    const result = await cdp('Network.getResponseBody', { requestId });
    if (result.error || !result.result) throw new Error(result.error?.message || 'body unavailable');
    const body = result.result.base64Encoded ? Buffer.from(result.result.body, 'base64') : Buffer.from(result.result.body);
    let path = url.pathname;
    if (path.endsWith('/')) path += 'index.html';
    if (!extname(path)) {
      const contentType = response.mimeType || '';
      if (contentType.includes('javascript')) path += '.js';
      else if (contentType.includes('json')) path += '.json';
      else if (contentType.includes('css')) path += '.css';
    }
    const file = join(output, path.replace(/^\//, ''));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, body);
    saved.push({ url: response.url, path, bytes: body.length, mimeType: response.mimeType });
  } catch (error) {
    failed.push({ url: response.url, error: String(error.message || error) });
  }
}

const domResult = await cdp('Runtime.evaluate', {
  expression: 'document.documentElement.outerHTML',
  returnByValue: true,
});
await writeFile(join(output, 'index.html'), `<!doctype html>${domResult.result.result.value}`);
await writeFile(new URL('../browser-capture-report.json', import.meta.url), `${JSON.stringify({ saved, failed }, null, 2)}\n`);
console.log(`Captured ${saved.length} resources; ${failed.length} unavailable.`);
console.log(JSON.stringify(saved.filter((item) => item.path.includes('/_next/static/chunks/')).map((item) => item.path), null, 2));
socket.close();
