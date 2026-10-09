import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname } from 'node:path';
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.css': 'text/css' };
createServer(async (q, r) => { const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  try { const b = await readFile(p); r.writeHead(200, { 'content-type': T[extname(p)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end('no'); } }).listen(+process.argv[2]);
