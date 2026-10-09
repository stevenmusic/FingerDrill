/* FingerDrill 主程式:音階 / 琶音 / 哈農 / 考級 四個分頁,練習面板(題目、樂譜、節拍器)共用 */
import * as store from "./store.js";
import { gradeOf, questionsFor, applyFilter, drawQuestion, CATEGORIES, masteryKey, UNIT_SYM, NOTES_PER_UNIT } from "./syllabus.js";
import { buildExercise, questionText } from "./exercise.js";
import { exerciseToMusicXML, playbackEvents } from "./musicxml.js";
import { noteLabelStr } from "./theory.js";
import { tr, T, applyStatic, setLang, getLang, pairText, unpair } from "./i18n.js";
import * as audio from "./audio.js";

const $ = id => document.getElementById(id);
const S = store.load();
let SY = null, FG = null;
const tabCur = {};       // 每個分頁目前的題目
let cur = null, ex = null, show = "both", lastKey = null;
let bpm = 60;
let osmd = null;

/* ── 主題 ── */
function applyTheme(){
  const light = S.theme === "light";
  document.body.classList.toggle("light", light);
  $("themeToggle").setAttribute("aria-pressed", String(light));
  document.querySelector('meta[name="theme-color"]').content = light ? "#FBF7EE" : "#0C0A07";
}
$("themeToggle").onclick = () => { S.theme = S.theme === "light" ? "dark" : "light"; store.save(); applyTheme(); };
applyTheme();
applyStatic();
/* 語言切換:靜態文字換掉,目前分頁與題目重畫(題目、清單、選擇器都會換語言) */
$("langToggle").onclick = () => {
  setLang(getLang() === "zh" ? "en" : "zh");
  if (!SY) return;
  if (!$("onboard").hidden) fillGrades($("obGrade"), obState.system, Number($("obGrade").value));
  const keep = cur, tab = S.tab;
  if (S.exam) renderExam();
  switchTab(tab);
  if (keep) setQuestion(keep, tab);
  renderLog();
};

function segBind(el, get, set){
  const seg = typeof el === "string" ? $(el) : el;
  const sync = () => seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === String(get()))));
  seg.onclick = e => { const b = e.target.closest("button"); if (!b || b.disabled) return; set(b.dataset.v); sync(); };
  sync();
  return sync;
}
// 手機:設定卡收成一行,點了展開
document.querySelectorAll(".setup-summary").forEach(btn => btn.onclick = () => {
  const card = btn.closest(".card"), open = !card.classList.contains("open");
  card.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open));
});

/* ══ 音階 / 琶音 選擇器 ══ */
const MAJ_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
const MIN_KEYS = ["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"];
const STARTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const keyOpts = list => list.map(k => [k, noteLabelStr(k)]);
const HANDS = () => [["RH", tr("右手", "RH")], ["LH", tr("左手", "LH")], ["HT", tr("雙手", "Both")]];
const ARTS = () => [["legato", tr("圓滑", "Legato")], ["staccato", tr("斷奏", "Staccato")]];
const OCTS = n => [1, 2, 3, 4].slice(0, n).map(o => [o, tr(o + "八度", o + " oct.")]);
/* 級數名稱:初級 / 1 級(Initial / Grade 1) */
const gradeLabel = g => g.grade === 0 ? tr("初級", "Initial") : tr(g.grade + " 級", "Grade " + g.grade);

