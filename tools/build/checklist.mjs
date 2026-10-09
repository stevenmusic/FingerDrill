/* 產生 README 的「大綱核對清單」(Markdown):node tools/build/checklist.mjs > /tmp/x.md */
import fs from "node:fs";
const SY = JSON.parse(fs.readFileSync(new URL("../../data/syllabus.json", import.meta.url)));
const nm = k => k === "any" ? "任何音" : k.replace("#", "♯").replace(/^([A-G])b$/, "$1♭");
const TYPE = { scale: "音階", arpeggio: "琶音", chromatic: "半音階", dom7: "屬七琶音", dim7: "減七琶音" };
const FORM = { harmonic: "和聲", melodic: "旋律", natural: "自然" };
const SUB = { 2: "八分", 3: "三連音", 4: "十六分" };
let out = "";
for (const [sk, sys] of Object.entries(SY.systems)) {
  out += `### ${sys.name}(${sys.syllabus})\n\n`;
  for (const g of sys.grades) {
    out += `- [ ] **${sys.name} ${g.grade} 級**(verified: ${g.verified})— 速度:音階 ♩=${g.tempo.scale.bpm} ${SUB[g.tempo.scale.sub]}、琶音 ♩=${g.tempo.arpeggio.bpm} ${SUB[g.tempo.arpeggio.sub]}、半音階 ♩=${g.tempo.chromatic.bpm} ${SUB[g.tempo.chromatic.sub]}、屬七/減七 ♩=${g.tempo.four.bpm} ${SUB[g.tempo.four.sub]}\n`;
    for (const it of g.items) {
      const kind = (it.motion === "contrary" ? "反向" : "") + (it.quality === "major" ? "大調" : it.quality === "minor" ? "小調" : "") + TYPE[it.type];
      const extra = [it.hands === "HS" ? "分手" : "雙手同時", it.octaves + " 個八度", it.articulation.map(a => a === "legato" ? "圓滑" : "斷奏").join("/")];
      if (it.forms) extra.push("小調:" + it.forms.map(f => FORM[f]).join("/"));
      if (it.dynamics) extra.push("力度 " + it.dynamics.join("/"));
      out += `  - ${kind}:${it.keys.map(nm).join("、")}(${extra.join("、")})\n`;
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
