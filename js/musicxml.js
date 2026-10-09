/* 練習題 → MusicXML(OSMD 畫譜)。4/4(拍號不顯示),一拍 = 12 divisions。
   八分音符(sub 2)兩拍一組連桿、三連音(sub 3)與十六分(sub 4)一拍一組;最後一個音延長到小節結束。
   每個音都標指法:右手在上、左手在下。譜號依每小節的音域自動換(右手偏好高音譜號、左手偏好低音譜號)。 */
import { LETTERS } from "./theory.js";

const DIV = 12, BAR = 48;
const NOTE_TYPES = [[48, "whole", 0], [36, "half", 1], [24, "half", 0], [18, "quarter", 1], [12, "quarter", 0], [9, "eighth", 1], [6, "eighth", 0], [3, "16th", 0]];
function fitType(d){ for (const [len, type, dots] of NOTE_TYPES) if (len <= d) return { len, type, dots }; return { len: 3, type: "16th", dots: 0 }; }

/* 一隻手的音 → 依小節切開的事件 */
function layoutHand(notes, sub){
  const step = DIV / sub, events = [];
  let pos = 0;
  notes.forEach((n, i) => {
    const last = i === notes.length - 1;
    if (!last) { events.push({ n, pos, dur: step, short: true }); pos += step; return; }
    const remain = BAR - (pos % BAR);
    const t = fitType(remain);
    events.push({ n, pos, dur: t.len, type: t.type, dots: t.dots, short: false });
    pos += t.len;
    let r = remain - t.len;
    while (r > 0) { const rt = fitType(r); events.push({ rest: true, pos, dur: rt.len, type: rt.type, dots: rt.dots }); pos += rt.len; r -= rt.len; }
  });
  const measures = [];
  for (const e of events) { const m = Math.floor(e.pos / BAR); (measures[m] = measures[m] || []).push(e); }
  return measures;
}

/* 譜號:以一組連桿(八分兩拍、其他一拍)為單位看平均音高,超過門檻才換(有遲滯,不會來回跳) */
function clefPlan(measures, hand, sub){
  const g = sub === 2 ? 24 : 12;
  let cur = hand === "rh" ? "G" : "F";
  const plan = new Map();
  for (const evs of measures) {
    const groups = new Map();
    for (const e of evs) { const k = e.short ? Math.floor(e.pos / g) : "end" + e.pos; (groups.get(k) || groups.set(k, []).get(k)).push(e); }
    for (const arr of groups.values()) {
      const ms = arr.filter(e => !e.rest).map(e => e.n.midi);
      if (ms.length) {
        const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
        if (cur === "G" && avg < (hand === "rh" ? 55 : 57)) cur = "F";
        else if (cur === "F" && avg > (hand === "rh" ? 64 : 66)) cur = "G";
      }
      for (const e of arr) plan.set(e, cur);
    }
  }
  return plan;
}
const clefXml = (c, staff) => `<clef number="${staff}"><sign>${c}</sign><line>${c === "G" ? 2 : 4}</line></clef>`;

function noteXml(e, opts){
  const { staff, voice, sub, place, staccato, beam, tuplet } = opts;
  let x = "<note>";
  if (e.rest) {
    x += `<rest/><duration>${e.dur}</duration><voice>${voice}</voice><type>${e.type}</type>` + "<dot/>".repeat(e.dots) + `<staff>${staff}</staff></note>`;
    return x;
  }
  const n = e.n;
  x += `<pitch><step>${LETTERS[n.letter]}</step>${n.alter ? `<alter>${n.alter}</alter>` : ""}<octave>${n.octave}</octave></pitch>`;
  x += `<duration>${e.dur}</duration><voice>${voice}</voice>`;
  if (e.short) {
    x += `<type>${sub === 4 ? "16th" : "eighth"}</type>`;
    if (sub === 3) x += "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>";
  } else x += `<type>${e.type}</type>` + "<dot/>".repeat(e.dots);
  x += `<stem>${place === "above" ? "down" : "up"}</stem>`;   // 指法在符頭那側,不跟符桿打架
  x += `<staff>${staff}</staff>`;
  if (beam) { x += `<beam number="1">${beam}</beam>`; if (sub === 4) x += `<beam number="2">${beam}</beam>`; }
  x += "<notations>";
  if (tuplet) x += `<tuplet type="${tuplet}" bracket="no" show-number="${tuplet === "start" ? "actual" : "none"}" placement="${place === "above" ? "below" : "above"}"/>`;
  x += `<technical><fingering placement="${place}">${n.finger}</fingering></technical>`;
  if (staccato) x += `<articulations><staccato placement="${place === "above" ? "below" : "above"}"/></articulations>`;
  x += "</notations></note>";
  return x;
}

