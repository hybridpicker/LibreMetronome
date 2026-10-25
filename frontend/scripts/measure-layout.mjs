#!/usr/bin/env node
// Layout measurement for LibreMetronome (dev tooling only, not part of the app build).
//
// Serves ./build with a tiny static server, opens it in headless Chrome through
// playwright-core and, for every viewport x view combination, reports how far
// the main page extends below (or beside) the viewport and writes a PNG.
//
//   node scripts/measure-layout.mjs --out /tmp/shots/before
//   node scripts/measure-layout.mjs --out /tmp/shots/after --mode contrast --only 412x805
//   node scripts/measure-layout.mjs --beats 9     # worst case: nine beats per bar
//
// Options:
//   --out DIR        PNG directory (default: scripts/.shots/latest)
//   --mode NAME      normal | contrast | large | colorblind | tritanopia (default: normal)
//                    colorblind is an alias of tritanopia: protanopia and
//                    deuteranopia use the normal blue and need no run of their own
//   --beats N        set beats per bar to N (1-9) in Beat, Grid and every Sequence
//                    circle before measuring (Analog and Polyrhythm are left alone)
//   --only WxH       restrict to one viewport
//   --view NAME      restrict to one view (analog|circle|grid|multi|multi4|polyrhythm)
//   --chrome PATH    Chrome executable (default: macOS Google Chrome)
//   --strict         exit 1 when any case overflows
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(here, '../build');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const outDir = path.resolve(opt('out', path.join(here, '.shots/latest')));
const modeName = opt('mode', 'normal');
const only = opt('only', null);
const onlyView = opt('view', null);
const chromePath = opt('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const strict = args.includes('--strict');
const beats = opt('beats', null) ? parseInt(opt('beats', '0'), 10) : null;

const VIEWPORTS = [
  [412, 805], [393, 780], [360, 740],
  [768, 1024], [1024, 768],
  [1280, 800], [1440, 900]
];
const VIEWS = [
  { id: 'analog', mode: 'Analog' },
  { id: 'circle', mode: 'Beat' },
  { id: 'grid', mode: 'Grid' },
  { id: 'multi', mode: 'Sequence' },
  { id: 'multi4', mode: 'Sequence', circles: 4 },
  { id: 'polyrhythm', mode: 'Polyrhythm' }
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(buildDir, p);
  if (!file.startsWith(buildDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(buildDir, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });

// Everything that is measured runs inside the page.
const measure = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const root = document.documentElement;
  let bottom = 0;
  let right = 0;
  const small = [];
  const tiny = [];
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  for (const el of document.querySelectorAll('.app-container *')) {
    if (el.closest('.sr-only, .skip-link, [aria-hidden="true"][style*="opacity: 0"]')) continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || r.bottom <= vh + 1) {
      bottom = Math.max(bottom, r.bottom);
      right = Math.max(right, r.right);
    } else {
      bottom = Math.max(bottom, r.bottom);
    }
    const interactive = el.matches('button, input, select, a[href], [role="button"], [role="slider"], [role="radio"]');
    if (interactive && el.type !== 'range') {
      // A ::before that extends the hit area counts towards the target size.
      const pb = getComputedStyle(el, '::before');
      let w = r.width;
      let h = r.height;
      if (pb.content !== 'none' && pb.position === 'absolute') {
        const px = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
        const ext = (a, b) => (a === 'auto' || b === 'auto' ? 0 : Math.max(0, -px(a)) + Math.max(0, -px(b)));
        w += ext(pb.left, pb.right);
        h += ext(pb.top, pb.bottom);
      }
      const sz = Math.min(w, h);
      if (sz < 40) small.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}:${Math.round(w)}x${Math.round(h)}`);
    }
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const fs = parseFloat(cs.fontSize);
      if (fs < 12) tiny.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}:${fs}`);
    }
  }
  const docH = Math.max(root.scrollHeight, document.body.scrollHeight);
  const docW = Math.max(root.scrollWidth, document.body.scrollWidth);
  return {
    overflowY: Math.max(0, Math.round(Math.max(docH, bottom) - vh)),
    overflowX: Math.max(0, Math.round(Math.max(docW, right) - vw)),
    small: [...new Set(small)].slice(0, 8),
    tiny: [...new Set(tiny)].slice(0, 8)
  };
};

