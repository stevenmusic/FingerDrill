/* FingerDrill 主程式:音階抽考 */
import * as store from "./store.js";
import { gradeOf, questionsFor, applyFilter, drawQuestion, categoryOf, CATEGORIES, expandItem } from "./syllabus.js";
import { buildExercise, keyNameZh, questionText } from "./exercise.js";
import { exerciseToMusicXML, playbackEvents } from "./musicxml.js";
import * as audio from "./audio.js";

const $ = id => document.getElementById(id);
const S = store.load();
let SY = null, FG = null;
let cur = null;          // 目前的題目
let ex = null;           // 目前題目的音符
let show = "both";       // 樂譜顯示哪隻手
let bpm = 60;
let lastKey = null;
let osmd = null, cursorSteps = [], cursorIdx = 0, cursorOn = false;

/* ── 主題 ── */
function applyTheme(){
  const light = S.theme === "light";
  document.body.classList.toggle("light", light);
  $("themeToggle").setAttribute("aria-pressed", String(light));
  document.querySelector('meta[name="theme-color"]').content = light ? "#FBF7EE" : "#0C0A07";
}
$("themeToggle").onclick = () => { S.theme = S.theme === "light" ? "dark" : "light"; store.save(); applyTheme(); };
applyTheme();

/* ── 設定 ── */
function segBind(id, get, set){
  const seg = $(id);
  const sync = () => seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === get())));
  seg.onclick = e => { const b = e.target.closest("button"); if (!b || b.disabled) return; set(b.dataset.v); sync(); };
  sync();
  return sync;
}
function grade(){ return gradeOf(SY, S.system, S.grade); }
function allQuestions(){ return questionsFor(grade(), { minorForm: S.minorForm }); }
function filterObj(){ return { quality: S.filter.quality, cats: new Set(S.filter.cats), excludeMastered: S.filter.excludeMastered }; }
function pool(){ return applyFilter(allQuestions(), filterObj(), S.mastery); }

function fillGrades(){
  const sys = SY.systems[S.system];
  if (!sys.grades.some(g => g.grade === S.grade)) S.grade = sys.grades[0].grade;
  $("selGrade").innerHTML = sys.grades.map(g => `<option value="${g.grade}">${g.grade} 級${g.verified ? "" : "(未核對)"}</option>`).join("");
  $("selGrade").value = String(S.grade);
}
function renderCats(){
  const present = new Set(allQuestions().map(categoryOf));
  $("catChips").innerHTML = CATEGORIES.filter(c => present.has(c.id)).map(c =>
    `<button class="chip" data-cat="${c.id}" aria-pressed="${S.filter.cats.includes(c.id)}">${c.zh}</button>`).join("");
}
$("catChips").onclick = e => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  const c = b.dataset.cat, on = S.filter.cats.includes(c);
  S.filter.cats = on ? S.filter.cats.filter(x => x !== c) : S.filter.cats.concat(c);
  b.setAttribute("aria-pressed", String(!on));
  store.save(); refreshMeta();
};
$("excludeMastered").onclick = () => {
  S.filter.excludeMastered = !S.filter.excludeMastered; store.save();
  $("excludeMastered").setAttribute("aria-pressed", String(S.filter.excludeMastered)); refreshMeta();
};
$("selGrade").onchange = () => { S.grade = Number($("selGrade").value); store.save(); onGradeChange(); };
$("selMinor").onchange = () => { S.minorForm = $("selMinor").value; store.save(); onGradeChange(true); };
$("setupToggle").onclick = () => {
  const open = !$("setupCard").classList.contains("open");
  $("setupCard").classList.toggle("open", open);
  $("setupToggle").setAttribute("aria-expanded", String(open));
};

function refreshMeta(){
  const g = grade(), sys = SY.systems[S.system];
  const n = pool().length, all = allQuestions();
  $("poolCount").textContent = `抽考範圍 ${n} 題`;
  $("verifyBadge").hidden = g.verified;
  $("verifyNote").textContent = g.verified ? "" : `${sys.name} ${g.grade} 級的要求尚未核對官方大綱(${g.note})。`;
  const qz = { all: "大小調", major: "大調", minor: "小調" }[S.filter.quality];
  $("setupSummary").textContent = `${sys.name} · ${g.grade} 級 · ${qz} · ${n} 題` + (S.filter.excludeMastered ? " · 排除熟練" : "");
  $("drawBtn").disabled = n === 0;
  const good = all.filter(q => S.mastery[q.key] === "good").length;
  $("listSub").textContent = `熟練 ${good} / ${all.length}`;
  $("progressBar").style.width = (all.length ? 100 * good / all.length : 0) + "%";
  renderList();
}
function onGradeChange(keepCur){
  fillGrades(); renderCats(); refreshMeta();
  if (cur && keepCur) {
    // 小調形式改了:同一題換成新的形式
    const same = allQuestions().find(q => q.itemId === cur.itemId && q.tonic === cur.tonic && q.articulation === cur.articulation);
    if (same) setQuestion({ ...same, dynamic: cur.dynamic });
  }
}

