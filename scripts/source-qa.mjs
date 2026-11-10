const url = 'https://hatchmind.fun/';
const targets = await fetch('http://127.0.0.1:9335/json/list').then((r) => r.json());
const target = targets.find((item) => item.type === 'page' && item.url.startsWith('https://hatchmind.fun'));
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
    const call = ++id;
    pending.set(call, resolve);
    socket.send(JSON.stringify({ id: call, method, params }));
  });
}
await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Log.enable');
await cdp('Network.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url });
await new Promise((resolve) => setTimeout(resolve, 7000));
const state = await cdp('Runtime.evaluate', { expression: `JSON.stringify({text:document.body.innerText.length,height:document.documentElement.scrollHeight,stage:document.querySelector('[data-stage]')?.dataset.stage})`, returnByValue: true });
console.log(JSON.stringify({ state: JSON.parse(state.result.result.value), errors, missing }, null, 2));
socket.close();
