// 模擬真人操作:用觸控(手機)或滑鼠(桌機)隨機做各種事,每一步之後檢查狀態一致、沒有錯誤。
//   動作:切分頁、點選擇器、抽題、下一項、播放/停止(含連點)、按住 ±、拖速度、
//         熟練標記、中英切換、主題、改考試系統/級數/組別、收起清單、點清單、換顯示的手、旋轉螢幕、重新整理、播放中做別的事
//   檢查:沒有 console 錯誤;播放/節拍器狀態跟按鈕文字一致、不會兩份同時播;樂譜跟題目一致(指法數字都在);
//         速度在 30–200 且跟滑桿一致;選到的分頁跟顯示的畫面一致;沒有橫向捲動;localStorage 讀得回來
// 用法:node human.mjs [步數] [種子]
import { open } from "./harness.mjs";
const STEPS = Number(process.argv[2] || 200), SEED = Number(process.argv[3] || 1);
let seed = SEED; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pickOne = a => a[Math.floor(rnd() * a.length)];
let bad = 0; const fail = (m) => { bad++; console.log("✗ " + m); };

async function run(vpName, vp){
  const { page, errors, close } = await open(vp);
  const touch = !!vp.mobile;
  const tap = async sel => { const el = await page.$(sel); if (!el || !(await el.isVisible())) return false; try { if (touch) await el.tap({ timeout: 3000 }); else await el.click({ timeout: 3000 }); return true; } catch (e) { return false; } };
  const tapAny = async sel => { const els = (await page.$$(sel)); const vis = []; for (const e of els) if (await e.isVisible()) vis.push(e); if (!vis.length) return false; const e = pickOne(vis); try { if (touch) await e.tap({ timeout: 3000 }); else await e.click({ timeout: 3000 }); return true; } catch (er) { return false; } };
  const log = [];
  // 開始:第一次打開
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("fingerdrill-lang", "zh"); });
  await page.reload(); await page.waitForFunction(() => window.__stageReady >= 1);
  if (rnd() < 0.5) { await tap(`#obSystem button[data-v="${pickOne(["abrsm", "trinity"])}"]`); await page.selectOption("#obGrade", String(Math.floor(rnd() * 9))); await tap("#obYes"); }
  else await tap("#obNo");
  let rotated = false;
  const ACTIONS = [
    [8, "切分頁", async () => tap(`#tabbar button[data-tab="${pickOne(["scale", "arp", "hanon", "exam"])}"]`)],
    [4, "展開/收起設定", async () => tapAny(".pane:not([hidden]) .setup-summary")],
    [14, "點選擇器", async () => tapAny(".pane:not([hidden]) .rows .opt")],
    [10, "抽題", async () => tap("#drawBtn")],
    [5, "下一項", async () => tap("#nextBtn")],
    [5, "點清單", async () => tapAny("#qGroups .qrow")],
    [4, "點本級要求", async () => tapAny(".quick .opt[data-i]")],
    [2, "收起本級要求", async () => tapAny(".quick .chip")],
    [10, "播放/停止", async () => tap("#playBtn")],
    [3, "連點播放", async () => { await tap("#playBtn"); await page.waitForTimeout(60); return tap("#playBtn"); }],
    [3, "連點播放三下", async () => { await tap("#playBtn"); await tap("#playBtn"); return tap("#playBtn"); }],
    [5, "速度 ±", async () => tap(pickOne(["#bpmUp", "#bpmDown"]))],
    [2, "按住速度", async () => { const b = await page.locator(pickOne(["#bpmUp", "#bpmDown"])).boundingBox(); if (!b) return false; await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(300 + rnd() * 1500); await page.mouse.up(); return true; }],
    [2, "拖速度", async () => { const b = await page.locator("#bpmRange").boundingBox(); if (!b) return false; await page.mouse.click(b.x + rnd() * b.width, b.y + b.height / 2); return true; }],
    [3, "回到考試速度", async () => tap("#bpmReset")],
    [4, "熟練/待加強", async () => tapAny(".mbtn")],
    [4, "換顯示的手", async () => tapAny("#handSeg button")],
    [3, "中英切換", async () => tap("#langToggle")],
    [1, "主題", async () => tap("#themeToggle")],
    [3, "考試系統", async () => tapAny("#systemSeg button")],
    [3, "級數", async () => { if (!(await page.isVisible("#selGrade"))) return false; const opts = await page.$$eval("#selGrade option", o => o.map(x => x.value)); await page.selectOption("#selGrade", pickOne(opts)); return true; }],
    [2, "A/B 組", async () => tapAny("#setSeg button")],
    [2, "大小調篩選", async () => tapAny("#qualitySeg button")],
    [2, "範圍篩選", async () => tapAny("#catChips .chip")],
    [2, "排除熟練", async () => tap("#excludeMastered")],
    [1, "小調形式", async () => { if (!(await page.isVisible("#selMinor"))) return false; await page.selectOption("#selMinor", pickOne(["harmonic", "melodic", "natural"])); return true; }],
    [2, "旋轉螢幕", async () => { if (!touch) return false; const s = page.viewportSize(); await page.setViewportSize({ width: s.height, height: s.width }); rotated = !rotated; return true; }],
    [1, "重新整理", async () => { await page.reload(); await page.waitForFunction(() => window.__stageReady >= 1); return true; }],
    [3, "捲動", async () => { await page.mouse.wheel(0, (rnd() - 0.3) * 1500); return true; }],
  ];
  const total = ACTIONS.reduce((s, a) => s + a[0], 0);
  for (let i = 0; i < STEPS; i++) {
    let r = rnd() * total, act = ACTIONS[0];
    for (const a of ACTIONS) { r -= a[0]; if (r < 0) { act = a; break; } }
    const did = await act[2]();
    log.push(act[1] + (did ? "" : "(略過)"));
    await page.waitForTimeout(80 + rnd() * 400);
    // ── 檢查 ──
    const st = await page.evaluate(async () => {
      const A = window.__app, s = A.state, out = [];
      const vis = id => { const e = document.getElementById(id); return e && !e.hidden && e.offsetParent !== null; };
      const playLbl = document.getElementById("playLabel").textContent;
      const stopTxt = ["停止", "Stop"], playTxt = ["播放示範", "Play"], prepTxt = ["準備中…", "Preparing…"];
      if (s.play && !stopTxt.includes(playLbl)) out.push(`播放中但按鈕寫「${playLbl}」`);
      if (!s.play && !s.starting && !playTxt.includes(playLbl)) out.push(`沒在播放但按鈕寫「${playLbl}」`);
      if (s.starting && !prepTxt.includes(playLbl)) out.push(`準備中但按鈕寫「${playLbl}」`);
      const pl = document.getElementById("playline");
      if (A.cur && s.noteXs && pl.hidden) out.push("有樂譜但沒有播放軸");
      if (pl && !pl.hidden) { const r = pl.getBoundingClientRect(), st = document.getElementById("stage").getBoundingClientRect(); if (r.left < st.left - 2 || r.right > st.right + 2) out.push("播放軸跑出樂譜紙張"); }
      if (!(s.bpm >= 30 && s.bpm <= 300)) out.push(`速度超出範圍 ${s.bpm}`);
      if (String(s.bpm) !== document.getElementById("bpmVal").textContent || String(s.bpm) !== document.getElementById("bpmRange").value) out.push(`速度顯示不一致 ${s.bpm} / ${document.getElementById("bpmVal").textContent} / ${document.getElementById("bpmRange").value}`);
      const tab = A.S.tab, selTab = document.querySelector('#tabbar [aria-selected="true"]').dataset.tab;
      if (tab !== selTab) out.push(`分頁不一致 ${tab} / ${selTab}`);
      if (!vis("quizCard")) out.push("練習面板沒有顯示");
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push("橫向捲動");
      try { JSON.parse(localStorage.getItem("fingerdrill.v1")); } catch (e) { out.push("localStorage 壞掉"); }
      // 樂譜:等畫完再比
      if (A.cur) {
        for (let t = 0; t < 60 && !document.querySelector("#osmd svg"); t++) await new Promise(r => setTimeout(r, 50));
        const ex = A.ex, hands = s.show === "both" ? ["rh", "lh"] : [s.show];
        const want = hands.reduce((n, h) => n + ex[h].reduce((c, x) => c + !!x.finger + !!(x.with && x.with.finger), 0), 0);
        const got = [...document.querySelectorAll("#osmd svg text")].filter(t => /^[1-5]$/.test(t.textContent.trim())).length;
        if (want !== got) out.push(`指法數字 ${got} / ${want}(${document.getElementById("qTitle").textContent})`);
        if (document.getElementById("paperMsg").textContent) out.push("樂譜訊息:" + document.getElementById("paperMsg").textContent);
      }
      return out;
    });
    // 不會兩份同時播:播放中的排程節點數不超過「一份」的上限
    if (st.length) { fail(`${vpName} 第 ${i + 1} 步(${log.slice(-4).join(" → ")}):${st.join(";")}`); if (bad > 30) break; }
    const s2 = await page.evaluate(() => window.__app.state);
    if (s2.play && !(await page.evaluate(() => !!window.__app.ex))) fail(`${vpName} 第 ${i + 1} 步(${log.slice(-3).join(" → ")}):題目已清空但示範還在播`);
    else if (s2.play) {
      const exp = await page.evaluate(() => { const ex = window.__app.ex, sh = window.__app.state.show; return (sh === "both" ? ["rh", "lh"] : [sh]).reduce((n, h) => n + ex[h].reduce((a, x) => a + (x.with ? 2 : 1), 0), 0); });
      if (s2.scheduled > exp + 200) fail(`${vpName} 第 ${i + 1} 步:排程節點 ${s2.scheduled} 遠多於一份(${exp} 個音),可能兩份同時播`);
    }
  }
  for (const e of errors) fail(`${vpName} console:${e}`);
  await close();
  console.log(`${vpName}:${STEPS} 步完成`);
}
for (const [name, vp] of [["iPhone", { viewport: { width: 390, height: 844 }, mobile: true, dpr: 1 }], ["SE", { viewport: { width: 320, height: 568 }, mobile: true, dpr: 1 }], ["iPad", { viewport: { width: 820, height: 1180 }, mobile: true, dpr: 1 }], ["桌機", { viewport: { width: 1366, height: 820 } }]]) await run(name, vp);
console.log(bad ? `✗ ${bad} 項問題` : "✓ 模擬操作全部通過");
process.exit(bad ? 1 : 0);
