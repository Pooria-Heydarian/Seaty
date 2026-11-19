// Cache-busting for the live site. GitHub Pages lets browsers keep every file for 10 minutes, so after a publish
// visitors could still run old code (or a mix of old and new modules). This gives every page's local modules a
// version tag (?v=<hash of all web/*.js>): when any code changes, the tag changes and browsers fetch everything fresh.
// Runs as part of `npm run report` (the daily publish); run `npm run stamp` by hand before pushing other code changes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const WEB = path.join(process.cwd(), 'web');
const modules = fs.readdirSync(WEB).filter((f) => f.endsWith('.js')).sort();
const hash = crypto.createHash('sha1');
for (const f of modules) hash.update(f).update(fs.readFileSync(path.join(WEB, f)));
const v = hash.digest('hex').slice(0, 10);

let changed = 0;
for (const page of fs.readdirSync(WEB).filter((f) => f.endsWith('.html'))) {
  const file = path.join(WEB, page);
  const before = fs.readFileSync(file, 'utf8');
  let html = before.replace(/<script type="importmap">([\s\S]*?)<\/script>/, (whole, body) => {
    const map = JSON.parse(body);
    const imports = Object.fromEntries(Object.entries(map.imports || {}).filter(([k]) => !k.startsWith('./')));
    for (const m of modules) imports[`./${m}`] = `./${m}?v=${v}`;
    return `<script type="importmap">\n    ${JSON.stringify({ imports }, null, 2).replace(/\n/g, '\n    ')}\n  </script>`;
  });
  // the page's own entry module
  html = html.replace(/(<script type="module" src=")([\w-]+\.js)(?:\?v=\w+)?(")/g, `$1$2?v=${v}$3`);
  if (html !== before) { fs.writeFileSync(file, html); changed++; }
}
console.log(`stamp: v=${v} (${changed} page${changed === 1 ? '' : 's'} updated)`);
