import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = 'http://127.0.0.1:4392';
const siteRoot = fileURLToPath(new URL('../site/', import.meta.url));
async function pages(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await pages(path));
    else if (entry.name === 'index.html') found.push(path);
  }
  return found;
}
const routes = (await pages(siteRoot)).map((file) => {
  const path = relative(siteRoot, file).split(sep).join('/').replace(/index\.html$/, '').replace(/\/$/, '');
  return path ? `/${path}` : '/';
});
for (const route of routes) {
  const response = await fetch(`${base}${route}`);
  const html = await response.text();
  console.log(`${response.status} ${route} ${html.length} bytes`);
  if (!response.ok || !html.includes('Hatch')) process.exitCode = 1;
}

const target = await fetch('http://127.0.0.1:9333/json/new?' + encodeURIComponent(`${base}/`), { method: 'PUT' }).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
let serial = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
function cdp(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++serial;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
}
await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: `${base}/` });
await new Promise((resolve) => setTimeout(resolve, 3000));
const info = await cdp('Runtime.evaluate', {
  expression: `JSON.stringify({title:document.title, links:document.querySelectorAll('a').length, body:document.body.innerText.slice(0,180), width:document.documentElement.scrollWidth, errors:[...document.querySelectorAll('link[rel=stylesheet]')].filter(x=>!x.sheet).map(x=>x.href)})`,
  returnByValue: true,
});
console.log(info.result.result.value);
const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(new URL('../hatchmind-home.png', import.meta.url), Buffer.from(shot.result.data, 'base64'));
socket.close();