/* 一小節裡短音的連桿:同一組(sub 2 兩拍、其他一拍)≥2 個短音才連 */
function beamMarks(evs, sub){
  const g = sub === 2 ? 24 : 12, marks = new Map(), tup = new Map();
  const groups = new Map();
  evs.forEach(e => { if (e.short) { const k = Math.floor(e.pos / g); (groups.get(k) || groups.set(k, []).get(k)).push(e); } });
  for (const arr of groups.values()) {
    if (arr.length >= 2) arr.forEach((e, i) => marks.set(e, i === 0 ? "begin" : i === arr.length - 1 ? "end" : "continue"));
  }
  if (sub === 3) {
    const beats = new Map();
    evs.forEach(e => { if (e.short) { const k = Math.floor(e.pos / 12); (beats.get(k) || beats.set(k, []).get(k)).push(e); } });
    for (const arr of beats.values()) if (arr.length === 3) { tup.set(arr[0], "start"); tup.set(arr[2], "stop"); }
  }
  return { marks, tup };
}

/* show: "both" | "rh" | "lh" */
export function exerciseToMusicXML(ex, q, show = "both"){
  const hands = show === "both" ? ["rh", "lh"] : [show];
  const lay = hands.map(h => layoutHand(ex[h], ex.sub));
  const plans = hands.map((h, i) => clefPlan(lay[i], h, ex.sub));
  const clefNow = hands.map(() => null);
  const nMeasures = Math.max(...lay.map(l => l.length));
  const staves = hands.length;
  let body = "";
  for (let m = 0; m < nMeasures; m++) {
    body += `<measure number="${m + 1}">`;
    let attrs = "";
    if (m === 0) attrs += `<divisions>${DIV}</divisions><key><fifths>${ex.fifths}</fifths></key><time print-object="no"><beats>4</beats><beat-type>4</beat-type></time>` + (staves > 1 ? `<staves>${staves}</staves>` : "");
    hands.forEach((h, i) => { if (m === 0) { clefNow[i] = plans[i].get(lay[i][0][0]); attrs += clefXml(clefNow[i], i + 1); } });
    if (attrs) body += `<attributes>${attrs}</attributes>`;
    if (m === 0 && q.dynamic) body += `<direction placement="below"><direction-type><dynamics><${q.dynamic}/></dynamics></direction-type><staff>1</staff></direction>`;
    hands.forEach((h, i) => {
      if (i > 0) body += `<backup><duration>${BAR}</duration></backup>`;
      const evs = lay[i][m] || [];
      const { marks, tup } = beamMarks(evs, ex.sub);
      const place = h === "rh" ? "above" : "below";
      for (const e of evs) {
        const c = plans[i].get(e);
        if (c !== clefNow[i]) { body += `<attributes>${clefXml(c, i + 1)}</attributes>`; clefNow[i] = c; }
        body += noteXml(e, { staff: i + 1, voice: h === "rh" ? 1 : 5, sub: ex.sub, place, staccato: q.articulation === "staccato", beam: marks.get(e), tuplet: tup.get(e) });
      }
    });
    if (m === nMeasures - 1) body += `<barline location="right"><bar-style>light-heavy</bar-style></barline>`;
    body += "</measure>";
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1"><part-list><score-part id="P1"><part-name print-object="no">Piano</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
}

/* 播放時間表:每個音的起點(拍)與長度(拍),兩手同一份時間軸。
   HS(雙手分開)而且顯示兩手時:右手彈完、空一小節再彈左手 */
export function playbackEvents(ex, q, show = "both"){
  const out = [], step = 1 / ex.sub;
  const handEvents = (notes, offset, hand) => notes.forEach((n, i) => {
    const last = i === notes.length - 1;
    out.push({ midi: n.midi, beat: offset + i * step, len: last ? 2 : step, hand, idx: i });
  });
  const len = (notes) => (notes.length - 1) * step + 2;
  if (show !== "both") handEvents(ex[show], 0, show);
  else if (q.hands === "HS") { handEvents(ex.rh, 0, "rh"); handEvents(ex.lh, Math.ceil(len(ex.rh) / 4) * 4 + 4, "lh"); }
  else { handEvents(ex.rh, 0, "rh"); handEvents(ex.lh, 0, "lh"); }
  return out;
}
