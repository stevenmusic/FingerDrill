// App 圖示:黑底 + 金色五指手(跟哈農分頁同一個線稿圖示),用 Chromium 畫成 PNG。
// 產生:icons/icon-192.png、icon-512.png、icon-maskable-512.png(四周留安全區)、apple-touch-icon.png(180)
// 執行:cd tools/test && node icons.mjs
import { chromium } from "playwright";
const OUT = new URL("../../icons/", import.meta.url).pathname;
const hand = `<path d="M8 14V5.5"/><path d="M11.5 12V3.5"/><path d="M15 12V4.5"/><path d="M18.5 12.5V7"/><path d="M18.5 12.5v2a7 7 0 0 1-7 7h-.8a6 6 0 0 1-4.7-2.3l-3-3.8a1.6 1.6 0 0 1 2.5-2L8 16v-2"/>`;
const svg = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#2A2112"/><stop offset="1" stop-color="#0C0A07"/></radialGradient></defs>
<rect width="100" height="100" fill="url(#g)"/>
<g transform="translate(${pad} ${pad}) scale(${(100 - 2 * pad) / 24})" fill="none" stroke="#F2B94B" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${hand}</g></svg>`;
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, size, pad] of [["icon-192.png", 192, 18], ["icon-512.png", 512, 18], ["icon-maskable-512.png", 512, 26], ["apple-touch-icon.png", 180, 18]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0">${svg(size, pad)}</body></html>`);
  await p.screenshot({ path: OUT + name, clip: { x: 0, y: 0, width: size, height: size } });
}
await b.close(); console.log("ok");
