// 瀏覽器全面檢查:大綱裡每一題(和聲/旋律/自然小調都跑)× 雙手顯示,實際用 OSMD 畫出來,
// 逐音比對:臨時記號(OSMD 畫的 vs 我們依規則寫的)、指法數字數量、8va 標示
import { open } from "./harness.mjs";
const { page, errors, close } = await open({});
const res = await page.evaluate(async () => {
  const A = window.__app, S = A.S, seen = new Set(), bad = [];
  const sysSel = sys => document.querySelector(`#systemSeg button[data-v="${sys}"]`).click();
  let n = 0;
  for (const sys of ["abrsm", "trinity"]) {
    sysSel(sys);
    for (let g = 1; g <= 8; g++) {
      const sel = document.getElementById("selGrade"); sel.value = String(g); sel.dispatchEvent(new Event("change"));
      for (const mf of ["harmonic", "melodic", "natural"]) {
        S.minorForm = mf;
        for (const q of A.allQuestions()) {
          const k = q.key + "|" + q.sub; if (seen.has(k)) continue; seen.add(k);
          const before = window.__scoreReady || 0;
          A.setQuestion(q);
          // 等這題畫完
          for (let t = 0; t < 400 && (window.__scoreReady || 0) === before; t++) await new Promise(r => setTimeout(r, 25));
          // 切到雙手
          document.querySelector('#handSeg button[data-v="both"]').click();
          const b2 = window.__scoreReady;
          for (let t = 0; t < 400 && window.__scoreReady === b2; t++) await new Promise(r => setTimeout(r, 25));
          const xml = window.__lastXml;
          const want = [];
          for (const m of xml.split("<measure ").slice(1)) for (const x of m.matchAll(/<note>(.*?)<\/note>/gs)) { if (/<rest/.test(x[1])) continue; want.push(/<accidental>/.test(x[1]) ? 1 : 0); }
          const got = [];
          for (const row of A.osmd.GraphicSheet.MeasureList) for (const gm of row) if (gm) for (const se of gm.staffEntries) for (const gve of se.graphicalVoiceEntries) {
            if (!gve.notes[0].sourceNote.Pitch) continue;
            got.push(gve.vfStaveNote.modifiers.some(m => /accidental/i.test(m.getCategory())) ? 1 : 0);
          }
          // OSMD 依小節、譜表排序;XML 依小節、先右手後左手——兩邊都依(小節,譜表)排,總數與每小節數量一致才逐一比
          const wantSum = want.reduce((a, b) => a + b, 0), gotSum = got.reduce((a, b) => a + b, 0);
          const fingers = [...document.querySelectorAll("#osmd svg text")].filter(t => /^[1-5]$/.test(t.textContent.trim())).length;
          const nNotes = want.length;
          if (wantSum !== gotSum) bad.push(`${q.key}: 臨時記號 OSMD ${gotSum} / XML ${wantSum}`);
          if (fingers !== nNotes) bad.push(`${q.key}: 指法 ${fingers} / 音 ${nNotes}`);
          if (/<octave-shift type="(down|up)"/.test(xml) !== [...document.querySelectorAll("#osmd svg text")].some(t => /^8/.test(t.textContent.trim()))) bad.push(`${q.key}: 8va 標示`);
          n++;
        }
      }
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
