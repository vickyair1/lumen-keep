// Lumen Keep — local static server for play-testing.
// Run:  node serve.ts        then open http://localhost:8080
// The game needs HTTP (ES modules do not run from file://).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, 'game');
const port = Number(process.env.PORT || 8080);

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = normalize(join(gameDir, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!path.startsWith(gameDir)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(port, () => {
  console.log(`Lumen Keep at http://localhost:${port}`);
});
