// Structura ca în Notion: stil, arbore lateral, notițe pe materie, Tabel/Panou în Calendar
const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const dir = process.argv[2];
const assert = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) process.exitCode = 1; };
function boot(ls = {}) {
  const vc = new VirtualConsole(); vc.on("jsdomError", e => console.log("JSDOM ERR", e.message)); vc.on("error", (...e) => console.log("CONSOLE ERR", ...e.map(x => x && x.stack || x)));
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8").replace(/<script[^>]*src=[^>]+><\/script>/g, "");
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.matchMedia = q => ({ matches: false, addEventListener(){}, media: q });
  w.CSS = { escape: s => s.replace(/"/g, '\\"') };
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
  w.eval(`(() => { const Real = Date; const now = new Real(2026, 9, 16, 10, 0).getTime();
    class FakeDate extends Real { constructor(...a) { if (a.length === 0) super(now); else super(...a); } static now() { return now; } }
    window.Date = FakeDate; })()`);
  for (const [k, v] of Object.entries(ls)) w.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  w.eval(require("./app_src")(dir) + "\n;window.__t={state,ui,refresh,saveState,switchTab,sanitizeNotes,openSubjectInCatalog,applyAppearanceSettings,subjectEmoji,nbMove,SUBJECT_ICONS,subjectIconSVG,subjectIconKey,get metrics(){return metrics}};");
  const T = w.__t, $ = id => w.document.getElementById(id), q = s => w.document.querySelector(s), qa = s => [...w.document.querySelectorAll(s)];
  const click = el => { if (!el) throw new Error("no element"); el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
  const press = (el, k) => el.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  const type = (el, text) => { el.textContent = text; el.dispatchEvent(new w.Event("input", { bubbles: true })); };
  const caret = (el, pos) => { const r = w.document.createRange(); const n = el.firstChild || el; r.setStart(n, n.nodeType === 3 ? pos : 0); r.collapse(true); const s = w.getSelection(); s.removeAllRanges(); s.addRange(r); };
  return { w, T, $, q, qa, click, press, type, caret };
}
const DATA = {
  pro_catalog_db_v4: { "Fizică": { ore: 2, target: 9, grades: [{ val: 4, type: "Test", date: "2026-10-01" }] }, "Biologie": { ore: 1, target: 9, grades: [{ val: 9, type: "Oral", date: "2026-10-02" }] } },
  pro_calendar_db_v4: { "2026-10-20": [{ id: "e1", title: "Test fizică", type: "Test", subject: "Fizică" }], "2026-10-22": [{ id: "e2", title: "Proiect bio", type: "Tema", subject: "Biologie" }] },
  pro_purtare_db_v4: { grades: {}, lastModule: "2026-1" }
};

(async () => {
  let A = boot(DATA);
  const { w, T, $, q, qa, click, press, type, caret } = A;
  if (w.document.readyState === "loading") await new Promise(r => w.document.addEventListener("DOMContentLoaded", r));
  await new Promise(r => setTimeout(r, 30));
  // un singur stil: aspectul ca aplicațiile Apple (fără alegere de stil și fără mascotă)
  const cls = () => [...w.document.body.classList].filter(c => c.startsWith("style-")).join(",");
  assert(cls() === "style-app", "the app has one look (" + cls() + ")");
  assert(!$("set-accent"), "no accent switch in settings");
  T.state.settings.appearance.style = "blocuri"; T.applyAppearanceSettings();
  assert(cls() === "style-app", "an old saved style choice changes nothing");
  T.switchTab("tab-setari");
  assert(!$("style-pick") && !w.document.querySelector(".style-card"), "Eu › Aspect: no style picker");
  assert(w.document.querySelector('meta[name="theme-color"]').content === (w.document.body.classList.contains('dark-mode') ? "#0B1226" : "#EEF0F6"), "the phone status bar takes the background colour");
  T.switchTab("tab-dashboard");
  assert(!$("azi-subjects").hidden && qa("#azi-subjects .as-item[data-mat]").length === Object.keys(T.state.subjects).length && q("#azi-subjects .as-add"), "Azi › Materiile tale: one item per subject + add");
  const it = qa("#azi-subjects .as-item[data-mat]")[0];
  assert(/--pct:\s*[\d.]+%/.test(it.getAttribute("style")), "each subject carries its average as --pct for the book height");

  // arbore lateral
  const subs = qa("#side-subjects .side-sub[data-mat]").map(b => b.dataset.mat);
  assert(subs.join() === "Fizică" && q("#side-subjects .side-all"), "sidebar shows only priority / at-risk subjects, plus 'Toate materiile'");
  click(q("#side-subjects .side-all"));
  assert(qa("#side-subjects .side-sub[data-mat]").map(b => b.dataset.mat).join() === "Biologie,Fizică", "'Toate materiile' lists every subject, sorted");
  assert(q('#side-subjects [data-mat="Fizică"] .side-sub-risk') && !q('#side-subjects [data-mat="Biologie"] .side-sub-risk'), "at-risk subject marked in sidebar");
  click(q('#side-subjects [data-mat="Fizică"]'));
  assert(T.ui.activeTab === "tab-catalog" && T.ui.catalog.selected === "Fizică" && q('#side-subjects [data-mat="Fizică"]').classList.contains("is-active"), "clicking a subject opens its page and highlights it");
  click(q('.side-row-grades .side-twist'));
  assert($("side-subjects").hidden && JSON.parse(w.localStorage.getItem("urn_side_open_v1")).grades === false, "collapse subject list (remembered)");
  click(q('.side-row-grades .side-twist'));
  assert(q('.side-nav [data-tab="tab-plan"]') && !q('.side-nav .side-link[data-tab="tab-statistici"]') && !q("#side-more"), "Plan is always in the sidebar; Progres lives inside Note");

  // notițe
  let ed = q('.nb-editor[data-mat="Fizică"]');
  assert(ed && qa(".nb-editor .nb").length === 1, "subject page has an empty notes editor");
  let t = q(".nb-editor .nb-text");
  type(t, "Formule cinematică");
  assert(T.state.subjects["Fizică"].notes.length === 1 && T.state.subjects["Fizică"].notes[0].text === "Formule cinematică", "typing creates a block");
  caret(t, 8); press(t, "Enter");
  let n = T.state.subjects["Fizică"].notes;
  assert(n.length === 2 && n[0].text === "Formule " && n[1].text === "cinematică", "Enter splits block at the caret");
  t = qa(".nb-editor .nb-text")[1];
  type(t, "- v = d / t");
  n = T.state.subjects["Fizică"].notes;
  assert(n[1].t === "li" && n[1].text === "v = d / t" && q(".nb-li"), "'- ' turns block into a list");
  t = qa(".nb-editor .nb-text")[1]; caret(t, t.textContent.length); press(t, "Enter");
  n = T.state.subjects["Fizică"].notes;
  assert(n.length === 3 && n[2].t === "li", "Enter in list continues list");
  press(qa(".nb-editor .nb-text")[2], "Enter");
  assert(T.state.subjects["Fizică"].notes[2].t === "p", "Enter on empty list item exits the list");
  t = qa(".nb-editor .nb-text")[2]; type(t, "[] învăț pentru test");
  n = T.state.subjects["Fizică"].notes;
  assert(n[2].t === "todo" && n[2].done === false && q(".nb-todo .nb-check"), "'[] ' makes a to-do");
  click(q(".nb-todo .nb-check"));
  assert(T.state.subjects["Fizică"].notes[2].done === true && q(".nb-todo.is-done"), "checkbox ticks the to-do");
  t = qa(".nb-editor .nb-text")[1]; caret(t, 0); press(t, "Backspace");
  assert(T.state.subjects["Fizică"].notes[1].t === "p", "Backspace at start of list turns it into text");
  t = qa(".nb-editor .nb-text")[1]; caret(t, 0); press(t, "Backspace");
  n = T.state.subjects["Fizică"].notes;
  assert(n.length === 2 && n[0].text === "Formule v = d / t", "Backspace at start merges with block above");
  T.saveState();
  const saved = JSON.parse(w.localStorage.getItem("pro_catalog_db_v4"));
  assert(saved["Fizică"].notes?.length === 2 && saved["Fizică"].notes[1].done === true, "notes persist with the subject");
  assert(T.sanitizeNotes([{ t: "bad", text: 5 }, "x", { t: "todo", text: "a", done: 1 }]).map(b => b.t + (b.done ?? "")).join() === "p,todofalse", "sanitizeNotes cleans bad blocks");
  // notițele trec prin reîncărcare
  const B = boot(Object.fromEntries(Object.keys(w.localStorage).map(k => [k, w.localStorage.getItem(k)])));
  await new Promise(r => setTimeout(r, 30));
  B.T.openSubjectInCatalog("Fizică");
  assert(B.qa(".nb-editor .nb").length === 2 && /Formule v = d \/ t/.test(B.q(".nb-editor").textContent), "notes survive reload");


  // pictograme, proprietăți, fir de navigare
  T.switchTab("tab-dashboard");
  T.switchTab("tab-plan");
  assert(!q("#tab-plan .page-emoji") && q("#h-plan .page-ico use")?.getAttribute("href") === "#i-timer", "pages get a line icon, not an emoji");
  T.switchTab("tab-dashboard");
  assert(T.subjectEmoji("Fizică") === "⚛️" && T.subjectEmoji("Educație fizică și sport") === "⚽" && T.subjectEmoji("Ceva nou") === "📄", "automatic subject emoji");
  assert(q('#side-subjects [data-mat="Fizică"] .side-sub-ico svg.sic'), "sidebar shows the subject's drawn icon");
  assert(!q(".side-ws"), "no Notion workspace header in the sidebar (the Notion style was removed)");
  T.openSubjectInCatalog("Fizică");
  assert(q(".cat-props") && /Media/.test(q(".cat-props").textContent) && /Ore pe săptămână/.test(q(".cat-props").textContent), "subject page shows Notion-style properties");
  assert(/Note\s*›\s*\S*\s*Fizică/u.test($("topbar-crumb").textContent), "breadcrumb: Note › Fizică");
  click(q(".subj-emoji-btn"));
  assert($("emoji-pop") && qa(".emoji-opt").length > 30, "clicking the icon opens the emoji picker");
  assert(qa(".sic-opt").length === Object.keys(T.SUBJECT_ICONS).length && q('.sic-opt[data-emoji="i:fizica"]').classList.contains("is-on"), "the picker shows the drawn subject icons, with the automatic one selected");
  click(q('.emoji-opt[data-emoji="i:astronomie"]'));
  const isAstro = sel => (q(sel)?.innerHTML || "").includes("M6.7 13.7"); // conturul planetei
  assert(T.state.subjects["Fizică"].icon === "i:astronomie" && !$("emoji-pop") && isAstro(".subj-emoji-btn") && isAstro('#side-subjects [data-mat="Fizică"] .side-sub-ico'), "picking an icon sets it everywhere");
  click(q(".subj-emoji-btn")); click(q('.emoji-pop [data-emoji=""]'));
  assert(!("icon" in T.state.subjects["Fizică"]) && T.subjectIconKey("Fizică") === "fizica", "'Automată' resets the icon");
  assert(T.subjectIconKey("Limba și literatura română") === "romana" && T.subjectIconKey("Educație fizică și sport") === "sport" && T.subjectIconKey("Limba engleză") === "engleza" && T.subjectIconKey("TIC") === "tic" && T.subjectIconKey("Ceva nou") === "", "subjects find their icon by name (diacritics ignored)");
  T.state.subjects["Fizică"].icon = "<img src=x>"; T.refresh();
  assert(!q(".side-sub-emoji img") && T.subjectEmoji("Fizică") === "⚛️", "unsafe icon values are ignored");
  delete T.state.subjects["Fizică"].icon;
  // citat, linie, „+”, mutare
  T.openSubjectInCatalog("Fizică");
  let n0 = T.state.subjects["Fizică"].notes.length;
  click(q('.nb-editor [data-action="nb-add"]'));
  n = T.state.subjects["Fizică"].notes;
  assert(n.length === n0 + 1 && n[1].t === "p" && n[1].text === "", "'+' adds an empty block below");
  t = qa(".nb-editor .nb-text")[1]; type(t, "> Viteza e relativă");
  assert(T.state.subjects["Fizică"].notes[1].t === "q" && q(".nb-q"), "'> ' makes a quote");
  t = qa(".nb-editor .nb-text")[1]; caret(t, t.textContent.length); press(t, "Enter");
  n = T.state.subjects["Fizică"].notes;
  assert(n[2].t === "p", "Enter after a quote starts plain text");
  t = qa(".nb-editor .nb-text")[2]; type(t, "---");
  n = T.state.subjects["Fizică"].notes;
  assert(n[2].t === "hr" && n[3].t === "p" && q(".nb-hr hr"), "'---' makes a divider with a new block below");
  t = q(`.nb[data-id="${n[3].id}"] .nb-text`); caret(t, 0); press(t, "Backspace");
  n = T.state.subjects["Fizică"].notes;
  assert(!n.some(b => b.t === "hr"), "Backspace right after a divider removes it");
  const ids = n.map(b => b.id);
  T.nbMove("Fizică", ids[0], undefined);
  assert(T.state.subjects["Fizică"].notes.at(-1).id === ids[0], "blocks can be reordered (drag)");
  assert(T.sanitizeNotes([{ t: "hr", text: "" }, { t: "q", text: "x" }]).map(b => b.t).join() === "hr,q", "quote and divider survive saving");
  // Calendar ca Google: săptămâna cu ore, luna, programul și fereastra cu detalii
  T.ui.cal.view = "week";
  T.switchTab("tab-calendar");
  click(q('[data-action="cal-nav"][data-offset="1"]'));
  assert(qa("#cal-body .gc-col").length === 7 && qa("#cal-body .gc-dayhead").length === 7 && qa("#cal-body .gc-hour").length === 23, "week: 7 day columns with the hours of the day");
  assert(qa("#cal-body .gc-adcell .cal-ev").length === 2, "events without a time sit in the 'toată ziua' row");
  assert(q("#cal-title").textContent === "Octombrie 2026" && q(".gc-dayhead .gc-wd").textContent === "Lu", "title is the month, days start on Monday");
  click(q('#gc-viewmenu [data-view="month"]'));
  assert(qa("#cal-body .gc-mcell").length >= 28 && qa("#cal-body .gc-mcell .cal-ev").length === 2, "month: grid with the events as bars");
  assert(q('#gc-viewmenu [data-view="month"]').getAttribute("aria-checked") === "true" && /Lună/.test($("gc-viewbtn").textContent), "the view button shows the current view");
  assert(q("#gc-mini .gc-mini-d.is-today") && q("#gc-mini .gc-mini-d.has-ev"), "mini calendar: today and the days with events");
  click(q('#gc-viewmenu [data-view="schedule"]'));
  click(q('[data-action="cal-today"]'));
  assert(qa("#cal-body .gc-ev-row").length === 2 && q("#cal-body .gc-sday.is-today"), "schedule: only days with something, today first");
  click(q('#cal-body .gc-ev-row[data-id="e1"] .cal-ev-main'));
  assert(q("#gc-pop") && /Test fizică/.test(q("#gc-pop h4").textContent) && /Marți, 20 octombrie/.test(q("#gc-pop").textContent), "tapping an event opens its details");
  click(q('#gc-pop [data-action="event-done"]'));
  const ev = T.state.calendar["2026-10-20"][0];
  assert(ev.doneDates?.["2026-10-20"] && q('#cal-body .gc-ev-row[data-id="e1"]').classList.contains("is-done"), "'Fără notă' from the details marks it done");
  click(q('.gc-layer input[data-layer="test"]'));
  assert(!q('#cal-body .cal-ev[data-id="e1"]') && q('#cal-body .cal-ev[data-id="e2"]'), "hiding 'Teste și examene' hides the test only");
  click(q('.gc-layer input[data-layer="test"]'));
  click(q('#gc-viewmenu [data-view="week"]'));
  console.log(process.exitCode ? "" : "ALL PASSED");
})().catch(e => { console.log("CRASH", e.stack); process.exitCode = 1; });
