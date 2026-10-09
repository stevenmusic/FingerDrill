// 版面檢查:各種裝置尺寸(手機直/橫、折疊機、平板、筆電、大螢幕)× 每個畫面狀態,檢查
//  1. 沒有橫向捲動;可見元素沒有超出畫面左右
//  2. 按鈕文字沒有被截斷(刻意用省略號的除外)、點擊區域夠大
//  3. 頂欄品牌名和右邊按鈕不重疊;底部分頁列不蓋住內容(捲到底時最後一個元素在分頁列上方)
//  4. 對話框放得進畫面(放不下時可以捲動)
//  5. 樂譜不超出紙張
// 每種尺寸存截圖到 out/layout-*.png
import { open } from "./harness.mjs";
import fs from "node:fs";
const OUT = new URL("./out/", import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const VPS = [
  ["fold-280", 280, 653, true], ["se1-320", 320, 568, true], ["se-375", 375, 667, true], ["iphone-390", 390, 844, true],
  ["promax-430", 430, 932, true], ["android-360", 360, 800, true], ["android-412", 412, 915, true],
  ["se-land", 667, 375, true], ["iphone-land", 844, 390, true], ["promax-land", 932, 430, true],
  ["ipad-mini", 744, 1133, true], ["ipad", 820, 1180, true], ["ipad-land", 1180, 820, true], ["ipad-pro", 1024, 1366, true], ["ipad-pro-land", 1366, 1024, true],
  ["laptop", 1280, 800, false], ["desktop", 1440, 900, false], ["fhd", 1920, 1080, false], ["narrow-window", 500, 900, false]
];
let bad = 0; const issues = [];
const report = (vp, state, msg) => { bad++; issues.push(`${vp} ${state}: ${msg}`); };

async function audit(page, vp, state){
  const r = await page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight, out = [];
    const vis = e => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    if (document.documentElement.scrollWidth > W + 1) out.push(`橫向捲動 ${document.documentElement.scrollWidth} > ${W}`);
    // 可見元素超出畫面(橫向捲動的 .opts 容器裡的除外;樂譜紙張 overflow hidden)
    for (const e of document.querySelectorAll("body *")) {
      if (!vis(e) || e.closest(".opts") || e.closest("#osmd") || e.closest(".modal") && !e.closest(".modal-card")) continue;
      const r = e.getBoundingClientRect();
      if (r.left < -1 || r.right > W + 1) { out.push(`超出畫面:${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${[...e.classList].join(".")} [${Math.round(r.left)},${Math.round(r.right)}]`); if (out.length > 12) break; }
    }
    // 按鈕文字被截斷
    for (const e of document.querySelectorAll("button, .q-tag, label, .lbl")) {
      if (!vis(e) || e.closest(".setup-summary") || e.id === "examChip") continue;   // 摘要列刻意省略號
      if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== "visible") out.push(`文字被截斷:${e.textContent.trim().slice(0, 30)}(${e.scrollWidth}>${e.clientWidth})`);
    }
    // 點擊區域(手指):至少 28×28
    for (const e of document.querySelectorAll("button, select, input[type=range]")) {
      if (!vis(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.height < 28 || r.width < 28) out.push(`點擊區域太小:${(e.id || e.textContent.trim()).slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    // 頂欄重疊
    const h1 = document.querySelector("header h1").getBoundingClientRect(), hr = document.querySelector(".header-right").getBoundingClientRect();
    if (h1.right > hr.left + 1 && h1.bottom > hr.top && h1.top < hr.bottom) out.push(`頂欄重疊:品牌名到 ${Math.round(h1.right)},按鈕從 ${Math.round(hr.left)}`);
    // 樂譜不超出紙張
    const svg = document.querySelector("#osmd svg"), paper = document.querySelector(".paper");
    if (svg && vis(paper) && svg.getBoundingClientRect().width > paper.getBoundingClientRect().width + 2) out.push(`樂譜比紙張寬 ${Math.round(svg.getBoundingClientRect().width)} > ${Math.round(paper.getBoundingClientRect().width)}`);
    // 對話框
    const mc = document.querySelector(".modal-card");
    if (mc && vis(mc)) { const r = mc.getBoundingClientRect(), m = document.querySelector(".modal"); if ((r.height > H + 1) && m.scrollHeight <= m.clientHeight) out.push(`對話框放不下又不能捲 ${Math.round(r.height)} > ${H}`); }
    return out;
  });
  for (const m of [...new Set(r)]) report(vp, state, m);
  // 捲到底:最後的內容不被底部分頁列蓋住
  const cover = await page.evaluate(async () => {
    window.scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 120));
    const tb = document.getElementById("tabbar").getBoundingClientRect();
    const items = [...document.querySelectorAll("main > *")].filter(e => !e.hidden && e.getBoundingClientRect().height > 0);
    const last = items[items.length - 1].getBoundingClientRect();
    window.scrollTo(0, 0);
    return last.bottom > tb.top + 1 ? `最後的內容被底部分頁列蓋住(${Math.round(last.bottom)} > ${Math.round(tb.top)})` : null;
  });
  if (cover) report(vp, state, cover);
}

for (const [name, w, h, mobile] of VPS) {
  const { page, errors, close } = await open({ viewport: { width: w, height: h }, mobile, hasTouch: mobile, dpr: 1 });
  const shot = async st => page.screenshot({ path: `${OUT}layout-${name}-${st}.png` });
  // 第一次打開:對話框
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("fingerdrill-lang", "zh"); });
  await page.reload(); await page.waitForFunction(() => window.__stageReady >= 1);
  await audit(page, name, "對話框"); await shot("onboard");
  await page.selectOption("#obGrade", "8"); await page.click("#obYes");
  await page.waitForTimeout(300);
  // 考級:ABRSM 8 級抽一題(四個八度,最寬的譜)
  const b = await page.evaluate(() => window.__scoreReady || 0);
  await page.click("#drawBtn"); await page.waitForFunction(b => (window.__scoreReady || 0) > b, b);
  await audit(page, name, "考級 ABRSM"); await shot("exam");
  // 展開設定(手機收合時)
  if (await page.isVisible("#paneExam .setup-summary")) await page.click("#paneExam .setup-summary");
  await page.click('#systemSeg button[data-v="trinity"]'); await page.waitForTimeout(200);
  await audit(page, name, "考級 Trinity 設定展開");
  // 音階:選擇器展開
  await page.click('#tabbar button[data-tab="scale"]'); await page.waitForTimeout(400);
  if (await page.isVisible("#paneScale .setup-summary")) await page.click("#paneScale .setup-summary");
  await page.click('#paneScale .opt[data-v="minor"]'); await page.waitForTimeout(400);
  await audit(page, name, "音階 選擇器"); await shot("scale");
  // 琶音
  await page.click('#tabbar button[data-tab="arp"]'); await page.waitForTimeout(400);
  await audit(page, name, "琶音");
  // 哈農
  await page.click('#tabbar button[data-tab="hanon"]'); await page.waitForTimeout(200);
  await audit(page, name, "哈農");
  // 英文(字比較長)
  await page.click('#tabbar button[data-tab="scale"]'); await page.click("#langToggle"); await page.waitForTimeout(500);
  await audit(page, name, "英文 音階"); await shot("english");
  await page.click('#tabbar button[data-tab="exam"]'); await page.waitForTimeout(400);
  await audit(page, name, "英文 考級");
  for (const e of errors) report(name, "console", e);
  await close();
}
console.log(issues.slice(0, 120).join("\n"));
console.log(bad ? `✗ ${bad} 項問題` : `✓ ${VPS.length} 種尺寸全部通過`);
process.exit(bad ? 1 : 0);
