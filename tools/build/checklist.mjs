/* 產生 README 的「大綱核對清單」(Markdown):node tools/build/checklist.mjs [--fingerings] */
import fs from "node:fs";
const SY = JSON.parse(fs.readFileSync(new URL("../../data/syllabus.json", import.meta.url)));
const nm = k => k.replace("#", "♯").replace(/^([A-G])b$/, "$1♭");
const TYPE = { scale: "音階", arpeggio: "琶音", chromatic: "半音階", dom7: "屬七琶音", dim7: "減七琶音", wholetone: "全音音階", broken: "分解和弦", thirds: "三度雙音音階", sixths: "六度雙音音階" };
const FORM = { harmonic: "和聲", melodic: "旋律", natural: "自然" };
const UNIT = { q: "♩", h: "𝅗𝅥", "q.": "♩." };
const HANDS = { HS: "分手(考官指定左/右)", HT: "雙手同時", RH: "右手", LH: "左手" };
const ART = a => (Array.isArray(a) ? a : [a]).map(x => x === "legato" ? "圓滑" : "斷奏").join("/");
const DYN = { "cresc-dim": "漸強再漸弱(p–f–p)" };
function desc(it){
  const kind = (it.motion === "contrary" ? "反向" : "") + (it.quality === "major" ? "大調" : it.quality === "minor" ? "小調" : "") + TYPE[it.type]
    + (it.apart ? `(相隔${it.apart === 3 ? "三" : "六"}度)` : "") + (it.inversion ? `(第${it.inversion === 1 ? "一" : "二"}轉位)` : "");
  const keys = it.type === "chromatic" && it.lhStart !== it.rhStart ? `左手 ${nm(it.lhStart)}、右手 ${nm(it.rhStart)}` : (it.keys || [it.key]).map(nm).join("、");
  const extra = [HANDS[it.hands], it.range === "5th" ? "五度範圍" : it.octaves + " 個八度", ART(it.articulation)];
  if (it.forms) extra.push(it.forms.length === 1 ? "指定" + FORM[it.forms[0]] + "小調" : (it.examinerForms ? "考官指定:" : "小調自選:") + it.forms.map(f => FORM[f]).join("/"));
  if (it.dynamic) extra.push(DYN[it.dynamic] || it.dynamic);
  if (it.tempo && it.tempo.unit) extra.push(`最低 ${UNIT[it.tempo.unit]} = ${it.tempo.bpm}`);
  return `${kind}:${keys}(${extra.join("、")})`;
}
let out = "";
for (const [sk, sys] of Object.entries(SY.systems)) {
  out += `### ${sys.name}(${sys.syllabus})\n\n`;
  for (const g of sys.grades) {
    const label = g.grade === 0 ? "初級" : g.grade + " 級";
    if (sys.mode === "examiner") {
      const tp = Object.entries(g.tempo).map(([k, t]) => `${{ scale: "音階", arpeggio: "琶音", apart: "相隔三/六度", thirdsLegato: "圓滑三度", doubleStaccato: "斷奏三/六度" }[k]} ${UNIT[t.unit]} = ${t.bpm}`).join("、");
      out += `- [ ] **${sys.name} ${label}**(${g.source})— 參考速度:${tp}\n`;
      for (const it of g.items) out += `  - ${desc(it)}\n`;
    } else {
      out += `- [ ] **${sys.name} ${label}**(${g.source})\n`;
      for (const [k, items] of Object.entries(g.sets)) { out += `  - ${k} 組\n`; for (const it of items) out += `    - ${desc(it)}\n`; }
    }
  }
  out += "\n";
}
process.stdout.write(out);

/* 指法表(給人工核對):兩個八度上行 */
if (process.argv.includes("--fingerings")) {
  const FG = JSON.parse(fs.readFileSync(new URL("../../data/fingerings.json", import.meta.url)));
  const KN = { C: "C", Cs: "C♯/D♭", D: "D", Ds: "D♯/E♭", E: "E", F: "F", Fs: "F♯/G♭", G: "G", Gs: "G♯/A♭", A: "A", As: "A♯/B♭", B: "B" };
  const sp = (s, n) => s.match(new RegExp(`.{1,${n}}`, "g")).join(" ");
  let t = "| 表 | 調 | 右手 | 左手 | 備註 |\n|---|---|---|---|---|\n";
  for (const [form, tb] of Object.entries(FG.scale)) for (const [k, e] of Object.entries(tb))
    t += `| 音階 ${({ major: "大調", harmonic: "和聲小調", melodic: "旋律小調" })[form]} | ${KN[k]} | \`${sp(e.rh, 7)}\` | \`${sp(e.lh, 7)}\` | ${[e.rhDesc && "右手下行(自然小調)`" + sp(e.rhDesc, 7) + "`", e.lhDesc && "左手下行(自然小調)`" + sp(e.lhDesc, 7) + "`"].filter(Boolean).join(";")} |\n`;
  for (const [q, tb] of Object.entries(FG.arpeggio)) for (const [k, e] of Object.entries(tb))
    t += `| 琶音 ${q === "major" ? "大調" : "小調"} | ${KN[k]} | \`${sp(e.rh, 3)}\` | \`${sp(e.lh, 3)}\` | |\n`;
  process.stdout.write("\n" + t);
}
