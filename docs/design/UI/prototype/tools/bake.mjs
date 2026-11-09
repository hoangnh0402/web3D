// Chạy tools/bake-room.ts trên GPU thật rồi lưu ánh sáng thô. Dùng: node tools/bake.mjs <raw> <đích.bin> [mẫu] [rộng] [cao]
// Ảnh nền cần ba lần dựng: 2800×2400 300 mẫu, BAKE=standin=1 1400×1200 200 mẫu, BAKE=probe=1 256×128 400 mẫu.
// Trước đó build trang dựng: npx vite build --config tools/vite.bake.config.ts
// Sau đó ghép bằng tools/grade-plate.py (cần pip install oidn opencv-python-headless).
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [,, RAW, OUT, SAMPLES = '40', W = '700', H = '600'] = process.argv;
// BAKE là tham số thêm cho trang dựng, ví dụ standin=1 hoặc probe=1
const DIST = path.resolve('dist-tools');
const TYPES = { html: 'text/html', js: 'text/javascript', jpg: 'image/jpeg', png: 'image/png', gltf: 'application/json', bin: 'application/octet-stream', hdr: 'application/octet-stream', webp: 'image/webp' };

const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--disable-gpu-process-crash-limit'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror', e.message.slice(0, 400)));
page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('STEP')) console.log('console', m.text().slice(0, 300)); });
await page.route('http://bake.local/**', route => {
  const url = decodeURIComponent(new URL(route.request().url()).pathname);
  const file = url.startsWith('/raw/') ? path.join(RAW, url.slice(5)) : path.join(DIST, url === '/' ? 'bake.html' : url.slice(1));
  if (!existsSync(file)) return route.fulfill({ status: 404, body: 'missing ' + file });
  return route.fulfill({ status: 200, contentType: TYPES[path.extname(file).slice(1)] ?? 'application/octet-stream', headers: { 'access-control-allow-origin': '*' }, body: readFileSync(file) });
});
await page.goto(`http://bake.local/?w=${W}&h=${H}&${process.env.BAKE ?? ''}`);
await page.waitForFunction(() => document.title === 'ready', null, { timeout: 180000 });
console.log(JSON.stringify(await page.evaluate(() => window.report)));

const started = Date.now();
const watch = setInterval(async () => { console.log('mẫu', await page.evaluate(() => window.progress).catch(() => '?'), Math.round((Date.now() - started) / 1000) + 's'); }, 30000);
const done = await page.evaluate(n => window.bake(n), +SAMPLES);
clearInterval(watch);
console.log(done);
for (const mode of process.env.BAKE?.includes('probe') ? ['color'] : ['color', 'albedo', 'normal', 'depth']) {
  writeFileSync(OUT.replace('.bin', mode === 'color' ? '.bin' : `.${mode}.bin`), Buffer.from(await page.evaluate(m => window.dump(m), mode), 'base64'));
}
await browser.close();