const PICKERS = {
  scale: {
    defaults: { kind: "major", form: "harmonic", motion: "similar", key: "C", octaves: 2, hands: "HT", art: "legato" },
    rows: p => {
      const tonal = p.kind === "major" || p.kind === "minor";
      const SIM = ["similar", tr("同向", "Similar")], CON = ["contrary", tr("反向", "Contrary")];
      const motions = tonal ? [SIM, CON, ["apart3", tr("相隔三度", "3rd apart")], ["apart6", tr("相隔六度", "6th apart")], ["thirds", tr("三度雙音", "In 3rds")], ["sixths", tr("六度雙音", "In 6ths")]]
        : p.kind === "chromatic" ? [SIM, CON] : [SIM];
      const double = p.motion === "thirds" || p.motion === "sixths";
      const maxOct = p.motion === "contrary" || double ? 2 : 4;
      const hands = double ? HANDS().slice(0, 2) : p.motion === "similar" ? HANDS() : HANDS().slice(2);
      return [
        ["kind", tr("種類", "Type"), [["major", tr("大調", "Major")], ["minor", tr("小調", "Minor")], ["chromatic", tr("半音階", "Chromatic")], ["wholetone", tr("全音音階", "Whole-tone")]]],
        p.kind === "minor" && ["form", tr("小調", "Minor"), [["harmonic", tr("和聲", "Harmonic")], ["melodic", tr("旋律", "Melodic")], ["natural", tr("自然", "Natural")]]],
        ["motion", tr("進行", "Motion"), motions],
        ["key", tonal ? tr("調", "Key") : tr("起音", "Start"), keyOpts(p.kind === "major" ? MAJ_KEYS : p.kind === "minor" ? MIN_KEYS : STARTS)],
        ["octaves", tr("範圍", "Range"), OCTS(maxOct)],
        ["hands", tr("手", "Hands"), hands],
        ["art", tr("奏法", "Touch"), ARTS()]
      ].filter(Boolean);
    },
    toQ: p => {
      const q = { hands: p.hands, octaves: p.octaves, articulation: p.art, motion: "similar" };
      if (p.kind === "chromatic") Object.assign(q, { type: "chromatic", tonic: p.key, lhStart: p.key, rhStart: p.key, motion: p.motion, cat: "chromatic" });
      else if (p.kind === "wholetone") Object.assign(q, { type: "wholetone", tonic: p.key, cat: "wholetone" });
      else {
        Object.assign(q, { tonic: p.key, quality: p.kind, form: p.kind === "minor" ? p.form : null });
        if (p.motion === "thirds" || p.motion === "sixths") Object.assign(q, { type: p.motion, cat: "double" });
        else if (p.motion === "apart3" || p.motion === "apart6") Object.assign(q, { type: "scale", apart: p.motion === "apart3" ? 3 : 6, cat: "apart" });
        else Object.assign(q, { type: "scale", motion: p.motion, cat: p.motion === "contrary" ? "contrary" : "scale" });
      }
      return q;
    }
  },
  arp: {
    defaults: { kind: "major", inv: 0, key: "C", octaves: 2, hands: "HT", art: "legato" },
    rows: p => [
      ["kind", tr("種類", "Type"), [["major", tr("大三和弦", "Major")], ["minor", tr("小三和弦", "Minor")], ["dom7", tr("屬七", "Dom. 7th")], ["dim7", tr("減七", "Dim. 7th")], ["broken", tr("分解和弦", "Broken")]]],
      (p.kind === "major" || p.kind === "minor") && ["inv", tr("轉位", "Position"), [[0, tr("原位", "Root")], [1, tr("第一轉位", "1st inv.")], [2, tr("第二轉位", "2nd inv.")]]],
      ["key", p.kind === "dim7" ? tr("起音", "Start") : tr("調", "Key"), keyOpts(p.kind === "minor" ? MIN_KEYS : p.kind === "dim7" ? STARTS : MAJ_KEYS)],
      p.kind !== "broken" && ["octaves", tr("範圍", "Range"), OCTS(4)],
      ["hands", tr("手", "Hands"), HANDS()],
      ["art", tr("奏法", "Touch"), ARTS()]
    ].filter(Boolean),
    toQ: p => {
      const q = { hands: p.hands, octaves: p.kind === "broken" ? 1 : p.octaves, articulation: p.art, motion: "similar", tonic: p.key };
      if (p.kind === "major" || p.kind === "minor") Object.assign(q, { type: "arpeggio", quality: p.kind, inversion: Number(p.inv), cat: "arpeggio" });
      else if (p.kind === "broken") Object.assign(q, { type: "broken", quality: "major", cat: "broken" });
      else Object.assign(q, { type: p.kind, quality: "major", cat: "seventh" });
      return q;
    }
  },
  /* 哈農:曲目 1–20、調(12 個大調,同一個樣式移調)、手 */
  hanon: {
    defaults: { no: 1, key: "C", hands: "HT", rhythm: "even", pulse: "q", moreKeys: false },
    rows: p => [
      ["no", tr("曲目", "No."), Array.from({ length: 20 }, (_, i) => [i + 1, String(i + 1)])],
      // 調:預設只有原譜的 C 大調;「其他調」展開 12 個調(進階,指法照 C 大調原譜)
      ["key", tr("調", "Key"), p.moreKeys || p.key !== "C" ? keyOpts(MAJ_KEYS).concat([["__less", tr("收起", "Less")]])
        : [["C", tr("C(原譜)", "C (orig.)")], ["__more", tr("其他調…", "Other keys…")]]],
      ["hands", tr("手", "Hands"), HANDS()],
      ["rhythm", tr("節奏", "Rhythm"), [["even", tr("原譜", "Even")], ["dotted", tr("附點", "Dotted")], ["reverse", tr("反附點", "Rev. dotted")]]],
      // 拍點:♩ = 每 4 個音一拍(原譜的速度記法)、♪ = 每 2 個音一拍(比較好數;樂譜不變,速度數字 ×2)
      ["pulse", tr("拍點", "Pulse"), [["q", tr("♩ 每 4 音", "♩ per 4")], ["e", tr("♪ 每 2 音", "♪ per 2")]]]
    ],
    toQ: p => ({ type: "hanon", no: Number(p.no), tonic: p.key, hands: p.hands, rhythm: p.rhythm, articulation: "legato", motion: "similar", cat: "hanon" })
  }
};
S.pick = S.pick || {};
for (const t of ["scale", "arp", "hanon"]) S.pick[t] = { ...PICKERS[t].defaults, ...(S.pick[t] || {}) };
S.freeBpm = { scale: 60, arp: 60, hanon: 60, ...(S.freeBpm || {}) };
S.hanonBest = S.hanonBest || {};   // 哈農每首(不分調)練過的最高速度
const paneOf = tab => $(tab === "scale" ? "paneScale" : tab === "arp" ? "paneArp" : "paneHanon");

function renderPicker(tab){
  const pane = paneOf(tab), p = S.pick[tab], cfg = PICKERS[tab];
  // 選項不再合法時退回第一個(改了一列可能影響其他列,跑兩次)
  for (let pass = 0; pass < 2; pass++) for (const [k, , opts] of cfg.rows(p)) if (!opts.some(o => String(o[0]) === String(p[k]))) p[k] = opts[0][0];
  pane.querySelector(".rows").innerHTML = cfg.rows(p).map(([k, lbl, opts]) =>
    `<div class="prow"><span class="lbl">${lbl}</span><div class="opts" data-k="${k}">` +
    opts.map(([v, t]) => `<button class="opt" data-v="${v}" aria-pressed="${String(v) === String(p[k])}">${t}</button>`).join("") + `</div></div>`).join("");
  pane.querySelector(".sum").textContent = questionText(cfg.toQ(p)).join(" · ");
  renderQuick(tab);
}
for (const tab of ["scale", "arp", "hanon"]) {
  paneOf(tab).querySelector(".rows").onclick = e => {
    const b = e.target.closest(".opt"); if (!b) return;
    const k = b.closest(".opts").dataset.k;
    if (b.dataset.v === "__more" || b.dataset.v === "__less") {   // 哈農:展開 / 收起其他調(收起時回到原譜的 C)
      const more = b.dataset.v === "__more";
      S.pick[tab].moreKeys = more; if (!more) S.pick[tab].key = "C";
      store.save(); renderPicker(tab); if (!more) loadFree(tab); return;
    }
    S.pick[tab][k] = ["octaves", "inv", "no"].includes(k) ? Number(b.dataset.v) : b.dataset.v;
    store.save(); renderPicker(tab); loadFree(tab);
  };
}
function freeQuestion(tab){
  const q = PICKERS[tab].toQ(S.pick[tab]);
  // 哈農:S.freeBpm.hanon 一律記 ♩ 的速度;拍點選 ♪ 時顯示 ×2
  const eighth = tab === "hanon" && S.pick.hanon.pulse === "e";
  q.tempo = { unit: tab === "hanon" ? (eighth ? "e16" : "q16") : "q", bpm: S.freeBpm[tab] * (eighth ? 2 : 1) }; q.free = true; q.sub = tab === "hanon" ? 4 : 2;
  q.key = tab === "hanon" ? `hanon|${q.no}|${q.tonic}|${q.hands}|${q.rhythm}` : masteryKey(q);
  return q;
}
function loadFree(tab){ setQuestion(freeQuestion(tab), tab); }