/* ── 本級要求清單 ── */
function shortLabel(q){
  const t = questionText(q);
  return t[0] + (q.articulation === "staccato" ? "(斷奏)" : "");
}
function renderList(){
  const qs = allQuestions();
  const html = CATEGORIES.map(c => {
    const list = qs.filter(q => categoryOf(q) === c.id);
    if (!list.length) return "";
    return `<div class="group"><h3>${c.zh}</h3><div class="qlist">` + list.map(q => {
      const m = S.mastery[q.key] || "";
      const hands = q.motion === "contrary" ? "反向" : q.hands === "HT" ? "雙手同時" : "分手";
      return `<button class="qrow${cur && cur.key === q.key ? " cur" : ""}" data-key="${q.key}"><i class="dot ${m}"></i><span>${shortLabel(q)}</span><small>${hands} · ${q.octaves}八度</small></button>`;
    }).join("") + "</div></div>";
  }).join("");
  $("qGroups").innerHTML = html;
}
$("qGroups").onclick = e => {
  const b = e.target.closest("[data-key]"); if (!b) return;
  const q = allQuestions().find(x => x.key === b.dataset.key);
  if (q) { setQuestion(q.dynamics ? { ...q, dynamic: q.dynamics[0] } : q); $("quizCard").scrollIntoView({ behavior: "smooth", block: "start" }); }
};

