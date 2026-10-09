/* localStorage(私密瀏覽、清除網站資料時可能讀不到或寫不進去:一律 try/catch,讀不到就用預設值) */
const KEY = "fingerdrill.v1";
const DEFAULTS = {
  system: "abrsm", grade: 1,
  filter: { quality: "all", cats: ["scale", "contrary", "arpeggio", "chromatic", "seventh"], excludeMastered: false },
  minorForm: "harmonic",
  tempoPct: 100,          // 練習速度 = 考試速度的幾 %(新題目沿用)
  mastery: {},            // masteryKey → "good" | "weak"
  theme: "dark"
};
let state = null;
export function load(){
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  state = { ...DEFAULTS, ...saved, filter: { ...DEFAULTS.filter, ...(saved.filter || {}) }, mastery: { ...(saved.mastery || {}) } };
  return state;
}
export function save(){
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
export function get(){ return state || load(); }
