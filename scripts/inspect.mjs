const target = process.argv[2] || 'https://hatchmind.fun/';
const tabs = await fetch('http://127.0.0.1:9333/json').then((response) => response.json());
const tab = tabs.find((item) => item.type === 'page');
if (!tab) throw new Error('No Chrome debugging tab is available');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
};
const call = (method, params = {}) => new Promise((resolve) => {
  const id = ++nextId;
  pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});
await call('Page.enable');
await call('Runtime.enable');
await call('Page.navigate', { url: target });
await new Promise((resolve) => setTimeout(resolve, 12000));
const evaluated = await call('Runtime.evaluate', {
  expression: `JSON.stringify({
    url: location.href,
    title: document.title,
    html: document.documentElement.outerHTML,
    text: document.body?.innerText?.slice(0, 5000) || '',
    links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
    resources: performance.getEntriesByType('resource').map((entry) => entry.name)
  })`,
  returnByValue: true,
});
console.log(evaluated.result.result.value);
socket.close();
