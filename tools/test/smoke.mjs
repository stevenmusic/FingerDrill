// 瀏覽器整合測試(手機直式 + 桌機):
// 第一次打開的問題、四個分頁、音階/琶音選擇器每個選項都畫得出樂譜、考級(ABRSM 抽考、Trinity A/B 組依序)、
// 播放、節拍器 ±1 與按住連續、熟練標記存起來、沒有橫向捲動、沒有 console 錯誤。截圖放 tools/test/out/
import { open } from "./harness.mjs";
import fs from "node:fs";
const OUT = new URL("./out/", import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
let bad = 0; const check = (c, m) => { if (!c) { bad++; console.log("✗ " + m); } };
const scoreInfo = page => page.evaluate(() => {
  const ex = window.__app.ex, show = document.querySelector('#handSeg [aria-pressed="true"]').dataset.v;
  const hands = show === "both" ? ["rh", "lh"] : [show];
  const want = hands.reduce((s, h) => s + ex[h].filter(n => n.finger).length, 0);
  const got = [...document.querySelectorAll("#osmd svg text")].filter(t => /^[1-5]$/.test(t.textContent.trim())).length;
  return { svg: !!document.querySelector("#osmd svg"), want, got, msg: document.getElementById("paperMsg").textContent, title: document.getElementById("qTitle").textContent };
});
const waitScore = async (page, before) => page.waitForFunction(b => (window.__scoreReady || 0) > b, before, { timeout: 20000 });
const ready = page => page.evaluate(() => window.__scoreReady || 0);

for (const vp of [{ name: "phone", viewport: { width: 390, height: 844 }, mobile: true, dpr: 2 }, { name: "desktop", viewport: { width: 1400, height: 900 } }]) {
  const { page, errors, close } = await open(vp);
  await page.evaluate(() => localStorage.setItem("fingerdrill-lang", "zh"));
  await page.reload(); await page.waitForFunction(() => window.__stageReady >= 1);
  // 第一次打開:問要不要準備考試
  check(await page.isVisible("#onboard"), `${vp.name}: 第一次打開沒有問考試`);
  await page.screenshot({ path: OUT + vp.name + "-onboard.png" });
  await page.click('#obSystem button[data-v="abrsm"]');
  await page.selectOption("#obGrade", "5");
  await page.click("#obYes");
  check(await page.evaluate(() => window.__app.S.tab) === "exam", `${vp.name}: 選了考試應該打開考級分頁`);
  // ABRSM 5 級隨機抽考 10 題
  for (let i = 0; i < 10; i++) {
    const b = await ready(page); await page.click("#drawBtn"); await waitScore(page, b);
    const info = await scoreInfo(page);
    check(info.svg && !info.msg && info.got === info.want, `${vp.name} ABRSM 抽考 ${info.title}: 指法 ${info.got}/${info.want} ${info.msg}`);
  }
  // Trinity 7 級 B 組:依序「下一項」走完整組
  if (vp.name === "phone") await page.click("#paneExam .setup-summary");
  await page.click('#systemSeg button[data-v="trinity"]');
  await page.selectOption("#selGrade", "7");
  await page.click('#setSeg button[data-v="B"]');
  const n = await page.evaluate(() => window.__app.examQuestions().length);
  for (let i = 0; i < n; i++) {
    const b = await ready(page); await page.click("#nextBtn"); await waitScore(page, b);
    const info = await scoreInfo(page);
    check(info.svg && !info.msg && info.got === info.want, `${vp.name} Trinity B 組 ${info.title}: 指法 ${info.got}/${info.want}`);
  }
  check(await page.evaluate(() => window.__app.cur.dynamic) != null, `${vp.name}: Trinity 題目要有力度`);
  await page.screenshot({ path: OUT + vp.name + "-exam.png", fullPage: vp.name === "phone" });
  // 音階分頁:每一列選項都點一遍(選上一列之後,下一列會跟著變)
  for (const tab of ["scale", "arp"]) {
    await page.click(`#tabbar button[data-tab="${tab}"]`);
    if (vp.name === "phone") await page.click(`#pane${tab === "scale" ? "Scale" : "Arp"} .setup-summary`);
    const rows = await page.$$eval(`#pane${tab === "scale" ? "Scale" : "Arp"} .rows .opts`, els => els.map(e => e.dataset.k));
    for (const k of rows) {
      const vals = await page.$$eval(`#pane${tab === "scale" ? "Scale" : "Arp"} .opts[data-k="${k}"] .opt`, els => els.map(e => e.dataset.v));
      for (const v of vals) {
        const sel = `#pane${tab === "scale" ? "Scale" : "Arp"} .opts[data-k="${k}"] .opt[data-v="${v}"]`;
        if (!(await page.$(sel))) continue;
        const b = await ready(page); await page.click(sel); await waitScore(page, b);
        const info = await scoreInfo(page);
        check(info.svg && !info.msg && info.got === info.want, `${vp.name} ${tab} ${k}=${v} ${info.title}: 指法 ${info.got}/${info.want} ${info.msg}`);
      }
    }
    await page.screenshot({ path: `${OUT}${vp.name}-${tab}.png` });
  }
  // 語言切換:EN → 題目、分頁、按鈕都換成英文,再切回中文
  await page.click("#langToggle");
  const en = await page.evaluate(() => ({ title: document.getElementById("qTitle").textContent, tab: document.querySelector('#tabbar [data-tab="scale"] span').textContent, btn: document.getElementById("langToggle").textContent, lang: document.documentElement.lang }));
  check(en.lang === "en" && en.tab === "Scales" && en.btn === "中" && !/[一-龥]/.test(en.title), `${vp.name}: 英文模式沒有換好 ${JSON.stringify(en)}`);
  const zhLeft = await page.evaluate(() => [...document.querySelectorAll("button, label, .lbl, .q-tag, #qTitle, .card-title b, .card-title .sub, .score-note, .verify-note")].filter(e => e.offsetParent && e.id !== "langToggle" && /[一-龥]/.test(e.textContent)).map(e => e.textContent.trim().slice(0, 40)));
  check(!zhLeft.length, `${vp.name}: 英文模式還有中文 ${JSON.stringify(zhLeft)}`);
  await page.screenshot({ path: OUT + vp.name + "-english.png" });
  await page.click("#langToggle");
  check(await page.evaluate(() => document.documentElement.lang) === "zh-Hant", `${vp.name}: 切回中文失敗`);
  // 哈農分頁:隱藏練習面板
  await page.click('#tabbar button[data-tab="hanon"]');
  check(await page.isHidden("#quizCard"), `${vp.name}: 哈農分頁應該隱藏練習面板`);
  await page.click('#tabbar button[data-tab="scale"]');
  // 播放
  await page.click("#playBtn");
  await page.waitForFunction(() => document.getElementById("playLabel").textContent === "停止", null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + vp.name + "-playing.png" });
  await page.click("#playBtn");
  // 速度 −/+
  const bv = () => page.evaluate(() => Number(document.getElementById("bpmVal").textContent));
  const b0 = await bv(); await page.click("#bpmUp"); const b1 = await bv();
  check(b1 === Math.min(200, b0 + 1), `${vp.name}: 點一下 + 應該 +1(${b0} → ${b1})`);
  await page.click("#bpmDown");
  const box = await page.locator("#bpmDown").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
  const b2 = await bv();
  check(b0 - b2 >= 8, `${vp.name}: 按住 − 1.5 秒應該連續減少(${b0} → ${b2})`);
  await page.waitForTimeout(300);
  check(await bv() === b2, `${vp.name}: 放開後還在減少`);
  // 節拍器
  await page.click("#metroBtn"); await page.waitForTimeout(800);
  check(await page.evaluate(() => document.getElementById("metroLabel").textContent) === "停止", `${vp.name}: 節拍器沒有開始`);
  await page.click("#metroBtn");
  // 熟練標記 → 重新整理後還在,也不會再問考試
  const key = await page.evaluate(() => window.__app.cur.key);
  await page.click('.mbtn[data-m="good"]');
  await page.reload(); await page.waitForFunction(() => window.__stageReady >= 1);
  check(await page.evaluate(k => JSON.parse(localStorage.getItem("fingerdrill.v1")).mastery[k], key) === "good", `${vp.name}: 熟練沒有存起來`);
  check(!(await page.isVisible("#onboard")), `${vp.name}: 重新整理後不該再問考試`);
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), `${vp.name}: 有橫向捲動`);
  for (const e of errors) { bad++; console.log("✗ " + vp.name + " " + e); }
  await close();
}
console.log(bad ? `✗ ${bad} 項失敗` : "✓ smoke 全部通過");
process.exit(bad ? 1 : 0);
