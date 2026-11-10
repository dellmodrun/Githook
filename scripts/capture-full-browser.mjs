import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceOrigin = 'https://hatchmind.fun';
const output = fileURLToPath(new URL('../browser-site/', import.meta.url));
const targets = await fetch('http://127.0.0.1:9335/json/list').then((r) => r.json());
const target = targets.find((item) => item.type === 'page' && item.url.startsWith(sourceOrigin));
if (!target) throw new Error('Open Hatchmind tab not found.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

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
const routeQueue = ['/', '/explore', '/scope', '/rooms', '/launch', '/agents', '/agents/automatic', '/agents/research', '/launches', '/trending', '/outreach', '/claim', '/docs', '/how-it-works'];
const queued = new Set(routeQueue);
const visited = new Set();
const capturedRequests = new Set();
const apiManifest = {};
const assets = [];
const failures = [];

function routeFile(route) {
  const clean = route.split('?')[0];
  return clean === '/' ? join(output, 'index.html') : join(output, clean.replace(/^\//, ''), 'index.html');
}

async function saveNewResponses() {
  for (const [requestId, response] of responses) {
    if (capturedRequests.has(requestId) || !finished.has(requestId) || !response.url.startsWith(sourceOrigin)) continue;
    capturedRequests.add(requestId);
    const url = new URL(response.url);
    if (response.status >= 400 || url.pathname.startsWith('/cdn-cgi/') || response.mimeType === 'text/html') continue;
    try {
      const result = await cdp('Network.getResponseBody', { requestId });
      if (result.error || !result.result) throw new Error(result.error?.message || 'body unavailable');
      const body = result.result.base64Encoded ? Buffer.from(result.result.body, 'base64') : Buffer.from(result.result.body);
      let path;
      if (url.pathname.startsWith('/api/')) {
        const hash = createHash('sha1').update(`${url.pathname}${url.search}`).digest('hex');
        path = `/__responses/${hash}.json`;
        apiManifest[`${url.pathname}${url.search}`] = path;
      } else {
        path = url.pathname;
        if (path.endsWith('/')) path += 'index.html';
        if (!extname(path)) path += response.mimeType.includes('json') ? '.json' : '';
      }
      const file = join(output, path.replace(/^\//, ''));
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, body);
      assets.push({ url: response.url, path, bytes: body.length, mimeType: response.mimeType });
    } catch (error) {
      failures.push({ url: response.url, error: String(error.message || error) });
    }
  }
}

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Network.enable', { maxTotalBufferSize: 500_000_000, maxResourceBufferSize: 150_000_000 });
await cdp('Network.setCacheDisabled', { cacheDisabled: true });

while (routeQueue.length && visited.size < 120) {
  const route = routeQueue.shift();
  if (visited.has(route)) continue;
  visited.add(route);
  await cdp('Page.navigate', { url: `${sourceOrigin}${route}` });
  await sleep(4000);
  await cdp('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight)' });
  await sleep(1000);
  await cdp('Runtime.evaluate', { expression: 'window.scrollTo(0, 0)' });
  const result = await cdp('Runtime.evaluate', {
    expression: `JSON.stringify({html:document.documentElement.outerHTML,links:[...document.querySelectorAll('a[href]')].map(a=>a.href),title:document.title,text:document.body.innerText.length})`,
    returnByValue: true,
  });
  const page = JSON.parse(result.result.result.value);
  const file = routeFile(route);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `<!doctype html>${page.html}`);
  for (const href of page.links) {
    try {
      const url = new URL(href);
      if (url.origin !== sourceOrigin) continue;
      const path = url.pathname.replace(/\/$/, '') || '/';
      if (/^\/(?:api|_next|repo-media|fonts|cdn-cgi)\//.test(path)) continue;
      if (!queued.has(path)) {
        queued.add(path);
        routeQueue.push(path);
      }
    } catch {}
  }
  await saveNewResponses();
  console.log(`page ${visited.size}: ${route} (${page.text} text chars, queue ${routeQueue.length})`);
}

await saveNewResponses();
await writeFile(join(output, '__api-manifest.json'), `${JSON.stringify(apiManifest, null, 2)}\n`);
await writeFile(new URL('../browser-full-report.json', import.meta.url), `${JSON.stringify({ routes: [...visited], assets, failures, apiManifest }, null, 2)}\n`);
console.log(`Complete: ${visited.size} pages, ${assets.length} responses, ${failures.length} failures.`);
socket.close();