// Accessibility modes are read from localStorage on start-up.
const MODE_STORAGE = {
  contrast: { 'accessibility-high-contrast': 'true' },
  large: { 'accessibility-large-text': 'true' },
  colorblind: { 'accessibility-color-blind-mode': 'tritanopia' },
  tritanopia: { 'accessibility-color-blind-mode': 'tritanopia' }
};

// Beats per bar: nine chips from 520 px, a stepper below that.
const setBeats = async (page, n) => {
  const chip = page.getByRole('button', { name: `${n} ${n === 1 ? 'beat' : 'beats'} per bar`, exact: true });
  if (await chip.isVisible().catch(() => false)) {
    await chip.click();
  } else {
    const count = async () => parseInt((await page.locator('.stepper-count:visible').first().innerText()).trim(), 10);
    const more = page.getByRole('button', { name: 'More beats per bar', exact: true });
    const fewer = page.getByRole('button', { name: 'Fewer beats per bar', exact: true });
    for (let i = 0; i < 12 && (await count()) !== n; i += 1) {
      await ((await count()) < n ? more : fewer).click();
    }
  }
  await page.waitForTimeout(120);
};

const rows = [];
for (const [w, h] of VIEWPORTS) {
  if (only && only !== `${w}x${h}`) continue;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 1024 });
  const page = await ctx.newPage();
  const storage = MODE_STORAGE[modeName] || {};
  await page.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
  }, storage);
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForSelector('.mode-selector', { timeout: 10000 });
  const count = async () => parseInt((await page.locator('.circle-actions-count').innerText()).trim(), 10);
  for (const view of VIEWS) {
    if (onlyView && onlyView !== view.id) continue;
    await page.getByRole('button', { name: `${view.mode} mode`, exact: true }).click();
    await page.waitForTimeout(250);
    if (view.circles) {
      const add = page.getByRole('button', { name: 'Add rhythm circle' });
      while ((await count()) < view.circles && (await add.isEnabled())) {
        await add.click();
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(250);
    }
    if (beats && view.id !== 'analog' && view.id !== 'polyrhythm') {
      if (view.mode === 'Sequence') {
        const circles = page.locator('.circle-select-button');
        for (let i = 0; i < (await circles.count()); i += 1) {
          await circles.nth(i).click();
          await setBeats(page, beats);
        }
      } else {
        await setBeats(page, beats);
      }
      await page.waitForTimeout(200);
    }
    const m = await page.evaluate(measure);
    const file = `${w}x${h}-${view.id}${beats ? `-b${beats}` : ''}.png`;
    await page.screenshot({ path: path.join(outDir, file) });
    rows.push({ vp: `${w}x${h}`, view: view.id, ...m });
    // Leave Sequence with a single circle again so the next case starts clean.
    if (view.circles) {
      const rm = page.getByRole('button', { name: /^Remove circle/ });
      while ((await count()) > 2 && (await rm.isEnabled())) {
        await rm.click();
        await page.waitForTimeout(60);
      }
    }
  }
  await ctx.close();
}
await browser.close();
server.close();

let bad = 0;
console.log(`mode=${modeName}${beats ? `  beats=${beats}` : ''}  out=${outDir}`);
console.log('viewport   view         overY overX  small-targets / tiny-text');
for (const r of rows) {
  if (r.overflowY > 0 || r.overflowX > 0) bad += 1;
  console.log(`${r.vp.padEnd(10)} ${r.view.padEnd(12)} ${String(r.overflowY).padStart(5)} ${String(r.overflowX).padStart(5)}  ${r.small.join(' ')}${r.tiny.length ? ' | ' + r.tiny.join(' ') : ''}`);
}
console.log(`${rows.length} cases, ${bad} with overflow`);
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(rows, null, 2));
if (strict && bad) process.exit(1);
