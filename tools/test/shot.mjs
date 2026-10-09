// 截圖:手機直式(第一個畫面)、手機橫向、桌機;指定一題
import { open } from "./harness.mjs";
import fs from "node:fs";
const OUT = new URL("./out/", import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const q = process.argv[2] || "abrsm:3:maj:Eb";
const [sys, grade, item, tonic] = q.split(":");
for (const vp of [{ name: "phone", viewport: { width: 390, height: 844 }, mobile: true, dpr: 2 }, { name: "phone-land", viewport: { width: 844, height: 390 }, mobile: true, dpr: 2 }, { name: "desktop", viewport: { width: 1400, height: 900 } }]) {
  const { page, errors, close } = await open(vp);
  const b = await page.evaluate(() => window.__scoreReady || 0);
  await page.evaluate(([sys, grade, item, tonic]) => {
    document.querySelector(`#systemSeg button[data-v="${sys}"]`).click();
    const sel = document.getElementById("selGrade"); sel.value = grade; sel.dispatchEvent(new Event("change"));
    const q = window.__app.allQuestions().find(x => x.itemId === item && x.tonic === tonic);
    window.__app.setQuestion(q);
  }, [sys, grade, item, tonic]);
  await page.waitForFunction(b => (window.__scoreReady || 0) > b, b);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${vp.name}-${q.replace(/:/g, "_")}.png` });
  if (errors.length) console.log(errors.join("\n"));
  await close();
}
