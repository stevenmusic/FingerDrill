/* 指法:音階、三和弦琶音查 data/fingerings.json 的標準表;屬七/減七琶音、半音階用規則產生。
   回傳的手指陣列與 theory.js 的音高序列一一對應。 */
import { pcOf, sharpKey, isBlack, midiOf } from "./theory.js";

const digits = s => [...s].map(Number);

/* 兩個八度的表 → n 個八度(上行順序,含頂端) */
export function expandScale(s, n){
  const d = digits(s);
  const out = d.slice(0, 7);
  for (let k = 1; k < n; k++) out.push(...d.slice(7, 14));
  out.push(d[14]);
  return out;
}
export function expandArp(s, n){
  const d = digits(s);
  const out = d.slice(0, 3);
  for (let k = 1; k < n; k++) out.push(...d.slice(3, 6));
  out.push(d[6]);
  return out;
}

function scaleEntry(FG, quality, form, tonicPc){
  const table = quality === "major" ? FG.scale.major : FG.scale[form === "natural" ? "melodic" : form];
  const e = table[sharpKey(tonicPc)];
  if (!e) throw new Error("指法表缺:" + quality + "/" + form + "/" + sharpKey(tonicPc));
  return e;
}

/* 同向音階:{ up, down },up 長 7n+1、down 長 7n */
export function scaleFingers(FG, tonic, quality, form, hand, n){
  const e = scaleEntry(FG, quality, form, pcOf(tonic));
  const natural = form === "natural";
  const upS = natural ? (e[hand + "Desc"] || e[hand]) : e[hand];
  const downS = quality !== "major" && (form === "melodic" || natural) ? (e[hand + "Desc"] || e[hand]) : e[hand];
  const up = expandScale(upS, n);
  const downAsc = expandScale(downS, n);
  downAsc[downAsc.length - 1] = up[up.length - 1];   // 頂端同一個音
  return { up, down: downAsc.slice(0, -1).reverse(), downAsc };
}

export function triadFingers(FG, tonic, quality, hand, n){
  const e = FG.arpeggio[quality === "major" ? "major" : "minor"][sharpKey(pcOf(tonic))];
  if (!e) throw new Error("琶音指法表缺:" + quality + "/" + sharpKey(pcOf(tonic)));
  const up = expandArp(e[hand], n);
  return { up, down: up.slice(0, -1).reverse() };
}

/* 四個音的琶音(屬七、減七):
   右手:拇指放在和弦音裡第一個白鍵,之後 1 2 3 4 循環;最高音是拇指的位置就用 5。
   左手:拇指放在根音(白鍵時)或往回找的第一個白鍵,往前倒數 1 2 3 4;最低音是拇指位置就用 5。 */
export function fourNoteFingers(tones, hand, n){
  const white = tones.map(t => !isBlack(pcOf(t)));
  const k = tones.length;
  let up;
  if (hand === "rh") {
    let t = white.indexOf(true); if (t < 0) t = 0;
    const f = i => ((i - t + k) % k) + 1;
    up = [];
    for (let i = 0; i <= k * n; i++) up.push(f(i % k));
    for (let i = 0; i < t; i++) up[i] = 2 + i;   // 第一個拇指之前的音從 2 開始(2 1 2 3 4…)
    if (t === 0) up[up.length - 1] = 5;
  } else {
    let u = 0;
    if (!white[0]) for (const c of [3, 2, 1]) if (white[c]) { u = c; break; }
    const g = i => ((u - i + k) % k) + 1;
    up = [];
    for (let i = 0; i <= k * n; i++) up.push(g(i % k));
    if (u === 0) up[0] = 5;
  }
  return { up, down: up.slice(0, -1).reverse() };
}

/* 半音階(每個音固定一根手指,上下行相同):
   右手:黑鍵 3、白鍵 1,C 與 F 用 2(接在 B、E 之後);起音是 C 或 F 時用 1
   左手:黑鍵 3、白鍵 1,E 與 B 用 2 */
export function chromaticFinger(midi, hand, isStart){
  const pc = ((midi % 12) + 12) % 12;
  if (isBlack(pc)) return 3;
  if (hand === "rh") return (pc === 0 || pc === 5) && !isStart ? 2 : 1;
  return pc === 4 || pc === 11 ? 2 : 1;
}
export function chromaticFingers(notes, hand){
  const startMidi = midiOf(notes[0]);
  return notes.map((n, i) => { const m = midiOf(n); return chromaticFinger(m, hand, m === startMidi); });
}
