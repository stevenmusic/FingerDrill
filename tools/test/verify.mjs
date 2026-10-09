/* 程式自動驗證(不需要瀏覽器):
   1. data/syllabus.json 結構
   2. data/fingerings.json 結構(長度、手指 1~5、循環一致)
   3. 每個系統 × 級數 × 題目,再加上「所有調 × 所有題型 × 1~4 個八度」:音高、拼法、指法完整與可彈性
   4. MusicXML:每小節每個譜表的時值 = 4 拍、指法數 = 音數
   用法:node tools/test/verify.mjs */
import fs from "node:fs";
import { buildExercise } from "../../js/exercise.js";
import { questionsFor } from "../../js/syllabus.js";
import { exerciseToMusicXML } from "../../js/musicxml.js";
import { INTERVALS, parseNote, pcOf, midiOf, isBlack } from "../../js/theory.js";

const root = new URL("../../", import.meta.url);
const SY = JSON.parse(fs.readFileSync(new URL("data/syllabus.json", root)));
const FG = JSON.parse(fs.readFileSync(new URL("data/fingerings.json", root)));
let fails = 0, checks = 0;
const fail = (msg) => { fails++; if (fails <= (process.env.ALL ? 1e9 : 60)) console.log("✗ " + msg); };
const ok = (cond, msg) => { checks++; if (!cond) fail(msg); return cond; };

