import { writeFile } from 'node:fs/promises';

const url = 'http://127.0.0.1:4392/';
const target = await fetch('http://127.0.0.1:9333/json/new?' + encodeURIComponent(url), { method: 'PUT' }).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const errors = [];
const missing = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) missing.push(`${message.params.response.status} ${message.params.response.url}`);
});
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
function cdp(method, params = {}) {
  return new Promise((resolve) => {
    const callId = ++id;
    pending.set(callId, resolve);
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Log.enable');
await cdp('Network.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url });
await sleep(1200);
async function state() {
  const result = await cdp('Runtime.evaluate', {
    expression: `JSON.stringify({stage:document.querySelector('[data-stage]')?.getAttribute('data-stage'), hydrated:document.documentElement.outerHTML.includes('vinext'), scripts:document.scripts.length, text:document.querySelector('.hs-caption strong')?.textContent, bodyText:document.body.innerText.length, height:document.documentElement.scrollHeight})`,
    returnByValue: true,
  });
  return JSON.parse(result.result.result.value);
}
const first = await state();
await sleep(2600);
const second = await state();
await sleep(2600);
const third = await state();
const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(new URL('../hatchmind-interactive.png', import.meta.url), Buffer.from(shot.result.data, 'base64'));
console.log(JSON.stringify({ first, second, third, errors, missing }, null, 2));
socket.close();
