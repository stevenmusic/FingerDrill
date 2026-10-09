// 瀏覽器整合測試:每個系統 × 級數抽題、畫譜(檢查指法數字畫出來)、示範播放有聲音、標記熟練會存起來、
// 手機直式沒有橫向捲動;截圖放 tools/test/out/
import { open } from "./harness.mjs";
import fs from "node:fs";
const OUT = new URL("./out/", import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
let bad = 0; const check = (c, m) => { if (!c) { bad++; console.log("✗ " + m); } };

for (const vp of [{ name: "phone", viewport: { width: 390, height: 844 }, mobile: true, dpr: 2 }, { name: "desktop", viewport: { width: 1400, height: 900 } }]) {
  const { page, errors, close } = await open(vp);
  for (const sys of ["abrsm", "trinity"]) {
    if (vp.name === "phone") { await page.click("#setupToggle"); }
    await page.click(`#systemSeg button[data-v="${sys}"]`);
    for (let g = 1; g <= 8; g++) {
      await page.selectOption("#selGrade", String(g));
      if (vp.name === "phone") { /* 設定展開時才點得到 */ }
      const before = await page.evaluate(() => window.__scoreReady || 0);
      await page.click("#drawBtn");
      await page.waitForFunction(b => (window.__scoreReady || 0) > b, before, { timeout: 20000 });
      const info = await page.evaluate(() => {
        const svg = document.querySelector("#osmd svg");
        const txt = [...document.querySelectorAll("#osmd svg text")].map(t => t.textContent.trim()).filter(t => /^[1-5]$/.test(t)).length;
        const ex = window.__app.ex, show = document.querySelector('#handSeg [aria-pressed="true"]').dataset.v;
        const n = show === "both" ? ex.rh.length + ex.lh.length : ex[show].length;
        return { svg: !!svg, fingers: txt, n, title: document.getElementById("qTitle").textContent, msg: document.getElementById("paperMsg").textContent };
      });
      check(info.svg && !info.msg, `${vp.name} ${sys} G${g}: 樂譜沒畫出來 ${info.msg}`);
      check(info.fingers === info.n, `${vp.name} ${sys} G${g} ${info.title}: 畫出 ${info.fingers} 個指法、應為 ${info.n}`);
    }
    if (vp.name === "phone") await page.click("#setupToggle");
  }
  // 雙手顯示 + 播放
  await page.click('#handSeg button[data-v="both"]');
  await page.waitForTimeout(400);
  await page.click("#playBtn");
  await page.waitForFunction(() => document.getElementById("playLabel").textContent === "停止", null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const playing = await page.evaluate(() => document.querySelector("#osmd svg") && document.getElementById("playLabel").textContent);
  check(playing === "停止", `${vp.name}: 播放沒有開始`);
  await page.screenshot({ path: OUT + vp.name + "-playing.png", fullPage: vp.name === "phone" });
  await page.click("#playBtn");
  // 節拍器
  await page.click("#metroBtn"); await page.waitForTimeout(800);
  check(await page.evaluate(() => document.getElementById("metroLabel").textContent) === "停止", `${vp.name}: 節拍器沒有開始`);
  await page.click("#metroBtn");
  // 熟練標記 → 重新整理後還在
  const key = await page.evaluate(() => window.__app.cur.key);
  await page.click('.mbtn[data-m="good"]');
  await page.reload(); await page.waitForFunction(() => window.__stageReady >= 1);
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem("fingerdrill.v1")).mastery[k], key);
  check(saved === "good", `${vp.name}: 熟練沒有存起來`);
  // 排除已熟練:那一題不能再被抽到
  const excluded = await page.evaluate(k => { window.__app.S.filter.excludeMastered = true; return window.__app.pool().every(q => q.key !== k); }, key);
  check(excluded, `${vp.name}: 排除已熟練沒有作用`);
  const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!hscroll, `${vp.name}: 有橫向捲動`);
  for (const e of errors) { bad++; console.log("✗ " + vp.name + " " + e); }
  await close();
}
console.log(bad ? `✗ ${bad} 項失敗` : "✓ smoke 全部通過");
process.exit(bad ? 1 : 0);