/* ── 1. syllabus.json ── */
const TYPES = ["scale", "arpeggio", "chromatic", "dom7", "dim7"];
const KEY_RE = /^([A-G](#|b)?|any)$/;
for (const [sk, sys] of Object.entries(SY.systems)) {
  ok(typeof sys.name === "string" && Array.isArray(sys.grades), `${sk}: name/grades`);
  const seen = new Set();
  for (const g of sys.grades) {
    const at = `${sk} G${g.grade}`;
    ok(Number.isInteger(g.grade) && !seen.has(g.grade), `${at}: grade 重複或不是整數`); seen.add(g.grade);
    ok(typeof g.verified === "boolean", `${at}: 缺 verified`);
    for (const t of ["scale", "arpeggio", "chromatic", "four"]) ok(g.tempo && g.tempo[t] && g.tempo[t].bpm >= 30 && [2, 3, 4].includes(g.tempo[t].sub), `${at}: tempo.${t}`);
    const ids = new Set();
    for (const it of g.items) {
      const ia = `${at} ${it.id}`;
      ok(!ids.has(it.id), `${ia}: id 重複`); ids.add(it.id);
      ok(TYPES.includes(it.type), `${ia}: type`);
      ok(Array.isArray(it.keys) && it.keys.length && it.keys.every(k => KEY_RE.test(k)), `${ia}: keys`);
      ok(["HS", "HT"].includes(it.hands), `${ia}: hands`);
      ok([1, 2, 3, 4].includes(it.octaves), `${ia}: octaves`);
      ok(Array.isArray(it.articulation) && it.articulation.every(a => ["legato", "staccato"].includes(a)), `${ia}: articulation`);
      if (it.type === "scale" || it.type === "arpeggio") ok(["major", "minor"].includes(it.quality), `${ia}: quality`);
      if (it.type === "scale") ok(["similar", "contrary"].includes(it.motion), `${ia}: motion`);
      if (it.type === "scale" && it.quality === "minor") ok(Array.isArray(it.forms) && it.forms.length && it.forms.every(f => ["harmonic", "melodic", "natural"].includes(f)), `${ia}: forms`);
      if (it.motion === "contrary") ok(it.hands === "HT", `${ia}: 反向要雙手`);
      if (it.dynamics) ok(it.dynamics.every(d => ["f", "p"].includes(d)), `${ia}: dynamics`);
    }
  }
}

/* ── 2. fingerings.json ── */
const PCS = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
for (const [form, table] of Object.entries(FG.scale)) for (const k of PCS) {
  const e = table[k];
  if (!ok(e, `指法表缺 scale/${form}/${k}`)) continue;
  for (const [h, s] of Object.entries(e)) {
    ok(/^[1-5]{15}$/.test(s), `scale/${form}/${k}/${h}: 要 15 個 1~5`);
    ok(s.slice(1, 7) === s.slice(8, 14), `scale/${form}/${k}/${h}: 第一個八度與循環不一致`);
  }
}
for (const [q, table] of Object.entries(FG.arpeggio)) for (const k of PCS) {
  const e = table[k];
  if (!ok(e, `指法表缺 arpeggio/${q}/${k}`)) continue;
  for (const [h, s] of Object.entries(e)) {
    ok(/^[1-5]{7}$/.test(s), `arpeggio/${q}/${k}/${h}: 要 7 個 1~5`);
    ok(s.slice(1, 3) === s.slice(4, 6), `arpeggio/${q}/${k}/${h}: 第一組與循環不一致`);
  }
}

/* ── 3. 題目的音高與指法 ── */
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
function spellingOk(n){ return ((LETTER_PC[n.letter] + n.alter - (n.midi - 12 * (n.octave + 1))) % 12 === 0) && Math.abs(n.alter) <= 2; }
const ALL_BLACK_TRIADS = new Set(["arpeggio|major|6", "arpeggio|minor|3"]);   // F♯ 大三、E♭ 小三:三個都是黑鍵
function expectScaleMidis(q, hand, tonicMidi){
  const iv = q.quality === "major" ? INTERVALS.major : INTERVALS[q.form];
  const down = q.quality !== "major" && q.form === "melodic" ? INTERVALS.natural : iv;
  const seq = (ivs, n) => { const a = []; for (let o = 0; o < n; o++) for (const x of ivs) a.push(12 * o + x); a.push(12 * n); return a; };
  const up = seq(iv, q.octaves), dn = seq(down, q.octaves);
  if (q.motion === "contrary" && hand === "lh") {
    // 從主音往下(下行用 down 的音)再回來(上行用 up 的音);全部相對最低音
    const outward = dn.slice().reverse(), back = up.slice(1);
    return outward.concat(back).map(x => tonicMidi - 12 * q.octaves + x);
  }
  return up.concat(dn.slice(0, -1).reverse()).map(x => tonicMidi + x);
}
function checkPlayable(notes, hand, label, q){
  // 依音高由低到高看相鄰兩個音(上下行同一個音同一根手指,所以只看上行那段)
  const peak = notes.reduce((b, n, i) => (hand === "lh" && q.motion === "contrary" && q.type === "scale") ? b : (n.midi > notes[b].midi ? i : b), 0);
  let asc;
  if (q.motion === "contrary" && hand === "lh") {
    const low = notes.reduce((b, n, i) => n.midi < notes[b].midi ? i : b, 0);
    asc = notes.slice(low);                     // 回程:從最低音往上
  } else asc = notes.slice(0, peak + 1);
  for (let i = 0; i + 1 < asc.length; i++) {
    const a = asc[i].finger, b = asc[i + 1].finger, at = `${label} ${hand} 第 ${i + 1}→${i + 2} 個音(${a}→${b})`;
    if (hand === "rh") ok(b > a || (b === 1 && [2, 3, 4].includes(a)), at + " 右手上行不能這樣接");
    else ok(b < a || (a === 1 && [2, 3, 4].includes(b)), at + " 左手上行不能這樣接");
    if (q.type === "scale") ok(b === 1 ? true : (hand === "rh" ? b === a + 1 : b === a - 1 || a === 1), at + " 音階手指要連續");
  }
  // 下行段:每個音的手指要等於上行同一個音的手指(旋律小調除外:上下行音不同)
  for (const n of notes) {
    ok(Number.isInteger(n.finger) && n.finger >= 1 && n.finger <= 5, `${label} ${hand}: 指法缺漏`);
    if (n.finger === 1 && isBlack(n.midi)) {
      const allBlack = ALL_BLACK_TRIADS.has(`${q.type}|${q.quality}|${pcOf(parseNote(q.tonic))}`);
      ok(allBlack, `${label} ${hand}: 拇指在黑鍵 ${n.midi}`);
    }
  }
  // 5 指只出現在兩端(半音階不會用 5)
  notes.forEach((n, i) => { if (n.finger === 5) { const ext = notes.every(m => m.midi <= n.midi) || notes.every(m => m.midi >= n.midi); ok(ext, `${label} ${hand}: 5 指不在最高/最低音`); } });
}
function checkQuestion(q, label){
  let ex;
  try { ex = buildExercise(FG, q); } catch (e) { fail(`${label}: 產生失敗 ${e.message}`); return; }
  for (const hand of ["rh", "lh"]) {
    const notes = ex[hand];
    notes.forEach((n, i) => ok(spellingOk(n), `${label} ${hand} 第 ${i + 1} 個音拼法與音高不符`));
    ok(notes.every(n => n.midi >= 21 && n.midi <= 108), `${label} ${hand}: 超出鋼琴音域 A0–C8`);
    const t = parseNote(q.tonic);
    const tonicMidi = notes[0].midi;
    if (q.type !== "dom7") ok(pcOf(t) === ((tonicMidi % 12) + 12) % 12, `${label} ${hand}: 起音不是 ${q.tonic}`);
    ok(notes[notes.length - 1].midi === tonicMidi, `${label} ${hand}: 結束音不是起音`);
    if (q.type === "scale") {
      const exp = expectScaleMidis(q, hand, tonicMidi);
      ok(notes.length === exp.length && notes.every((n, i) => n.midi === exp[i]), `${label} ${hand}: 音高錯誤`);
      // 相鄰音的字母要連續(音階每級一個字母)
      for (let i = 0; i + 1 < notes.length; i++) { const d = ((notes[i + 1].letter - notes[i].letter) % 7 + 7) % 7; ok(d === 1 || d === 6, `${label} ${hand}: 字母不連續`); }
    } else if (q.type === "chromatic") {
      ok(notes.length === 24 * q.octaves + 1, `${label} ${hand}: 半音階音數`);
      for (let i = 0; i + 1 < notes.length; i++) ok(Math.abs(notes[i + 1].midi - notes[i].midi) === 1, `${label} ${hand}: 半音階不是半音`);
    } else {
      const ivs = q.type === "arpeggio" ? (q.quality === "major" ? [0, 4, 7] : [0, 3, 7]) : q.type === "dom7" ? [0, 4, 7, 10] : [0, 3, 6, 9];
      const k = ivs.length;
      ok(notes.length === 2 * k * q.octaves + 1, `${label} ${hand}: 琶音音數`);
      const root = q.type === "dom7" ? null : tonicMidi;
      const base = notes[0].midi;
      for (let i = 0; i <= k * q.octaves; i++) ok(notes[i].midi === base + 12 * Math.floor(i / k) + ivs[i % k], `${label} ${hand}: 琶音第 ${i + 1} 個音`);
      if (q.type === "dom7") { const key = pcOf(t); ok(((base - key - 7) % 12 + 12) % 12 === 0, `${label}: 屬七要從屬音開始`); }
      void root;
    }
    if (q.motion === "contrary") ok(ex.rh[0].midi === ex.lh[0].midi, `${label}: 反向要從同一個音開始`);
    checkPlayable(notes, hand, label, q);
  }
  // MusicXML:每小節每個譜表 48 divisions、指法數 = 音數
  for (const show of ["both", "rh", "lh"]) {
    const xml = exerciseToMusicXML(ex, q, show);
    const measures = xml.split("<measure ").slice(1);
    for (const m of measures) {
      const parts = m.split("<backup>");
      parts.forEach((p, si) => {
        const sum = [...p.matchAll(/<note>(?:(?!<\/note>).)*?<duration>(\d+)<\/duration>/gs)].reduce((a, x) => a + Number(x[1]), 0);
        ok(sum === 48, `${label} ${show}: 小節時值 ${sum} ≠ 48`);
      });
    }
    checkNotation(xml, `${label} ${show}`, ex.sub);
    const nNotes = (xml.match(/<pitch>/g) || []).length, nF = (xml.match(/<fingering /g) || []).length;
    const expN = show === "both" ? ex.rh.length + ex.lh.length : ex[show].length;
    ok(nNotes === expN && nF === expN, `${label} ${show}: 音數 ${nNotes} / 指法 ${nF} / 應為 ${expN}`);
    const beg = (xml.match(/<beam number="1">begin/g) || []).length, end = (xml.match(/<beam number="1">end/g) || []).length;
    ok(beg === end, `${label} ${show}: 連桿沒有成對`);
  }
}

/* ── 4. 記譜規則(自己重新讀 MusicXML 檢查,不沿用產生器的程式) ──
   符桿方向、臨時記號、休止符位置、長音位置、連桿不跨拍、三連音成組、加線不超過 3 條 */
const LET = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const MID = { G: 34, F: 22 }, TOP = { G: 38, F: 26 }, BOT = { G: 30, F: 18 };
function keyAltersT(f){ const a = [0, 0, 0, 0, 0, 0, 0], o = [3, 0, 4, 1, 5, 2, 6]; if (f > 0) for (let i = 0; i < f; i++) a[o[i]] = 1; else for (let i = 0; i < -f; i++) a[o[6 - i]] = -1; return a; }
const ACCN = { "flat-flat": -2, flat: -1, natural: 0, sharp: 1, "double-sharp": 2 };
let maxLedger = 0;
function checkNotation(xml, label, sub){
  const fifths = Number(/<fifths>(-?\d+)<\/fifths>/.exec(xml)[1]), keyA = keyAltersT(fifths);
  const clef = {}, shift = {};
  const measures = xml.split("<measure ").slice(1);
  for (const [mi, m] of measures.entries()) {
    const tokens = [...m.matchAll(/<clef number="(\d)"><sign>([GF])<\/sign>|<octave-shift type="(\w+)"[^>]*\/><\/direction-type><staff>(\d)<\/staff>|<note>(.*?)<\/note>|<backup>/gs)];
    const pos = { 1: 0, 2: 0 }, acc = { 1: new Map(), 2: new Map() };
    let staffCur = 1, group = [], tupN = 0;
    const flushGroup = () => {
      if (!group.length) return;
      const st = new Set(group.map(g => g.stem));
      ok(st.size === 1, `${label} m${mi + 1}: 同一組連桿符桿方向不一致`);
      let far = 0; for (const g of group) { const d = g.step - MID[g.clef]; if (Math.abs(d) > Math.abs(far) || (Math.abs(d) === Math.abs(far) && d > far)) far = d; }
      ok(group[0].stem === (far >= 0 ? "down" : "up"), `${label} m${mi + 1}: 符桿方向不符(最遠的音離中線 ${far})`);
      const span = sub === 2 ? 24 : 12;
      ok(Math.floor(group[0].pos / span) === Math.floor(group[group.length - 1].pos / span), `${label} m${mi + 1}: 連桿跨拍`);
      group = [];
    };
    for (const t of tokens) {
      if (t[1]) { clef[t[1]] = t[2]; continue; }
      if (t[3]) { shift[t[4]] = t[3] === "down" ? 7 : t[3] === "up" ? -7 : 0; continue; }
      if (t[0] === "<backup>") { flushGroup(); continue; }
      const body = t[5], dur = Number(/<duration>(\d+)/.exec(body)[1]), staff = Number(/<staff>(\d)/.exec(body)[1]);
      staffCur = staff;
      const p0 = pos[staff];
      if (/<rest\/>/.test(body)) {
        ok(p0 % 12 === 0, `${label} m${mi + 1}: 休止符不在拍點`);
        ok(!/<dot\/>/.test(body), `${label} m${mi + 1}: 附點休止符`);
        if (dur === 24) ok(p0 === 0 || p0 === 24, `${label} m${mi + 1}: 二分休止符不在第 1、3 拍`);
        pos[staff] += dur; continue;
      }
      const step = LET[/<step>(\w)/.exec(body)[1]], oct = Number(/<octave>(-?\d+)/.exec(body)[1]);
      const alter = Number((/<alter>(-?\d+)/.exec(body) || [0, 0])[1]);
      const disp = oct * 7 + step - (shift[staff] || 0), c = clef[staff];
      // 加線
      const led = disp > TOP[c] ? Math.floor((disp - TOP[c]) / 2) : disp < BOT[c] ? Math.floor((BOT[c] - disp) / 2) : 0;
      maxLedger = Math.max(maxLedger, led);
      ok(led <= 3, `${label} m${mi + 1}: ${led} 條加線`);
      // 臨時記號
      const real = oct * 7 + step;   // 臨時記號依實際音高(不受譜號、8va 影響)
      const cur = acc[staff].has(real) ? acc[staff].get(real) : keyA[step];
      const a = /<accidental>([\w-]+)<\/accidental>/.exec(body);
      if (alter !== cur) ok(a && ACCN[a[1]] === alter, `${label} m${mi + 1}: 缺臨時記號(音 ${step}/${alter})`);
      else ok(!a, `${label} m${mi + 1}: 多餘的臨時記號`);
      acc[staff].set(real, alter);
      // 長音位置
      const type = /<type>(\w+)/.exec(body)[1], dotted = /<dot\/>/.test(body);
      if (type === "whole") ok(p0 === 0, `${label} m${mi + 1}: 全音符不在第 1 拍`);
      if (type === "half") ok(!dotted && (p0 === 0 || p0 === 24), `${label} m${mi + 1}: 二分音符位置不對`);
      // 三連音
      if (/<time-modification>/.test(body)) { if (/<tuplet type="start"/.test(body)) { ok(tupN === 0, `${label}: 三連音沒有結束`); tupN = 1; } else { tupN++; if (/<tuplet type="stop"/.test(body)) { ok(tupN === 3, `${label}: 三連音不是 3 個`); tupN = 0; } } }
      // 符桿
      const stem = (/<stem>(\w+)/.exec(body) || [])[1];
      if (type !== "whole") ok(!!stem, `${label} m${mi + 1}: 缺符桿方向`);
      const beam = (/<beam number="1">(\w+)/.exec(body) || [])[1];
      if (beam) { group.push({ stem, step: disp, clef: c, pos: p0 }); if (beam === "end") flushGroup(); }
      else if (stem) { let d = disp - MID[c]; ok(stem === (d >= 0 ? "down" : "up"), `${label} m${mi + 1}: 單音符桿方向不符`); }
      pos[staff] += dur;
    }
    flushGroup(); void staffCur;
  }
}

// 3a. 大綱裡的每一題(每種小調形式)
let nSyl = 0;
for (const [sk, sys] of Object.entries(SY.systems)) for (const g of sys.grades) for (const mf of ["harmonic", "melodic", "natural"]) {
  for (const q of questionsFor(g, { minorForm: mf })) { nSyl++; checkQuestion(q, `${sk} G${g.grade} ${q.key}`); }
}
// 3b. 全部組合
const MAJ = ["C", "G", "D", "A", "E", "B", "F#", "Gb", "C#", "Db", "Ab", "Eb", "Bb", "F", "Cb"];
const MIN = ["A", "E", "B", "F#", "C#", "G#", "D#", "Eb", "Bb", "F", "C", "G", "D", "A#"];
const STARTS = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
let nAll = 0;
for (const oct of [1, 2, 3, 4]) {
  const base = { hands: "HT", octaves: oct, articulation: "legato", sub: 4, bpm: 60 };
  for (const motion of oct <= 2 ? ["similar", "contrary"] : ["similar"]) {   // 反向最多兩個八度(從中央 C 附近起,三、四個八度會超出鍵盤或不是考試要求)
    for (const k of MAJ) { nAll++; checkQuestion({ ...base, type: "scale", tonic: k, quality: "major", motion }, `全部 ${k} 大調 ${motion} ${oct}`); }
    for (const k of MIN) for (const form of ["harmonic", "melodic", "natural"]) { nAll++; checkQuestion({ ...base, type: "scale", tonic: k, quality: "minor", form, motion }, `全部 ${k} ${form} ${motion} ${oct}`); }
    for (const k of STARTS) { nAll++; checkQuestion({ ...base, type: "chromatic", tonic: k, motion }, `全部 半音階 ${k} ${motion} ${oct}`); }
  }
  for (const k of MAJ) { nAll += 2; checkQuestion({ ...base, type: "arpeggio", tonic: k, quality: "major", sub: 3 }, `全部 ${k} 大調琶音 ${oct}`); checkQuestion({ ...base, type: "dom7", tonic: k, quality: "major" }, `全部 ${k} 屬七 ${oct}`); }
  for (const k of MIN) { nAll += 2; checkQuestion({ ...base, type: "arpeggio", tonic: k, quality: "minor", sub: 3 }, `全部 ${k} 小調琶音 ${oct}`); checkQuestion({ ...base, type: "dom7", tonic: k, quality: "minor" }, `全部 ${k} 小調屬七 ${oct}`); }
  for (const k of STARTS) { nAll++; checkQuestion({ ...base, type: "dim7", tonic: k }, `全部 減七 ${k} ${oct}`); }
}

console.log(`最多加線 ${maxLedger} 條`);
console.log(`\n大綱題目 ${nSyl} 題(含三種小調形式)、全部組合 ${nAll} 題,共 ${checks} 項檢查。`);
if (fails) { console.log(`✗ ${fails} 項失敗`); process.exit(1); }
console.log("✓ 全部通過");
