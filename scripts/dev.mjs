// Dev server with live reload: `npm run dev`, then open http://localhost:8000 (or /tests.html).
// - src/ changes rebuild the bundles in memory and reload the page; CSS changes are swapped in without
//   a reload; index.html / tests.html changes reload; build errors show as an overlay on the page.
// - Nothing is written to disk: dist/ (the committed player build) is untouched, and the reload script
//   is only added to pages as they are served.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || process.argv.find(a => a.startsWith('--port='))?.slice(7) || 8000);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json',
                '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// ---------- Live-reload client (added to every HTML page we serve) ----------
const CLIENT = `<script>
(() => {
  const events = new EventSource('/__dev/events');
  events.addEventListener('reload', () => location.reload());
  events.addEventListener('css', () => {               // new styles without losing the game state
    for (const link of document.querySelectorAll('link[rel=stylesheet]')) {
      const url = new URL(link.href); url.searchParams.set('t', Date.now()); link.href = url;
    }
  });
  events.addEventListener('builderror', e => {
    let box = document.getElementById('__dev_error');
    if (!box) {
      box = document.createElement('pre');
      box.id = '__dev_error';
      box.style.cssText = 'position:fixed;inset:12px;z-index:99999;margin:0;padding:16px;overflow:auto;' +
        'background:rgba(120,0,0,.94);color:#fff;font:13px/1.45 ui-monospace,monospace;border-radius:10px;white-space:pre-wrap';
      document.body.append(box);
    }
    box.textContent = 'Build failed — fix the error and save:\\n\\n' + e.data;
  });
})();
</script>`;

// ---------- Server-sent events: one stream per open page ----------
const clients = new Set();
function notify(event, data = '') {
  const payload = `event: ${event}\ndata: ${String(data).replace(/\n/g, '\ndata: ')}\n\n`;
  for (const res of clients) res.write(payload);
}

// ---------- In-memory builds (same as npm run build, but unminified for easier debugging) ----------
const memory = new Map();             // '/dist/game.js' -> contents
const errors = [null, null];          // per build: the formatted error, or null
let lastError = null;
let reloadTimer = null;
const builds = [
  { entryPoints: ['src/index.js'], outfile: 'dist/game.js' },
  { entryPoints: ['tests/tests.js'], outfile: 'dist/tests.js' },
];
const contexts = await Promise.all(builds.map((b, i) => esbuild.context({
  ...b, absWorkingDir: ROOT, bundle: true, format: 'iife', target: 'es2020', sourcemap: true, write: false, logLevel: 'silent',
  plugins: [{
    name: 'live-reload',
    setup(build) {
      build.onEnd(result => {
        errors[i] = result.errors.length
          ? esbuild.formatMessagesSync(result.errors, { kind: 'error', color: false }).join('\n') : null;
        if (!errors[i]) {
          for (const f of result.outputFiles) memory.set('/' + path.relative(ROOT, f.path).split(path.sep).join('/'), f.contents);
        }
        // A change to src/ rebuilds both bundles: wait a moment so pages reload (or show the error) once.
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          lastError = errors.find(Boolean) || null;
          if (lastError) {
            console.log(`✘ build failed\n${lastError}`);
            notify('builderror', lastError);
          } else {
            console.log(`✔ rebuilt ${new Date().toLocaleTimeString()}`);
            notify('reload');
          }
        }, 60);
      });
    },
  }],
})));
await Promise.all(contexts.map(c => c.watch()));

// ---------- Static files and pages ----------
fs.watch(path.join(ROOT, 'css'), { recursive: true }, () => notify('css'));
for (const page of ['index.html', 'tests.html']) fs.watch(path.join(ROOT, page), () => notify('reload'));

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/__dev/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 500\n\n');
    if (lastError) res.write(`event: builderror\ndata: ${lastError.replace(/\n/g, '\ndata: ')}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  const headers = type => ({ 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  if (memory.has(url)) {                                 // the live, in-memory bundle
    res.writeHead(200, headers(TYPES[path.extname(url)]));
    return res.end(memory.get(url));
  }
  const file = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, headers('text/plain'));
    return res.end('Not found');
  }
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  if (type === 'text/html') {
    res.writeHead(200, headers(type));
    return res.end(fs.readFileSync(file, 'utf8').replace('</body>', `${CLIENT}\n</body>`));
  }
  res.writeHead(200, headers(type));
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Road Crossing dev server: http://localhost:${PORT}   (tests: http://localhost:${PORT}/tests.html)`);
  console.log('Watching src/, tests/, css/ and the HTML pages. Press Ctrl+C to stop.');
});
