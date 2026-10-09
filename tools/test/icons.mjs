// App 圖示:黑底 + 金色張開的手(五根手指分開、清楚),填滿畫面;用 Chromium 畫成 PNG。
// 產生:icons/icon-192.png、icon-512.png、icon-maskable-512.png(四周留安全區)、apple-touch-icon.png(180)
// 執行:cd tools/test && node icons.mjs
import { chromium } from "playwright";
const OUT = new URL("../../icons/", import.meta.url).pathname;
// 手(100 × 100 格):掌心圓角矩形 + 四根手指(粗圓頭線)+ 斜出去的拇指,同一個金色,手指之間留縫
export const HAND = `<rect x="27" y="46" width="49" height="42" rx="16"/>
<g stroke-width="10.5" stroke-linecap="round" fill="none">
<line x1="34" y1="56" x2="33" y2="22"/><line x1="47.5" y1="52" x2="47.5" y2="12"/><line x1="61" y1="54" x2="62" y2="17"/><line x1="73" y1="62" x2="76" y2="33"/>
<line x1="31" y1="74" x2="12" y2="52"/></g>`;
const svg = (size, s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#2A2112"/><stop offset="1" stop-color="#0C0A07"/></radialGradient></defs>
<rect width="100" height="100" fill="url(#g)"/>
<g transform="translate(50 50) scale(${s}) translate(-44 -50)" fill="#F2B94B" stroke="#F2B94B">${HAND}</g></svg>`;
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, size, pad] of [["icon-192.png", 192, 1.08], ["icon-512.png", 512, 1.08], ["icon-maskable-512.png", 512, 0.82], ["apple-touch-icon.png", 180, 1.08]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0">${svg(size, pad)}</body></html>`);
  await p.screenshot({ path: OUT + name, clip: { x: 0, y: 0, width: size, height: size } });
}
await b.close(); console.log("ok");