/* 準備考試時:音階/琶音分頁上方先列出這一級的要求(可收起) */
const TAB_CATS = { scale: ["scale", "contrary", "apart", "double", "chromatic", "wholetone"], arp: ["arpeggio", "seventh", "broken"] };
function examQuestions(){
  if (!S.exam) return [];
  const g = gradeOf(SY, S.exam.system, S.exam.grade);
  return g ? questionsFor(SY, S.exam.system, g, { minorForm: S.minorForm, set: S.exam.set }) : [];
}
function renderQuick(tab){
  const box = paneOf(tab).querySelector(".quick");
  if (!S.exam || tab === "hanon") { box.hidden = true; return; }
  const sys = SY.systems[S.exam.system], g = gradeOf(SY, S.exam.system, S.exam.grade);
  const qs = examQuestions().filter(q => TAB_CATS[tab].includes(q.cat));
  box.hidden = false;
  const on = S.quickOn !== false;
  box.innerHTML = `<div class="qhead"><b>${sys.name} ${gradeLabel(g)}${sys.mode === "sets" ? " " + setName(S.exam.set) : ""}</b>${tr("的要求", "")}(${qs.length})` +
    `<button class="chip" aria-pressed="${on}">${on ? tr("收起", "Hide") : tr("展開", "Show")}</button></div>` +
    (on ? `<div class="opts">` + (qs.length ? qs.map((q, i) => `<button class="opt" data-i="${i}" aria-pressed="${!!(cur && !cur.free && cur.key === q.key)}"><i class="dot ${S.mastery[q.key] || ""}"></i><span>${shortLabel(q)}</span></button>`).join("") : `<span class="lbl">${tr("這一級沒有這類項目", "None at this grade")}</span>`) + `</div>` : "");
  box.onclick = e => {
    if (e.target.closest(".chip")) { S.quickOn = !on; store.save(); renderQuick(tab); return; }
    const b = e.target.closest(".opt[data-i]"); if (!b) return;
    setQuestion(qs[Number(b.dataset.i)], tab);
  };
}
function shortLabel(q){
  const t = questionText(q);
  const hand = q.hands === "RH" ? tr(" 右", " RH") : q.hands === "LH" ? tr(" 左", " LH") : "";
  // 英文比較長:快速清單用縮寫,行數才會跟中文一樣
  const name = getLang() === "en" ? t[0].replace(/ scale$/, "").replace("harmonic minor", "harm. minor").replace("melodic minor", "mel. minor").replace(" arpeggio", " arp.") : t[0];
  return name + hand + (q.articulation === "staccato" ? tr(" 斷", " stacc.") : "");
}
const setName = k => tr(k + " 組", "Set " + k);
function sourceText(g){ return getLang() === "en" && g.sourceEn ? g.sourceEn : g.source;
}

/* ══ 考級分頁 ══ */
function examGrade(){ return gradeOf(SY, S.exam.system, S.exam.grade); }
function ensureExam(){ if (!S.exam) S.exam = { system: "abrsm", grade: 1, set: "A" }; }
function fillGrades(sel, system, grade){
  const sys = SY.systems[system];
  sel.innerHTML = sys.grades.map(g => `<option value="${g.grade}">${gradeLabel(g)}</option>`).join("");
  sel.value = String(sys.grades.some(g => g.grade === grade) ? grade : 1);
}
function filterObj(){ return { quality: S.filter.quality, cats: new Set(S.filter.cats), excludeMastered: S.filter.excludeMastered }; }
function examPool(){
  if (!S.exam) return [];
  const sys = SY.systems[S.exam.system];
  return sys.mode === "sets" ? examQuestions().filter(q => !(S.filter.excludeMastered && S.mastery[q.key] === "good")) : applyFilter(examQuestions(), filterObj(), S.mastery);
}
function renderExam(){
  ensureExam();
  const sys = SY.systems[S.exam.system], g = examGrade(), sets = sys.mode === "sets";
  fillGrades($("selGrade"), S.exam.system, S.exam.grade);
  syncSystemSeg(); syncSetSeg(); syncQualitySeg();
  $("fSet").hidden = !sets; $("fQuality").hidden = sets; $("fCats").hidden = sets;
  $("selMinor").value = S.minorForm;
  const present = new Set(examQuestions().map(q => q.cat));
  // 新的分類(例如雙音音階)第一次出現時預設選上
  for (const c of present) if (!S.filter.cats.includes(c) && !(S.filter.seen || []).includes(c)) S.filter.cats.push(c);
  S.filter.seen = [...new Set([...(S.filter.seen || []), ...present])];
  $("catChips").innerHTML = CATEGORIES.filter(c => present.has(c.id)).map(c =>
    `<button class="chip" data-cat="${c.id}" aria-pressed="${S.filter.cats.includes(c.id)}">${tr(c.zh, c.en)}</button>`).join("");
  $("excludeMastered").setAttribute("aria-pressed", String(S.filter.excludeMastered));
  pairText($("verifyNote"), () => tr("資料來源:", "Source: ") + sourceText(g) + tr("。", ". ")
    + (g.verified ? tr("已逐項核對官方大綱。", "Verified.") : tr("尚未核對。", "Not yet checked."))
    + (sets ? tr(" Trinity:整組都要彈,每一項的手、力度、奏法固定。", " Trinity: play all of Set A or B; hands, dynamics and touch are fixed.")
            : tr(" ABRSM:考官從清單點題,分手的項目會指定左手或右手。", " ABRSM: the examiner picks items and names the hand.")));
  $("examSummary").textContent = `${sys.name} · ${gradeLabel(g)}` + (sets ? ` · ${setName(S.exam.set)}` : "") + " · " + tr(`${examPool().length} 題`, `${examPool().length} items`);
  $("examChip").hidden = false; $("examChip").textContent = `${sys.name} ${gradeLabel(g)}`;
  renderList();
  if (S.tab === "exam") syncExamButtons();
}
const syncSystemSeg = segBind("systemSeg", () => S.exam ? S.exam.system : "abrsm", v => { ensureExam(); S.exam.system = v; store.save(); onExamChange(); });
const syncSetSeg = segBind("setSeg", () => S.exam ? S.exam.set : "A", v => { ensureExam(); S.exam.set = v; store.save(); onExamChange(); });
const syncQualitySeg = segBind("qualitySeg", () => S.filter.quality, v => { S.filter.quality = v; store.save(); renderExam(); });
$("selGrade").onchange = () => { ensureExam(); S.exam.grade = Number($("selGrade").value); store.save(); onExamChange(); };
$("selMinor").onchange = () => { S.minorForm = $("selMinor").value; store.save(); onExamChange(true); };
$("catChips").onclick = e => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  const c = b.dataset.cat, on = S.filter.cats.includes(c);
  S.filter.cats = on ? S.filter.cats.filter(x => x !== c) : S.filter.cats.concat(c);
  store.save(); renderExam();
};
$("excludeMastered").onclick = () => { S.filter.excludeMastered = !S.filter.excludeMastered; store.save(); renderExam(); };
function onExamChange(keepCur){
  renderExam(); renderQuick("scale"); renderQuick("arp");
  if (S.tab === "exam") {
    const same = keepCur && cur && !cur.free && examQuestions().find(q => q.itemId === cur.itemId && q.tonic === cur.tonic && q.hands === cur.hands && q.articulation === cur.articulation);
    if (same) setQuestion(same, "exam"); else { tabCur.exam = null; showEmpty(); }
  }
}
function syncExamButtons(){
  const sets = SY.systems[S.exam.system].mode === "sets";
  $("drawBtn").hidden = false; $("drawLabel").textContent = sets ? tr("隨機抽一項", "Random") : tr("隨機抽考", "Random");
  $("nextBtn").hidden = !sets;
  $("drawBtn").disabled = examPool().length === 0;
}
$("drawBtn").onclick = () => { const q = drawQuestion(examPool(), S.mastery, lastKey); if (q) setQuestion(q, "exam"); };
$("nextBtn").onclick = () => {
  const qs = examQuestions(); if (!qs.length) return;
  const i = cur && !cur.free ? qs.findIndex(q => q.key === cur.key && q.itemId === cur.itemId) : -1;
  setQuestion(qs[(i + 1) % qs.length], "exam");
};
function renderList(){
  const sys = SY.systems[S.exam.system], qs = examQuestions();
  const good = qs.filter(q => S.mastery[q.key] === "good").length;
  $("listTitle").textContent = sys.mode === "sets" ? tr(`${S.exam.set} 組要求(依序)`, `Set ${S.exam.set} (in order)`) : T("listTitle");
  $("listSub").textContent = tr(`通過 ${good} / ${qs.length}`, `Passed ${good} / ${qs.length}`);
  $("progressBar").style.width = (qs.length ? 100 * good / qs.length : 0) + "%";
  const row = (q, i) => {
    const m = S.mastery[q.key] || "", hands = q.motion === "contrary" ? tr("反向", "contrary") : { RH: tr("右手", "RH"), LH: tr("左手", "LH"), HT: tr("雙手", "HT") }[q.hands];
    const extra = [hands, q.range === "5th" ? tr("五度", "5th") : tr(q.octaves + "八度", q.octaves + " oct.")];
    if (q.dynamic) extra.push({ "cresc-dim": "p–f–p" }[q.dynamic] || q.dynamic);
    return `<button class="qrow${cur && !cur.free && cur.key === q.key ? " cur" : ""}" data-i="${i}"><i class="dot ${m}"></i><span>${questionText(q)[0]}${q.articulation === "staccato" ? tr("(斷奏)", " (staccato)") : ""}</span><small>${extra.join(" · ")}</small></button>`;
  };
  if (sys.mode === "sets") $("qGroups").innerHTML = `<div class="qlist">${qs.map(row).join("")}</div>`;
  else $("qGroups").innerHTML = CATEGORIES.map(c => {
    const list = qs.map((q, i) => [q, i]).filter(([q]) => q.cat === c.id);
    return list.length ? `<div class="group"><h3>${c.zh}</h3><div class="qlist">${list.map(([q, i]) => row(q, i)).join("")}</div></div>` : "";
  }).join("");
}
$("qGroups").onclick = e => {
  const b = e.target.closest("[data-i]"); if (!b) return;
  setQuestion(examQuestions()[Number(b.dataset.i)], "exam");
  $("quizCard").scrollIntoView({ behavior: "smooth", block: "start" });
};
$("examChip").onclick = () => switchTab("exam");

