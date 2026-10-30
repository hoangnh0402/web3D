// Chuyển FBX sang GLB thô bằng trang tools/index.html. Dùng: node tools/convert.mjs <raw> <glb_out>
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [,, RAW, OUT] = process.argv;
mkdirSync(OUT, { recursive: true });
// Biểu cảm theo ARKit và khẩu hình theo viseme. Bỏ phần còn lại để giảm dung lượng.
const KEEP = [
  'AK_01_BrowDownLeft', 'AK_02_BrowDownRight', 'AK_03_BrowInnerUp', 'AK_04_BrowOuterUpLeft', 'AK_05_BrowOuterUpRight',
  'AK_07_CheekSquintLeft', 'AK_08_CheekSquintRight', 'AK_09_EyeBlinkLeft', 'AK_10_EyeBlinkRight',
  'AK_19_EyeSquintLeft', 'AK_20_EyeSquintRight', 'AK_21_EyeWideLeft', 'AK_22_EyeWideRight', 'AK_25_JawOpen',
  'AK_28_MouthDimpleLeft', 'AK_29_MouthDimpleRight', 'AK_30_MouthFrownLeft', 'AK_31_MouthFrownRight',
  'AK_36_MouthPressLeft', 'AK_37_MouthPressRight', 'AK_44_MouthSmileLeft', 'AK_45_MouthSmileRight',
  'VI_01_PP', 'VI_02_FF', 'VI_04_DD', 'VI_07_SS', 'VI_08_nn', 'VI_10_aa', 'VI_11_E', 'VI_12_I', 'VI_13_O', 'VI_14_U',
];
const tool = path.resolve('dist-tools/index.html');

const browser = await chromium.launch({ channel: process.env.BROWSER ?? 'chrome', headless: true });
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror', e.message.slice(0, 300)));
await page.goto(pathToFileURL(tool).href);
await page.waitForFunction(() => document.title === 'ready');

for (const key of readdirSync(`${RAW}/avatars`)) {
  const b64 = readFileSync(`${RAW}/avatars/${key}/model.fbx`).toString('base64');
  const r = await page.evaluate(([b, k]) => window.convertAvatar(b, k), [b64, KEEP]);
  writeFileSync(`${OUT}/${key}.glb`, Buffer.from(r.glb, 'base64'));
  console.log(key, 'height', Math.round(r.size[1]), 'KB', Math.round(r.glb.length * .75 / 1024), JSON.stringify(r.report.map(m => m.mats)));
}
for (const sex of readdirSync(`${RAW}/clips`)) {
  const dir = `${RAW}/clips/${sex}`;
  const files = readdirSync(dir).map(f => ({ name: f.replace('.fbx', ''), b64: readFileSync(`${dir}/${f}`).toString('base64') }));
  const r = await page.evaluate(f => window.convertClips(f, 10), files);
  writeFileSync(`${OUT}/clips-${sex}.glb`, Buffer.from(r.glb, 'base64'));
  console.log('clips', sex, 'KB', Math.round(r.glb.length * .75 / 1024), JSON.stringify(r.report.map(c => [c.name, Math.round(c.duration)])));
}
await browser.close();
