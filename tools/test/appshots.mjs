// App Store 截圖:6.7 吋 iPhone(1290 × 2796)與 iPad 13 吋(2064 × 2752),中文
// 用法:cd tools/test && node appshots.mjs
import { open } from "./harness.mjs";
const OUT = new URL("../../app/screenshots/", import.meta.url).pathname;
for (const [dev, w, h, dpr] of [["iphone67", 430, 932, 3], ["ipad13", 1032, 1376, 2]]) {
  const { page, close } = await open({ viewport: { width: w, height: h }, mobile: true, dpr });
  const go = async (st, extra) => {
    await page.evaluate(st => { localStorage.clear(); localStorage.setItem("fingerdrill-lang", "zh"); localStorage.setItem("fingerdrill.v1", JSON.stringify(st)); }, st);
    await page.reload(); await page.waitForFunction(() => window.__stageReady >= 1 && document.querySelector("#osmd svg, #paperMsg"));
    if (extra) await extra(); await page.waitForTimeout(1500);
  };
  const today = new Date(), k = x => { const y = new Date(today); y.setDate(y.getDate() - x); return `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`; };
  const log = Object.fromEntries([0, 1, 2, 3, 4, 6].map(x => [k(x), { n: 5 - (x % 3), sec: 900 }]));
  await go({ onboarded: true, tab: "scale", pick: { scale: { kind: "major", key: "D", octaves: 2 } }, log });
  await page.screenshot({ path: `${OUT}${dev}-1-scale.png` });
  await go({ onboarded: true, tab: "hanon", pick: { hanon: { no: 3 } }, log, hanonBest: { 3: 84 } });
  await page.screenshot({ path: `${OUT}${dev}-2-hanon.png` });
  await go({ onboarded: true, tab: "exam", exam: { system: "abrsm", grade: 5, set: "A" }, log }, async () => { await page.click("#drawBtn"); });
  await page.screenshot({ path: `${OUT}${dev}-3-exam.png` });
  await go({ onboarded: true, tab: "arp", pick: { arp: { kind: "minor", key: "G" } }, log }, async () => { await page.evaluate(() => document.getElementById("logCard").scrollIntoView({ block: "center" })); });
  await page.screenshot({ path: `${OUT}${dev}-4-log.png` });
  await close();
}
console.log("ok");
