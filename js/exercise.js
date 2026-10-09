/* 一道題目 → 兩手的音符(音高 + 指法)。題目格式見 js/syllabus.js 的 expandItem。 */
import {
  INTERVALS, parseNote, spellScale, scaleRun, startOctave, triadTones, dom7Tones, dim7Tones,
  chordRun, chromaticRun, midiOf, keyFifths, noteLabelStr
} from "./theory.js";
import { scaleFingers, triadFingers, fourNoteFingers, chromaticFingers, expandScale } from "./fingering.js";

const withF = (notes, fingers) => notes.map((n, i) => ({ ...n, midi: midiOf(n), finger: fingers[i] }));

/* 從 startOct 的主音往上 n 個八度(含頂端) */
function scaleUp(tonic, iv, startOct, n){
  return scaleRun(tonic, "major", null, "rh", n, { iv, startOct }).up;
}

function buildScaleHand(FG, q, hand){
  const t = parseNote(q.tonic);
  if (q.motion === "contrary" && hand === "lh") {
    // 左手從主音往下 n 個八度再回來:往下那段是「上行表」倒過來
    const iv = q.quality === "major" ? INTERVALS.major : INTERVALS[q.form];
    const downIv = q.quality !== "major" && q.form === "melodic" ? INTERVALS.natural : iv;
    const bottom = startOctave("lh", q.octaves, "contrary") - q.octaves;
    const upNotes = scaleUp(q.tonic, iv, bottom, q.octaves);
    const downSrc = scaleUp(q.tonic, downIv, bottom, q.octaves);
    const f = scaleFingers(FG, t, q.quality, q.form, "lh", q.octaves);
    const out = withF(downSrc.slice().reverse(), f.downAsc.slice().reverse());
    const back = withF(upNotes.slice(1), f.up.slice(1));
    return out.concat(back);
  }
  const startOct = startOctave(hand, q.octaves, q.motion, q.tonic);
  const run = scaleRun(q.tonic, q.quality, q.form, hand, q.octaves, { startOct });
  const f = scaleFingers(FG, t, q.quality, q.form, hand, q.octaves);
  return withF(run.up, f.up).concat(withF(run.down, f.down));
}

function buildArpHand(FG, q, hand){
  const so = startOctave(hand, q.octaves, "similar", q.tonic);
  if (q.type === "arpeggio") {
    const run = chordRun(triadTones(q.tonic, q.quality), so, q.octaves);
    const f = triadFingers(FG, parseNote(q.tonic), q.quality, hand, q.octaves);
    return withF(run.up, f.up).concat(withF(run.down, f.down));
  }
  const tones = q.type === "dom7" ? dom7Tones(q.tonic, q.quality) : dim7Tones(q.tonic);
  const run = chordRun(tones, startOctave(hand, q.octaves, "similar", tones[0]), q.octaves);   // 屬七從屬音起,八度照起音算
  const f = fourNoteFingers(tones, hand, q.octaves);
  return withF(run.up, f.up).concat(withF(run.down, f.down));
}

function buildChromaticHand(q, hand){
  const contrary = q.motion === "contrary";
  const so = contrary ? 4 : startOctave(hand, q.octaves, "similar", q.tonic);
  const run = chromaticRun(q.tonic, so, q.octaves, contrary && hand === "lh" ? "down" : "up");
  return withF(run.notes, chromaticFingers(run.notes, hand));
}

export function buildExercise(FG, q){
  const make = hand => q.type === "scale" ? buildScaleHand(FG, q, hand)
    : q.type === "chromatic" ? buildChromaticHand(q, hand)
    : buildArpHand(FG, q, hand);
  const rh = make("rh"), lh = make("lh");
  const fifths = q.type === "chromatic" || q.type === "dim7" ? 0 : keyFifths(q.tonic, q.quality);
  return { rh, lh, fifths, sub: q.sub };
}

/* ── 題目文字(考官點題的說法)── */
const OCT_ZH = ["", "一個八度", "兩個八度", "三個八度", "四個八度"];
const FORM_ZH = { harmonic: "和聲小調", melodic: "旋律小調", natural: "自然小調" };
export function keyNameZh(q){
  const n = noteLabelStr(q.tonic);
  if (q.type === "chromatic") return "從 " + n + " 開始的半音階";
  if (q.type === "dim7") return "從 " + n + " 開始的減七和弦琶音";
  if (q.type === "dom7") return n + (q.quality === "major" ? " 大調" : " 小調") + "的屬七和弦琶音";
  if (q.type === "arpeggio") return n + (q.quality === "major" ? " 大調" : " 小調") + "琶音";
  return n + " " + (q.quality === "major" ? "大調" : FORM_ZH[q.form]) + (q.motion === "contrary" ? "反向音階" : "音階");
}
export function questionText(q){
  const parts = [keyNameZh(q)];
  parts.push(q.motion === "contrary" ? "雙手反向" : q.hands === "HT" ? "雙手同時" : "雙手分開");
  parts.push(OCT_ZH[q.octaves] || q.octaves + " 個八度");
  parts.push(q.articulation === "staccato" ? "斷奏" : "圓滑奏");
  if (q.dynamic) parts.push(q.dynamic === "f" ? "強(f)" : "弱(p)");
  return parts;
}
