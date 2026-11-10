import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestFile = join(root, 'backup-manifest.json');
async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (path === manifestFile) continue;
    if (entry.isDirectory()) found.push(...await walk(path));
    else found.push(path);
  }
  return found;
}
const files = [];
for (const file of await walk(root)) {
  const data = await readFile(file);
  const info = await stat(file);
  files.push({
    path: relative(root, file).replaceAll('\\', '/'),
    bytes: info.size,
    sha256: createHash('sha256').update(data).digest('hex'),
  });
}
await writeFile(manifestFile, `${JSON.stringify({
  project: 'Hatchmind local complete backup',
  createdAt: new Date().toISOString(),
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  files,
}, null, 2)}\n`);
console.log(`Manifest: ${files.length} files.`);
