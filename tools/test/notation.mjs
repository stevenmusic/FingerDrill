// 瀏覽器全面檢查:大綱裡每一題(ABRSM 三種小調形式、Trinity A/B 組)× 雙手顯示,實際用 OSMD 畫出來,
// 比對:臨時記號(OSMD 畫的 vs 我們依規則寫的)、指法數字數量、8va 標示
import { open } from "./harness.mjs";
const { page, errors, close } = await open({});
await page.evaluate(() => { const S = window.__app.S; S.onboarded = true; document.getElementById("onboard").hidden = true; });
const res = await page.evaluate(async () => {
  const A = window.__app, S = A.S, seen = new Set(), bad = [];
  let n = 0;
  for (const sys of ["abrsm", "trinity"]) for (const g of A.SY.systems[sys].grades) for (const mf of ["harmonic", "melodic", "natural"]) for (const set of ["A", "B"]) {
    S.exam = { system: sys, grade: g.grade, set }; S.minorForm = mf;
    for (const q of A.examQuestions()) {
      const k = q.key + "|" + q.sub; if (seen.has(k)) continue; seen.add(k);
      const before = window.__scoreReady || 0;
      A.setQuestion(q, "exam");
      for (let t = 0; t < 400 && (window.__scoreReady || 0) === before; t++) await new Promise(r => setTimeout(r, 25));
      document.querySelector('#handSeg button[data-v="both"]').click();
      const b2 = window.__scoreReady;
      for (let t = 0; t < 400 && window.__scoreReady === b2; t++) await new Promise(r => setTimeout(r, 25));
      const xml = window.__lastXml;
      const wantAcc = (xml.match(/<accidental>/g) || []).length;
      let gotAcc = 0;
      for (const row of A.osmd.GraphicSheet.MeasureList) for (const gm of row) if (gm) for (const se of gm.staffEntries) for (const gve of se.graphicalVoiceEntries) {
        if (!gve.notes[0].sourceNote.Pitch) continue;
        gotAcc += gve.vfStaveNote.modifiers.filter(m => /accidental/i.test(m.getCategory())).length;
      }
      const ex = A.ex, wantF = ex.rh.filter(x => x.finger).length + ex.lh.filter(x => x.finger).length;
      const fingers = [...document.querySelectorAll("#osmd svg text")].filter(t => /^[1-5]$/.test(t.textContent.trim())).length;
      if (wantAcc !== gotAcc) bad.push(`${sys} ${q.key}: 臨時記號 OSMD ${gotAcc} / XML ${wantAcc}`);
      if (fingers !== wantF) bad.push(`${sys} ${q.key}: 指法 ${fingers} / ${wantF}`);
      if (/<octave-shift type="(down|up)"/.test(xml) !== [...document.querySelectorAll("#osmd svg text")].some(t => /^8/.test(t.textContent.trim()))) bad.push(`${sys} ${q.key}: 8va 標示`);
      n++;
    }
  }
  return { n, bad };
});
console.log(`畫譜比對 ${res.n} 題`);
for (const b of res.bad.slice(0, 40)) console.log("✗ " + b);
for (const e of errors) console.log("✗ " + e);
await close();
const fail = res.bad.length + errors.length;
console.log(fail ? `✗ ${fail} 項失敗` : "✓ 全部通過");
process.exit(fail ? 1 : 0);