/* ── 題目 ── */
$("drawBtn").onclick = () => {
  const q = drawQuestion(pool(), S.mastery, lastKey);
  if (q) setQuestion(q);
};
function setQuestion(q){
  stopPlayback();
  cur = q; lastKey = q.key;
  ex = buildExercise(FG, q);
  show = q.hands === "HS" ? "rh" : "both";
  syncHandSeg();
  const parts = questionText(q);
  $("qTitle").textContent = parts[0];
  $("qTitle").classList.remove("empty");
  $("qTags").innerHTML = parts.slice(1).map((t, i) => `<span class="q-tag${q.dynamic && i === parts.length - 2 ? " dyn" : ""}">${t}</span>`).join("");
  $("playBtn").disabled = false;
  document.querySelectorAll(".mbtn").forEach(b => b.disabled = false);
  syncMastery();
  bpm = Math.max(30, Math.min(200, Math.round(q.bpm * S.tempoPct / 100)));
  syncTempo();
  renderScore();
  renderList();
  preloadSamples();
}
function syncMastery(){
  const m = cur && S.mastery[cur.key];
  document.querySelectorAll(".mbtn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
}
document.querySelectorAll(".mbtn").forEach(b => b.onclick = () => {
  if (!cur) return;
  const m = b.dataset.m;
  if (S.mastery[cur.key] === m) delete S.mastery[cur.key]; else S.mastery[cur.key] = m;
  store.save(); syncMastery(); refreshMeta();
});

/* ── 樂譜 ── */
const syncHandSeg = segBind("handSeg", () => show, v => { show = v; stopPlayback(); renderScore(); });
let renderSeq = 0;
async function renderScore(){
  if (!cur) return;
  const seq = ++renderSeq;
  const xml = exerciseToMusicXML(ex, cur, show);
  if (!osmd) {
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay($("osmd"), {
      backend: "svg", autoResize: true, drawTitle: false, drawSubtitle: false, drawComposer: false, drawPartNames: false,
      drawMeasureNumbers: false, drawingParameters: "compacttight", followCursor: true,
      cursorsOptions: [{ type: 0, color: "#F2B94B", alpha: 0.45, follow: true }]
    });
    osmd.EngravingRules.StretchLastSystemLine = true;   // 最後一行也撐滿寬度(短的音階只有一行)
  }
  $("paperMsg").textContent = "";
  try {
    await osmd.load(xml);
    if (seq !== renderSeq) return;
    osmd.zoom = window.innerWidth < 600 ? 0.72 : 0.9;
    osmd.render();
    buildCursorSteps();
  } catch (e) {
    console.error(e);
    $("paperMsg").textContent = "樂譜繪製失敗:" + e.message;
  }
  window.__lastXml = xml;
  window.__scoreReady = (window.__scoreReady || 0) + 1;
}
function buildCursorSteps(){
  cursorSteps = [];
  const c = osmd.cursor;
  c.reset();
  let guard = 0;
  while (!c.Iterator.EndReached && guard++ < 2000) { cursorSteps.push(c.Iterator.currentTimeStamp.RealValue * 4); c.next(); }
  c.reset(); c.hide(); cursorOn = false;
}
window.addEventListener("resize", () => { if (osmd && cur) { const z = window.innerWidth < 600 ? 0.72 : 0.9; if (osmd.zoom !== z) { osmd.zoom = z; osmd.render(); buildCursorSteps(); } } });

/* ── 速度 ── */
function syncTempo(){
  $("bpmVal").textContent = bpm;
  $("bpmRange").value = bpm;
  if (cur) {
    const pct = Math.round(100 * bpm / cur.bpm);
    $("bpmPct").textContent = pct === 100 ? "考試速度" : `考試速度的 ${pct}%`;
    const unit = { 2: "八分音符", 3: "三連音", 4: "十六分音符" }[cur.sub];
    $("examTempo").textContent = `考試速度 ♩ = ${cur.bpm}(每拍 ${cur.sub} 個音,${unit})`;
    $("metroInfo").textContent = `每拍 ${cur.sub} 個音`;
  }
  metroRetime();
}
function setBpm(v, fromUser){
  bpm = Math.max(30, Math.min(200, Math.round(v)));
  if (fromUser && cur) { S.tempoPct = Math.round(100 * bpm / cur.bpm); store.save(); }
  syncTempo();
}
$("bpmDown").onclick = () => setBpm(bpm - 2, true);
$("bpmUp").onclick = () => setBpm(bpm + 2, true);
$("bpmRange").oninput = () => setBpm(Number($("bpmRange").value), true);
$("bpmReset").onclick = () => { if (cur) { S.tempoPct = 100; store.save(); setBpm(cur.bpm); } };

/* ── 音訊 ── */
const VEL = { f: 92, p: 42 };
function demoVel(){ return cur && cur.dynamic ? VEL[cur.dynamic] : 64; }
let samplesReady = false;
async function preloadSamples(){
  if (!cur) return;
  try {
    audio.ensureAudio();
    const notes = ex.rh.concat(ex.lh).map(n => ({ midi: n.midi, vel: demoVel() }));
    $("loadingMsg").textContent = "載入鋼琴取樣…";
    await audio.loadPianoFor(notes, 6, p => { $("loadingMsg").textContent = `載入鋼琴取樣… ${Math.round(p * 100)}%`; });
    await audio.loadClick().catch(() => {});
    samplesReady = true;
    $("loadingMsg").textContent = "";
  } catch (e) {
    $("loadingMsg").textContent = "鋼琴取樣載入失敗(需要網路,之後會存在裝置上)";
  }
}

/* ── 示範播放:預備拍一小節 + 每拍節拍器 ── */
let play = null;   // { t0, events, endBeat, raf }
async function startPlayback(){
  if (!cur) return;
  stopMetronome();
  const ctx = audio.ensureAudio();
  if (ctx.state === "suspended") await ctx.resume();
  $("playLabel").textContent = "準備中…";
  await preloadSamples();
  await audio.masterReady;
  if (!samplesReady) { $("playLabel").textContent = "播放示範"; return; }
  const events = playbackEvents(ex, cur, show);
  const spb = 60 / bpm, count = 4;
  const t0 = ctx.currentTime + 0.15 + count * spb;
  const stacc = cur.articulation === "staccato";
  const vel = demoVel();
  // 同一隻手:下一個音按下時才放開前一個(圓滑),斷奏放得很短
  const byHand = { rh: [], lh: [] };
  events.forEach(e => byHand[e.hand].push(e));
  for (const h of ["rh", "lh"]) byHand[h].forEach((e, i, arr) => {
    const on = t0 + e.beat * spb;
    const next = arr[i + 1];
    const legatoEnd = next ? t0 + next.beat * spb + 0.015 : on + e.len * spb;
    const off = stacc && next ? on + Math.min(0.12, e.len * spb * 0.4) : legatoEnd;
    audio.playPianoNote(e.midi, on, off, off, vel + (i === 0 ? 6 : 0) + (Math.random() * 6 - 3), false);
  });
  const endBeat = Math.max(...events.map(e => e.beat + e.len));
  const totalBeats = Math.ceil(endBeat);
  for (let b = -count; b < totalBeats; b++) audio.playClick(t0 + b * spb, ((b % 4) + 4) % 4 === 0);
  const useCursor = !(show === "both" && cur.hands === "HS");
  if (useCursor && osmd) { osmd.cursor.reset(); osmd.cursor.show(); cursorIdx = 0; cursorOn = true; }
  play = { t0, spb, endBeat, useCursor, raf: 0 };
  $("playLabel").textContent = "停止";
  $("playIcon").innerHTML = '<rect x="6" y="6" width="12" height="12" rx="1.5"/>';
  const tick = () => {
    if (!play) return;
    const beat = (audio.audioNow() - play.t0) / play.spb;
    showBeat(beat);
    if (play.useCursor && cursorOn) {
      while (cursorIdx + 1 < cursorSteps.length && cursorSteps[cursorIdx + 1] <= beat + 0.02) { osmd.cursor.next(); cursorIdx++; }
    }
    if (beat > play.endBeat + 0.5) { stopPlayback(true); return; }
    play.raf = requestAnimationFrame(tick);
  };
  play.raf = requestAnimationFrame(tick);
}
function stopPlayback(natural){
  if (play) { cancelAnimationFrame(play.raf); play = null; if (!natural) audio.stopAll(); }
  if (osmd && cursorOn) { try { osmd.cursor.hide(); } catch (e) {} cursorOn = false; }
  $("playLabel").textContent = "播放示範";
  $("playIcon").innerHTML = '<path d="M7 4v16l13-8z"/>';
  showBeat(null);
}
$("playBtn").onclick = () => { if (play) stopPlayback(); else startPlayback(); };

/* ── 節拍器(獨立使用;排程往前看 0.12 秒) ── */
let metro = null;   // { next, n, timer }
function showBeat(beat){
  const dots = $("beats").children;
  const k = beat == null || beat < -4 ? -1 : ((Math.floor(beat + 1e-6) % 4) + 4) % 4;
  for (let i = 0; i < dots.length; i++) dots[i].classList.toggle("on", i === k);
}
async function startMetronome(){
  stopPlayback();
  const ctx = audio.ensureAudio();
  if (ctx.state === "suspended") await ctx.resume();
  try { await audio.loadClick(); } catch (e) { $("metroInfo").textContent = "節拍器音色載入失敗(需要網路)"; return; }
  await audio.masterReady;
  metro = { next: ctx.currentTime + 0.1, n: 0, timer: 0, raf: 0, start: ctx.currentTime + 0.1, spb: 60 / bpm };
  const pump = () => {
    if (!metro) return;
    const spb = 60 / bpm;
    while (metro.next < audio.audioNow() + 0.12) {
      audio.playClick(metro.next, metro.n % 4 === 0);
      metro.n++; metro.next += spb;
    }
    audio.pruneScheduled();
  };
  pump();
  metro.timer = setInterval(pump, 25);
  const draw = () => {
    if (!metro) return;
    const spb = 60 / bpm, since = audio.audioNow() - (metro.next - spb);
    showBeat(since >= 0 && since < spb * 0.5 ? (metro.n - 1) : null);
    metro.raf = requestAnimationFrame(draw);
  };
  metro.raf = requestAnimationFrame(draw);
  $("metroLabel").textContent = "停止";
}
function stopMetronome(){
  if (!metro) return;
  clearInterval(metro.timer); cancelAnimationFrame(metro.raf); metro = null;
  $("metroLabel").textContent = "開始"; showBeat(null);
}
function metroRetime(){ /* 改速度:下一拍起照新速度(pump 每次都讀目前的 bpm) */ }
$("metroBtn").onclick = () => { if (metro) stopMetronome(); else startMetronome(); };

/* ── 啟動 ── */
async function init(){
  const [sy, fg] = await Promise.all([fetch("data/syllabus.json").then(r => r.json()), fetch("data/fingerings.json").then(r => r.json())]);
  SY = sy; FG = fg;
  segBind("systemSeg", () => S.system, v => { S.system = v; store.save(); onGradeChange(); });
  segBind("qualitySeg", () => S.filter.quality, v => { S.filter.quality = v; store.save(); refreshMeta(); });
  $("selMinor").value = S.minorForm;
  $("excludeMastered").setAttribute("aria-pressed", String(S.filter.excludeMastered));
  if (window.innerWidth < 600) $("listCard").open = false;   // 手機:清單很長,預設收起來
  fillGrades(); renderCats(); refreshMeta();
  syncTempo();
  window.__app = { get cur(){ return cur; }, get ex(){ return ex; }, setQuestion, allQuestions, pool, S };
  window.__stageReady = 1;
}
init().catch(e => { console.error(e); $("qTitle").textContent = "資料載入失敗:" + e.message; });