/* ══ 分頁切換 ══ */
function switchTab(tab){
  stopPlayback();
  S.tab = tab; store.save();
  document.querySelectorAll("#tabbar button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  document.querySelectorAll(".pane").forEach(p => p.hidden = p.dataset.pane !== tab);
  $("drawBtn").hidden = true; $("nextBtn").hidden = true;
  if (tab === "scale" || tab === "arp" || tab === "hanon") { renderPicker(tab); setQuestion(tabCur[tab] || freeQuestion(tab), tab); }
  else if (tab === "exam") { renderExam(); syncExamButtons(); if (tabCur.exam) setQuestion(tabCur.exam, "exam"); else showEmpty(); }
  window.scrollTo({ top: 0 });
}
$("tabbar").onclick = e => { const b = e.target.closest("button[data-tab]"); if (b) switchTab(b.dataset.tab); };

/* ══ 練習面板 ══ */
function showEmpty(){
  stopPlayback();
  cur = null; ex = null;
  $("qTitle").classList.add("empty"); $("qTitle").style.fontSize = "";
  const sets = S.exam && SY.systems[S.exam.system].mode === "sets";
  pairText($("qTitle"), () => { const d = sets ? tr("隨機抽一項", "Random") : tr("隨機抽考", "Random"); return tr("按「" + d + "」開始,或從下面的清單選一項", "Tap “" + d + "” or pick from the list below"); }); $("qTags").innerHTML = "";
  $("playBtn").disabled = true; document.querySelectorAll(".mbtn").forEach(b => { b.disabled = true; b.setAttribute("aria-pressed", "false"); });
  $("verifyBadge").hidden = true; $("poolCount").textContent = S.exam ? tr(`抽考範圍 ${examPool().length} 題`, `${examPool().length} items in range`) : "";
  if (osmd) { try { osmd.clear(); } catch (e) {} }
  $("osmd").innerHTML = ""; osmd = null; noteXs = []; $("playline").hidden = true;
  $("paperMsg").textContent = tr("選一題之後,這裡會顯示五線譜與指法", "Pick an item to see the score and fingering here");
  $("scoreNote").hidden = true;
  syncTempoUI();
}
function setQuestion(q, tab){
  stopPlayback();
  cur = q; lastKey = q.key; tabCur[tab] = q;
  ex = buildExercise(FG, q);
  show = q.hands === "RH" ? "rh" : q.hands === "LH" ? "lh" : "both";
  syncHandSeg();
  const parts = questionText(q);
  unpair($("qTitle")); $("qTitle").textContent = parts[0]; $("qTitle").classList.remove("empty");
  $("qTags").innerHTML = parts.slice(1).map((t, i) => `<span class="q-tag${q.dynamic && i === parts.length - 2 ? " dyn" : ""}">${t}</span>`).join("") + hanonBestTag(q);
  fitTitle();
  $("playBtn").disabled = false;
  document.querySelectorAll(".mbtn").forEach(b => b.disabled = false);
  syncMastery();
  if (!q.free && S.exam) {
    const g = examGrade();
    $("verifyBadge").hidden = false;
    $("verifyBadge").classList.toggle("ok", !!g.verified);
    $("verifyBadge").textContent = g.verified ? tr("官方大綱", "Official syllabus") : tr("大綱未核對", "Syllabus not checked");
    $("poolCount").textContent = tab === "exam" ? tr(`抽考範圍 ${examPool().length} 題`, `${examPool().length} items in range`) : `${SY.systems[S.exam.system].name} ${gradeLabel(g)}`;
  } else { $("verifyBadge").hidden = true; $("poolCount").textContent = ""; }
  // 樂譜下方說明
  const notes = [], noteFns = notes;   // 每一則是函式:中英文各跑一次
  if (q.type === "thirds") notes.push(() => tr("三度指法照哈農第 52 首(Scales in Thirds)" + (["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab"].includes(q.tonic) && q.quality !== "minor" || ["A", "D", "G"].includes(q.tonic) && q.quality === "minor" ? "。" : ";這個調原譜沒有印,照同一套循環推算。") + "雙音指法各版本不同,老師另有指定就照老師的。",
    "Thirds fingering follows Hanon No. 52 (Scales in Thirds)" + (["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab"].includes(q.tonic) && q.quality !== "minor" || ["A", "D", "G"].includes(q.tonic) && q.quality === "minor" ? ". " : "; this key isn't printed there, so the same cycle is applied. ") + "Editions differ; follow your teacher if they say otherwise."));
  if (q.type === "sixths") notes.push(() => tr("六度指法照哈農第 48 首(斷奏六度):右手 1–5、左手 5–1,黑鍵用 4。雙音指法各版本不同,老師另有指定就照老師的。", "Sixths fingering follows Hanon No. 48 (detached sixths): RH 1–5, LH 5–1, 4 on black keys. Editions differ; follow your teacher if they say otherwise."));
  if (q.type === "broken") notes.push(() => tr("分解和弦的型態依一般教材的寫法(原位 → 第一轉位 → 第二轉位再下行),請以 Trinity《Piano Scales & Arpeggios》核對。", "Broken-chord pattern follows common teaching books (root → 1st → 2nd inversion and back); check it against Trinity's Piano Scales & Arpeggios."));
  if (q.type === "dom7") notes.push(() => tr("屬七和弦琶音最後解決到主音(照 ABRSM 大綱的譜例)。", "The dominant 7th resolves on the tonic (as in the ABRSM syllabus example)."));
  if (q.apart === 3) notes.push(() => tr("相隔三度:右手比左手高十度(三度 + 八度),左手從主音、右手從第三級開始。", "A third apart: RH plays a tenth above LH — LH starts on the tonic, RH on the 3rd."));
  if (q.apart === 6) notes.push(() => tr("相隔六度:主音在上方 — 右手從主音、左手從低六度的第三級開始。", "A sixth apart: tonic on top — RH starts on the tonic, LH on the 3rd a sixth below."));
  if (q.type === "chromatic" && q.lhStart !== q.rhStart) notes.push(() => tr(`兩手從不同的音開始:左手 ${noteLabelStr(q.lhStart)}、右手 ${noteLabelStr(q.rhStart)}。`, `Hands start on different notes: LH ${noteLabelStr(q.lhStart)}, RH ${noteLabelStr(q.rhStart)}.`));
  if (!q.free && S.exam) notes.push(() => SY.systems[S.exam.system].mode === "sets" ? tr("速度是大綱的「最低速度」。", "Tempo is the syllabus minimum.") : tr("速度是大綱的「參考速度」。", "Tempo is the syllabus guide speed."));
  $("scoreNote").hidden = !notes.length;
  pairText($("scoreNote"), () => noteFns.map(f => f()).join(" "));
  bpm = q.free ? q.tempo.bpm : Math.max(30, Math.min(200, Math.round(q.tempo.bpm * S.tempoPct / 100)));
  syncTempoUI();
  renderScore();
  if (tab === "exam" && S.exam) renderList();
  if (tab === "scale" || tab === "arp") renderQuick(tab);
  preloadSamples();
}
function syncMastery(){
  const m = cur && S.mastery[cur.key];
  document.querySelectorAll(".mbtn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
}
/* 哈農的速度階梯:按 ✓ = 這個速度彈順了 → 記錄最高速度、下一輪 +4 */
function hanonBestTag(q){
  const b = q.type === "hanon" && S.hanonBest[q.no];
  return b ? `<span class="q-tag best">${tr("最高", "Best")} ♩=${b}</span>` : "";
}
document.querySelectorAll(".mbtn").forEach(b => b.onclick = () => {
  if (!cur) return;
  const m = b.dataset.m;
  if (cur.type === "hanon" && m === "good") {
    const q4 = unitOf() === "e16" ? bpm / 2 : bpm;   // 最高速度一律記 ♩
    S.hanonBest[cur.no] = Math.max(S.hanonBest[cur.no] || 0, q4);
    S.mastery[cur.key] = "good";
    logPractice(0);
    setBpm(bpm + (unitOf() === "e16" ? 8 : 4), true);   // 下一輪 ♩ +4
    const parts = questionText(cur);
    $("qTags").innerHTML = parts.slice(1).map(t => `<span class="q-tag">${t}</span>`).join("") + hanonBestTag(cur);
    fitTitle(); syncMastery();
    return;
  }
  if (S.mastery[cur.key] === m) delete S.mastery[cur.key]; else { S.mastery[cur.key] = m; logPractice(0); }
  store.save(); syncMastery();
  if (S.tab === "exam") renderExam(); else renderQuick(S.tab);
});

/* ── 樂譜:一整行 + 播放軸(照 ScrollScore)──
   noteXs:每一步(OSMD 游標的每個位置)的拍點與 x 座標;播放時依拍點在兩步之間內插,播放軸平順移動。
   比畫面短的樂譜置中(#osmd margin:auto),比畫面長的可以左右滑;播放時讓目前的音停在畫面 25%(到結尾才讓播放軸走完) */
const PLAYLINE_RATIO = 0.25;
let noteXs = [];
const syncHandSeg = segBind("handSeg", () => show, v => { show = v; stopPlayback(); renderScore(); });
let renderSeq = 0;
const scoreZoom = () => window.innerWidth < 600 ? 0.85 : window.innerWidth < 1000 ? 0.95 : 1.05;
async function renderScore(){
  if (!cur) return;
  const seq = ++renderSeq;
  const xml = exerciseToMusicXML(ex, cur, show);
  if (!osmd) {
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay($("osmd"), {
      backend: "svg", autoResize: false, drawTitle: false, drawSubtitle: false, drawComposer: false, drawPartNames: false,
      drawMeasureNumbers: false, drawingParameters: "compacttight", renderSingleHorizontalStaffline: true,
      cursorsOptions: [{ type: 0, color: "#F2B94B", alpha: 0, follow: false }]
    });
  }
  $("paperMsg").textContent = "";
  try {
    await osmd.load(xml);
    if (seq !== renderSeq) return;
    osmd.zoom = scoreZoom();
    osmd.render();
    measureNotes();
  } catch (e) {
    console.error(e);
    $("paperMsg").textContent = tr("樂譜繪製失敗:", "Could not draw the score: ") + e.message;
  }
  window.__lastXml = xml;
  window.__scoreReady = (window.__scoreReady || 0) + 1;
}
/* 走一遍 OSMD 游標,記下每一步的拍點與 x(相對 #osmd);再量樂譜上下範圍給播放軸 */
function measureNotes(){
  noteXs = [];
  const c = osmd.cursor;
  c.show(); c.reset();
  let guard = 0;
  while (!c.Iterator.EndReached && guard++ < 3000) {
    const el = c.cursorElement;
    noteXs.push({ beat: c.Iterator.currentTimeStamp.RealValue * 4, x: parseFloat(el.style.left) + parseFloat(el.style.width || 0) / 2 });
    c.next();
  }
  c.reset(); c.hide();
  $("scroll").scrollLeft = 0;
  placePlaylineExtent();
  movePlayline(0, false);
}
/* 播放軸的上下:貼著譜線與音符(含加線、符桿)再往外留 1.2 個譜線間距(ScrollScore 的規則) */
function placePlaylineExtent(){
  const stage = $("stage"), pl = $("playline"), svg = document.querySelector("#osmd svg");
  if (!svg) { pl.hidden = true; return; }
  const sr = stage.getBoundingClientRect();
  let top = Infinity, bot = -Infinity, space = 8;
  const lines = svg.querySelectorAll(".staffline");
  lines.forEach(g => { const r = g.getBoundingClientRect(); top = Math.min(top, r.top); bot = Math.max(bot, r.bottom); space = r.height / 4 || space; });
  svg.querySelectorAll(".vf-stavenote, .vf-ledgers").forEach(g => { const r = g.getBoundingClientRect(); if (r.height) { top = Math.min(top, r.top); bot = Math.max(bot, r.bottom); } });
  if (!isFinite(top)) { pl.hidden = true; return; }
  const pad = space * 1.2;
  pl.style.top = Math.max(0, top - sr.top - pad) + "px";
  pl.style.bottom = Math.max(0, sr.bottom - bot - pad) + "px";
  pl.hidden = false;
}
function xAtBeat(beat){
  if (!noteXs.length) return 0;
  if (beat <= noteXs[0].beat) return noteXs[0].x;
  for (let i = 0; i + 1 < noteXs.length; i++) {
    const a = noteXs[i], b = noteXs[i + 1];
    if (beat < b.beat) return a.x + (b.x - a.x) * (beat - a.beat) / (b.beat - a.beat);
  }
  return noteXs[noteXs.length - 1].x;
}
/* follow = true:播放中,讓目前位置停在 25%(能捲才捲) */
function movePlayline(beat, follow){
  const scroll = $("scroll"), o = $("osmd"), pl = $("playline");
  const x = o.offsetLeft + xAtBeat(beat);
  if (follow) {
    const max = scroll.scrollWidth - scroll.clientWidth;
    scroll.scrollLeft = Math.max(0, Math.min(max, x - scroll.clientWidth * PLAYLINE_RATIO));
  }
  pl.style.transform = `translateX(${x - scroll.scrollLeft - 1}px)`;
}
$("scroll").addEventListener("scroll", () => { if (!play) movePlayline(0, false); }, { passive: true });
/* 旋轉螢幕 / 改視窗大小:縮放改了就重畫;播放軸位置重算 */
let lastZoom = null;
/* 題目固定一行(高度固定):太長就把字縮小,中英文的版面才會一樣 */
function fitTitle(){
  const el = $("qTitle");
  el.style.fontSize = "";
  if (el.classList.contains("empty")) return;
  let fs = parseFloat(getComputedStyle(el).fontSize);
  const min = Math.max(14, fs * 0.55);
  while (el.scrollWidth > el.clientWidth + 1 && fs > min) { fs -= 1; el.style.fontSize = fs + "px"; }
  // 標籤也固定一行:放不下就整排一起縮小
  const g = $("qTags");
  let k = 1; g.style.setProperty("--tag-scale", 1);
  while (g.scrollWidth > g.clientWidth + 1 && k > 0.6) { k -= 0.04; g.style.setProperty("--tag-scale", k); }
}
const onStageResize = () => {
  fitTitle();
  if (!osmd || !cur) return;
  const z = scoreZoom();
  if (z !== lastZoom && lastZoom !== null) { lastZoom = z; osmd.zoom = z; osmd.render(); measureNotes(); return; }
  lastZoom = z;
  placePlaylineExtent();
  if (!play) movePlayline(0, false);
};
window.addEventListener("resize", onStageResize);
if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => requestAnimationFrame(onStageResize)).observe($("stage"));

/* ── 速度 ──
   考級題目:單位照大綱(♩ 或 𝅗𝅥),一拍幾個八分音符照 NOTES_PER_UNIT;自由練習:♩、一拍兩個八分音符 */
function unitOf(){ return cur && cur.tempo ? cur.tempo.unit : "q"; }
function beatsPerBar(){ return ex && ex.time ? ex.time[0] * (unitOf() === "e16" ? 2 : 1) : unitOf() === "h" ? 2 : 4; }
function syncTempoUI(){
  const u = unitOf();
  $("bpmRange").max = maxBpm();
  $("bpmVal").textContent = bpm; $("bpmRange").value = bpm;
  $("bpmUnit").textContent = `${UNIT_SYM[u]} / ${tr("分", "min")}`;
  const examT = cur && !cur.free ? cur.tempo : null;
  $("bpmReset").hidden = !examT;
  if (examT) {
    const pct = Math.round(100 * bpm / examT.bpm);
    $("bpmPct").textContent = pct === 100 ? tr("考試速度", "exam") : tr(`考試速度的 ${pct}%`, `${pct}% of exam tempo`);
    $("examTempo").textContent = tr(`考試速度 ${UNIT_SYM[u]} = ${examT.bpm}(八分音符,每拍 ${NOTES_PER_UNIT[u]} 個${u === "q." ? ",三連音" : ""})`,
      `Exam tempo ${UNIT_SYM[u]} = ${examT.bpm} (${NOTES_PER_UNIT[u]} ${u === "q." ? "triplet " : ""}quavers per beat)`);
  } else if (u === "e16") { $("bpmPct").textContent = ""; $("examTempo").textContent = tr("拍點打在 ♪(每 2 個音)· 原譜 ♩ 60–108 = ♪ 120–216", "Clicks on ♪ (every 2 notes) · Hanon ♩ 60–108 = ♪ 120–216"); }
  else if (u === "q16") { $("bpmPct").textContent = ""; $("examTempo").textContent = ex && ex.rhythm !== "even" ? tr("每拍 4 個音(附點節奏)· 原譜 60–108", "4 notes per beat (dotted) · Hanon: 60–108") : tr("每拍 4 個十六分音符 · 原譜 60–108", "4 semiquavers per beat · Hanon: 60–108"); }
  else { $("bpmPct").textContent = ""; $("examTempo").textContent = tr("每拍 2 個八分音符", "2 quavers per beat"); }
  $("beats").innerHTML = "<i class=\"first\"></i>" + "<i></i>".repeat(beatsPerBar() - 1);
}
/* ♪ 拍點時速度數字是 ♩ 的兩倍:上限放寬到 240(♩ = 120) */
function maxBpm(){ return unitOf() === "e16" ? 240 : 200; }
function setBpm(v, fromUser){
  bpm = Math.max(30, Math.min(maxBpm(), Math.round(v)));
  if (fromUser && cur) {
    if (cur.free) { S.freeBpm[S.tab] = unitOf() === "e16" ? bpm / 2 : bpm; cur.tempo.bpm = bpm; }
    else S.tempoPct = Math.round(100 * bpm / cur.tempo.bpm);
    store.save();
  }
  syncTempoUI();
}
/* − / +:點一下 ±1;按住 0.4 秒後開始連續增減,越按越快(每次 ±1 → 0.6 秒後 ±2 → 1.6 秒後 ±5) */
function holdRepeat(btn, dir){
  let timer = 0, t0 = 0, fired = false;
  const step = () => {
    const held = performance.now() - t0;
    const amt = held > 1600 ? 5 : held > 1000 ? 2 : 1;
    setBpm(bpm + dir * amt, true);
    timer = setTimeout(step, held > 1000 ? 70 : 110);
  };
  const start = e => {
    if (e.button > 0) return;
    e.preventDefault();
    fired = true; t0 = performance.now();
    setBpm(bpm + dir, true);
    timer = setTimeout(() => { t0 = performance.now() - 400; step(); }, 400);
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const stop = () => { clearTimeout(timer); timer = 0; };
  btn.addEventListener("pointerdown", start);
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener("contextmenu", e => e.preventDefault());
  // 鍵盤(Enter / 空白鍵)沒有 pointer 事件:照一般點擊 ±1
  btn.addEventListener("click", () => { if (fired) { fired = false; return; } setBpm(bpm + dir, true); });
}
holdRepeat($("bpmDown"), -1);
holdRepeat($("bpmUp"), +1);
$("bpmRange").oninput = () => setBpm(Number($("bpmRange").value), true);
$("bpmReset").onclick = () => { if (cur && !cur.free) { S.tempoPct = 100; store.save(); setBpm(cur.tempo.bpm); } };

/* ── 音訊 ── */
const VEL = { f: 92, p: 42, mf: 68, "cresc-dim": 60 };
function demoVel(){ return cur && cur.dynamic ? VEL[cur.dynamic] : 64; }
let samplesReady = false;
async function preloadSamples(){
  if (!cur) return;
  try {
    audio.ensureAudio();
    const notes = ["rh", "lh"].flatMap(h => ex[h].flatMap(n => n.with ? [n, n.with] : [n])).map(n => ({ midi: n.midi, vel: demoVel() }));
    $("loadingMsg").textContent = tr("載入鋼琴取樣…", "Loading piano samples…");
    await audio.loadPianoFor(notes, 6, p => { $("loadingMsg").textContent = tr("載入鋼琴取樣… ", "Loading piano samples… ") + Math.round(p * 100) + "%"; });
    await audio.loadClick().catch(() => {});
    samplesReady = true;
    $("loadingMsg").textContent = "";
  } catch (e) {
    $("loadingMsg").textContent = tr("鋼琴取樣載入失敗(需要網路,之後會存在裝置上)", "Could not load piano samples (needs internet once; then cached on this device)");
  }
}

/* ── 示範播放:預備拍一小節 + 節拍器 ── */
let play = null, starting = 0;   // starting:正在準備播放(載入取樣中)的序號;連點、換題時舊的準備作廢
async function startPlayback(){
  if (!cur || starting) return;
  const token = starting = Date.now() + Math.random();
  const q0 = cur, show0 = show;
  const ctx = audio.ensureAudio();
  if (ctx.state === "suspended") await ctx.resume();
  $("playLabel").textContent = tr("準備中…", "Preparing…");
  await preloadSamples();
  await audio.masterReady;
  // 準備期間換了題目、換了手、按了停止 → 不播
  if (starting !== token || cur !== q0 || show !== show0) { if (starting === token) { starting = 0; $("playLabel").textContent = T("play"); } return; }
  starting = 0;
  if (!samplesReady) { $("playLabel").textContent = T("play"); return; }
  const events = playbackEvents(ex, cur, show);
  const u = unitOf(), clickSec = 60 / bpm, noteSec = clickSec / NOTES_PER_UNIT[u];
  const beatSec = noteSec * ex.sub;                      // 樂譜上一個四分音符的秒數
  const count = beatsPerBar();
  const t0 = ctx.currentTime + 0.15 + count * clickSec;
  const stacc = cur.articulation === "staccato";
  const endBeat = Math.max(...events.map(e => e.beat + e.len));
  // 漸強再漸弱(p–f–p):前半漸強、後半漸弱
  const velAt = beat => cur.dynamic === "cresc-dim" ? Math.round(42 + 50 * (1 - Math.abs(2 * beat / endBeat - 1))) : demoVel();
  const byHand = { rh: [], lh: [] };
  events.forEach(e => byHand[e.hand].push(e));
  for (const h of ["rh", "lh"]) {
    const arr = byHand[h];
    arr.forEach(e => {
      const on = t0 + e.beat * beatSec;
      const next = arr.find(x => x.beat > e.beat + 1e-6);   // 同一隻手下一個「不同時」的音(雙音的兩個音同時按)
      const legatoEnd = next ? t0 + next.beat * beatSec + 0.015 : on + e.len * beatSec;
      const off = stacc && next ? on + Math.min(0.12, (next.beat - e.beat) * beatSec * 0.45) : legatoEnd;
      audio.playPianoNote(e.midi, on, off, off, velAt(e.beat) + (e.idx === 0 ? 6 : 0) + (Math.random() * 6 - 3), false);
    });
  }
  const totalClicks = Math.ceil(endBeat * beatSec / clickSec);
  for (let b = -count; b < totalClicks; b++) audio.playClick(t0 + b * clickSec, ((b % count) + count) % count === 0);
  play = { t0, beatSec, clickSec, endBeat, raf: 0 };
  $("playLabel").textContent = T("stop");
  $("playIcon").innerHTML = '<rect x="6" y="6" width="12" height="12" rx="1.5"/>';
  const tick = () => {
    if (!play) return;
    const now = audio.audioNow();
    const beat = (now - play.t0) / play.beatSec;
    showBeat((now - play.t0) / play.clickSec);
    movePlayline(Math.max(0, beat), true);
    if (beat > play.endBeat + 0.5) { const sec = play.endBeat * play.beatSec; stopPlayback(true); logPractice(sec); return; }
    play.raf = requestAnimationFrame(tick);
  };
  play.raf = requestAnimationFrame(tick);
}
function stopPlayback(natural){
  starting = 0;
  if (play) { cancelAnimationFrame(play.raf); play = null; if (!natural) audio.stopAll(); }
  if (osmd && noteXs.length) { $("scroll").scrollLeft = 0; movePlayline(0, false); }
  $("playLabel").textContent = T("play");
  $("playIcon").innerHTML = '<path d="M7 4v16l13-8z"/>';
  showBeat(null);
}
$("playBtn").onclick = () => { if (play || starting) stopPlayback(); else startPlayback(); };

/* ── 拍點燈號(示範播放時亮)── */
function showBeat(click){
  const dots = $("beats").children, n = dots.length;
  const k = click == null || click < -n ? -1 : ((Math.floor(click + 1e-6) % n) + n) % n;
  for (let i = 0; i < dots.length; i++) dots[i].classList.toggle("on", i === k);
}

/* ══ 練習紀錄 ══
   算一次練習:示範完整播完、或按了 ✓ / ⚠ 標記。S.log = { "YYYY-MM-DD": { n: 次數, sec: 秒數 } }(只留最近 400 天) */
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function logPractice(sec){
  S.log = S.log || {};
  const k = dayKey(new Date()), e = S.log[k] || (S.log[k] = { n: 0, sec: 0 });
  e.n++; e.sec += Math.round(sec || 0);
  const keys = Object.keys(S.log).sort();
  while (keys.length > 400) delete S.log[keys.shift()];
  store.save(); renderLog();
}
function renderLog(){
  const log = S.log || {}, today = new Date();
  // 連續天數:從今天(今天還沒練就從昨天)往回數
  let streak = 0, d = new Date(today);
  if (!(log[dayKey(d)] && log[dayKey(d)].n)) d.setDate(d.getDate() - 1);
  while (log[dayKey(d)] && log[dayKey(d)].n) { streak++; d.setDate(d.getDate() - 1); }
  const t = log[dayKey(today)] || { n: 0, sec: 0 };
  $("logStreak").textContent = streak; $("logToday").textContent = t.n; $("logMin").textContent = Math.round(t.sec / 60);
  const names = getLang() === "en" ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] : ["日", "一", "二", "三", "四", "五", "六"];
  let html = "";
  for (let i = 6; i >= 0; i--) {
    const x = new Date(today); x.setDate(x.getDate() - i);
    const e = log[dayKey(x)];
    html += `<span class="${i === 0 ? "today" : ""}"><i class="${e && e.n ? "on" : ""}"></i>${names[x.getDay()]}</span>`;
  }
  $("logWeek").innerHTML = html;
}

/* ══ 第一次打開:在準備考試嗎? ══ */
const obState = { system: "abrsm", grade: 1 };
function showOnboard(){
  const ob = obState;
  const syncSys = segBind("obSystem", () => ob.system, v => { ob.system = v; fillGrades($("obGrade"), ob.system, ob.grade); });
  fillGrades($("obGrade"), ob.system, ob.grade); syncSys();
  $("obGrade").onchange = () => ob.grade = Number($("obGrade").value);
  $("onboard").hidden = false;
  $("obYes").onclick = () => {
    S.exam = { system: ob.system, grade: Number($("obGrade").value), set: "A" }; S.onboarded = true; store.save();
    $("onboard").hidden = true; renderExam(); switchTab("exam");
  };
  $("obNo").onclick = () => { S.exam = null; S.onboarded = true; store.save(); $("onboard").hidden = true; $("examChip").hidden = true; switchTab("scale"); };
}

/* ── 啟動 ── */
async function init(){
  // 資料檔帶版本指紋(index.html 的 fdVersions,由 tools/build/stamp.mjs 產生),更新後不會讀到舊的快取
  let ver = {}; try { ver = JSON.parse(document.getElementById("fdVersions").textContent); } catch (e) {}
  const data = f => fetch(f + (ver[f] ? "?v=" + ver[f] : "")).then(r => r.json());
  const [sy, fg] = await Promise.all([data("data/syllabus.json"), data("data/fingerings.json")]);
  SY = sy; FG = fg;
  if (S.exam && !(SY.systems[S.exam.system] && gradeOf(SY, S.exam.system, S.exam.grade))) S.exam = null;
  if (window.innerWidth < 600) $("listCard").open = false;
  if (S.exam) renderExam();
  renderLog();
  window.__app = { get cur(){ return cur; }, get ex(){ return ex; }, get osmd(){ return osmd; },
    get state(){ return { play: !!play, starting: !!starting, bpm, show, scheduled: audio.scheduledCount(), noteXs: noteXs.length }; }, setQuestion, examQuestions, examPool, switchTab, fitTitle, S, SY };
  if (!S.onboarded) { switchTab("scale"); showOnboard(); }
  else switchTab(S.tab || (S.exam ? "exam" : "scale"));
  window.__stageReady = 1;
}
/* 離線使用:註冊 Service Worker(sw.js);本機開發(localhost)也註冊,方便測試 */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
init().catch(e => { console.error(e); $("qTitle").textContent = tr("資料載入失敗:", "Could not load data: ") + e.message; });
