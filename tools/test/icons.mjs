// App 圖示:黑底 + 金色空心手(手指連在一起的外框:四指 + 拇指),填滿畫面;用 Chromium 畫成 PNG。
// 產生:icons/icon-192.png、icon-512.png、icon-maskable-512.png(四周留安全區)、apple-touch-icon.png(180)
// 執行:cd tools/test && node icons.mjs
import { chromium } from "playwright";
const OUT = new URL("../../icons/", import.meta.url).pathname;
const hand = `<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>`;
const svg = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#2A2112"/><stop offset="1" stop-color="#0C0A07"/></radialGradient></defs>
<rect width="100" height="100" fill="url(#g)"/>
<g transform="translate(${pad} ${pad}) scale(${(100 - 2 * pad) / 24})" fill="none" stroke="#F2B94B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${hand}</g></svg>`;
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, size, pad] of [["icon-192.png", 192, 4], ["icon-512.png", 512, 4], ["icon-maskable-512.png", 512, 13], ["apple-touch-icon.png", 180, 4]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0">${svg(size, pad)}</body></html>`);
  await p.screenshot({ path: OUT + name, clip: { x: 0, y: 0, width: size, height: size } });
}
await b.close(); console.log("ok");
