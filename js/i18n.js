/* 雙語(繁體中文 / English):跟 HarmonyHands、HarmonyMap 同一套做法——
   頂欄最右邊的語言按鈕(中文時顯示 EN、英文時顯示 中),選擇存在 localStorage,第一次照瀏覽器語言。
   靜態文字:HTML 上的 data-i18n="key"(文字)/ data-i18n-attr="aria-label:key,title:key";
   程式產生的文字:tr("中文", "English")。 */
const LANG_KEY = "fingerdrill-lang";
let LANG = (() => {
  try { const v = localStorage.getItem(LANG_KEY); if (v === "en" || v === "zh") return v; } catch (e) {}
  return /^zh/i.test(navigator.language || "zh") ? "zh" : "en";
})();
export const getLang = () => LANG;
export const tr = (zh, en) => LANG === "en" ? en : zh;

const STR = {
  pageTitle: ["FingerDrill — 指法特訓", "FingerDrill — Piano Technique Trainer"],
  themeToggleLabel: ["淺色模式", "Light mode"], themeToggleTitle: ["切換淺色/深色主題", "Switch light/dark theme"],
  langToggleText: ["EN", "中"], langToggleLabel: ["切換為英文", "Switch to Chinese"], langToggleTitle: ["切換語言", "Switch language"],
  tabScale: ["音階", "Scales"], tabArp: ["琶音", "Arpeggios"], tabHanon: ["哈農", "Hanon"], tabExam: ["考級", "Exams"],
  hanonTitle: ["哈農 · 第一部分(1–20 首)", "Hanon · Part I (Nos. 1–20)"],
  hanonSoon: ["製作中(第二階段)。會用「樣式 + 移位規則」產生全部 20 首,並對照原譜驗證每首前兩小節與轉折處;支援 12 個調、速度階梯(每輪 +4 BPM 到目標速度)、附點/反附點/三連音等節奏變化,以及每首練到的最高速度紀錄。",
    "Coming in phase 2. All 20 exercises will be generated from pattern + transposition rules and checked against the original score (first two bars and turning points of each). Includes all 12 keys, a tempo ladder (+4 BPM per round up to your target), dotted / reverse-dotted / triplet rhythm variants, and your best tempo for each exercise."],
  lblSystem: ["考試系統", "Exam board"], lblGrade: ["級數", "Grade"], lblSet: ["準備哪一組(Trinity)", "Set (Trinity)"],
  setA: ["A 組", "Set A"], setB: ["B 組", "Set B"],
  lblQuality: ["大調 / 小調", "Major / minor"], qAll: ["全部", "All"], qMajor: ["大調", "Major"], qMinor: ["小調", "Minor"],
  lblMinorForm: ["小調形式(考生自選時)", "Minor form (when candidate's choice)"],
  formHarmonic: ["和聲小調", "Harmonic minor"], formMelodic: ["旋律小調", "Melodic minor"], formNatural: ["自然小調(大綱允許時)", "Natural minor (where allowed)"],
  lblCats: ["抽考範圍", "Include"], excludeMastered: ["排除已熟練的項目", "Skip mastered items"],
  draw: ["隨機抽考", "Random question"], next: ["下一項", "Next"], play: ["播放示範", "Play demo"], stop: ["停止", "Stop"],
  good: ["熟練", "Mastered"], weak: ["待加強", "Needs work"],
  scoreTitle: ["樂譜與指法", "Score & fingering"], handRH: ["右手", "RH"], handLH: ["左手", "LH"], handBoth: ["雙手", "Both"],
  metroTitle: ["節拍器", "Metronome"], metroStart: ["開始", "Start"], bpmReset: ["回到考試速度", "Exam tempo"],
  bpmDown: ["慢 1(按住連續減少)", "Slower by 1 (hold to repeat)"], bpmUp: ["快 1(按住連續增加)", "Faster by 1 (hold to repeat)"],
  tempo: ["速度", "Tempo"],
  listTitle: ["本級要求", "Grade requirements"],
  legendGood: ["熟練", "Mastered"], legendWeak: ["待加強", "Needs work"], legendNone: ["未標記", "Not marked"],
  footer: ["鋼琴音色:Accurate-Salamander Grand Piano V6.2(Salamander Grand Piano V3 by Alexander Holm,CC-BY 3.0)· 節拍器:Naked Drums(Wilkinson Audio,CC-BY 4.0)· 取樣經 ScrollScore 整理後直接讀取 · 樂譜:OpenSheetMusicDisplay(BSD-3-Clause)。考級要求依 ABRSM《Piano Practical Grades 2025 & 2026》與 Trinity《Piano Syllabus from 2023》整理,僅供練習參考;實際要求以官方大綱為準。",
    "Piano: Accurate-Salamander Grand Piano V6.2 (Salamander Grand Piano V3 by Alexander Holm, CC-BY 3.0) · Metronome: Naked Drums (Wilkinson Audio, CC-BY 4.0) · samples prepared by ScrollScore · Notation: OpenSheetMusicDisplay (BSD-3-Clause). Exam requirements are transcribed from ABRSM Piano Practical Grades 2025 & 2026 and Trinity Piano Syllabus from 2023 for practice only; always check the official syllabus."],
  obTitle: ["你在準備鋼琴考級嗎?", "Preparing for a piano exam?"],
  obSub: ["選了考試和級數,App 會直接打開「考級」分頁,音階、琶音分頁也會先列出這一級的要求。之後隨時可以在「考級」分頁更改。",
    "Pick your exam board and grade: the app opens the Exams tab, and the Scales and Arpeggios tabs list that grade's requirements first. You can change this any time in the Exams tab."],
  obYes: ["開始準備考試", "Start exam prep"], obNo: ["不考試,自由練習", "No exam — free practice"]
};
export const T = key => (STR[key] ? STR[key][LANG === "en" ? 1 : 0] : key);

export function applyStatic(){
  document.documentElement.lang = LANG === "en" ? "en" : "zh-Hant";
  document.title = T("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = T(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-attr]").forEach(el => {
    for (const pair of el.dataset.i18nAttr.split(",")) { const [a, k] = pair.split(":"); el.setAttribute(a, T(k)); }
  });
  const btn = document.getElementById("langToggle");
  if (btn) btn.setAttribute("aria-pressed", String(LANG === "en"));
}
export function setLang(lang){
  LANG = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  applyStatic();
}
