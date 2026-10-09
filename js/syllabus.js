/* 考試大綱 → 題目清單、篩選、隨機抽考 */

const ANY_START = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export function gradeOf(SY, system, grade){
  const s = SY.systems[system];
  return s && s.grades.find(g => g.grade === grade);
}
export function tempoFor(g, q){
  const t = g.tempo;
  if (q.type === "arpeggio") return t.arpeggio;
  if (q.type === "dom7" || q.type === "dim7") return t.four;
  if (q.type === "chromatic") return t.chromatic;
  return t.scale;
}

/* 精熟度的 key:同一個要求(不分系統/級數)共用一筆,ABRSM 3 級練熟的 C 大調在 Trinity 也算 */
export function masteryKey(q){
  return [q.type, q.tonic, q.quality || "-", q.form || "-", q.motion || "similar", q.hands, q.octaves, q.articulation].join("|");
}

/* 一個項目 → 每個調 × 每種奏法一題(小調形式由考生自選:依偏好挑) */
export function expandItem(g, item, prefs = {}){
  const keys = item.keys.length === 1 && item.keys[0] === "any" ? ANY_START : item.keys;
  const out = [];
  for (const tonic of keys) for (const articulation of item.articulation) {
    const q = {
      itemId: item.id, type: item.type, tonic, quality: item.quality || null,
      hands: item.motion === "contrary" ? "HT" : item.hands, octaves: item.octaves,
      articulation, motion: item.motion || "similar", forms: item.forms || null,
      dynamics: item.dynamics || null
    };
    if (q.type === "scale" && q.quality === "minor") {
      const pref = prefs.minorForm;
      q.form = item.forms.includes(pref) ? pref : item.forms.includes("harmonic") ? "harmonic" : item.forms[0];
    } else q.form = null;
    const tp = tempoFor(g, q);
    q.bpm = tp.bpm; q.sub = tp.sub;
    q.key = masteryKey(q);
    out.push(q);
  }
  return out;
}
export function questionsFor(g, prefs){ return g.items.flatMap(it => expandItem(g, it, prefs)); }

/* 分類(篩選用) */
export function categoryOf(q){
  if (q.type === "scale") return q.motion === "contrary" ? "contrary" : "scale";
  if (q.type === "chromatic") return "chromatic";
  if (q.type === "arpeggio") return "arpeggio";
  return "seventh";
}
export const CATEGORIES = [
  { id: "scale", zh: "音階" }, { id: "contrary", zh: "反向音階" }, { id: "arpeggio", zh: "琶音" },
  { id: "chromatic", zh: "半音階" }, { id: "seventh", zh: "屬七/減七" }
];

/* filter = { quality: "all"|"major"|"minor", cats: Set, excludeMastered: bool } */
export function applyFilter(qs, filter, mastery){
  return qs.filter(q => {
    if (filter.quality !== "all") {
      if (!q.quality) return false;                 // 半音階、減七沒有大小調
      if (filter.quality === "major" && q.quality !== "major") return false;
      if (filter.quality === "minor" && q.quality !== "minor") return false;
    }
    if (filter.cats && !filter.cats.has(categoryOf(q))) return false;
    if (filter.excludeMastered && mastery[q.key] === "good") return false;
    return true;
  });
}

/* 隨機抽一題:不重複上一題;待加強的權重加倍(多練) */
export function drawQuestion(pool, mastery, lastKey, rand = Math.random){
  if (!pool.length) return null;
  const cand = pool.length > 1 ? pool.filter(q => q.key !== lastKey) : pool;
  const w = cand.map(q => mastery[q.key] === "weak" ? 2 : 1);
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cand.length; i++) { r -= w[i]; if (r < 0) return pickVariant(cand[i], rand); }
  return pickVariant(cand[cand.length - 1], rand);
}
/* 抽到的題目再決定考官指定的力度(Trinity) */
function pickVariant(q, rand){
  const v = { ...q };
  if (q.dynamics) v.dynamic = q.dynamics[Math.floor(rand() * q.dynamics.length)];
  return v;
}
