const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const dir = process.argv[2];
const vc = new VirtualConsole(); vc.on("jsdomError", e => console.log("JSDOM ERR", e.message)); vc.on("error", (...e) => console.log("CONSOLE ERR", ...e.map(x => x && x.stack || x)));
let html = fs.readFileSync(path.join(dir, "index.html"), "utf8").replace(/<script src="https:[^>]+><\/script>/, "").replace(/<script src="(script|js\/[^"]+)\.js" defer><\/script>/g, "");
const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
w.matchMedia = q => ({ matches: false, addEventListener(){}, media: q });
w.CSS = { escape: s => s.replace(/"/g, '\\"') };
w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
// Ceas fix: joi 8 oct 2026, 09:30 (Modulul 1)
w.eval(`(() => { const Real = Date; let now = new Real(2026, 9, 8, 9, 30).getTime();
  class FakeDate extends Real { constructor(...a) { if (a.length === 0) super(now); else super(...a); } static now() { return now; } }
  window.Date = FakeDate; window.__setNow = (...a) => { now = new Real(...a).getTime(); }; })()`);
w.localStorage.setItem("pro_catalog_db_v4", JSON.stringify({
  "Matematica": { ore: 4, target: 10, grades: [{ val: 3, type: "Test", date: "2026-09-20" }, { val: 5, type: "Ascultare", date: "2026-10-02" }] },
  "Fizica": { ore: 2, target: 9, grades: [{ val: 9, type: "Test", date: "2026-09-18" }, { val: 10, type: "Proiect", date: "2026-10-06" }] },
  "Chimie": { ore: 2, target: 9, grades: [] },
  "Romana": { ore: 4, target: 10, priority: true, grades: [{ val: 8, type: "Teză", date: "2026-09-25" }] }
}));
w.localStorage.setItem("pro_timetable_db_v4", JSON.stringify({ 4: ["Matematica", "Fizica", "Romana"], 5: ["Chimie", "Fizica"], 1: ["Romana"] }));
w.localStorage.setItem("pro_calendar_db_v4", JSON.stringify({
  "2026-10-08": [{ id: "tf", title: "Test Fizica", type: "Test", subject: "Fizica", time: "08:00" }],
  "2026-10-09": [{ id: "hr", title: "Temă Romana", type: "Temă", subject: "Romana" }],
  "2026-10-10": [{ id: "ex", title: "Teză Matematica", type: "Examen", subject: "Matematica" }],
  "2026-10-05": [{ id: "tc", title: "Test Chimie", type: "Test", subject: "Chimie" }],
  "2026-10-06": [{ id: "hf", title: "Temă Fizica", type: "Temă", subject: "Fizica" }],
  "2026-10-12": [{ id: "ex2", title: "Lucrare cap. 3", type: "Test", subject: "Romana" }],
  "2026-10-13": [{ id: "rep", title: "Temă Fizica", type: "Temă", subject: "Fizica", repeat: { every: 1, until: "" } }]
}));
w.localStorage.setItem("pro_simulator_db_v4", JSON.stringify({ active: "s1", selected: "Fizica", scenarios: [{ id: "s1", name: "Scenariul 1", hypo: { Fizica: [{ id: "h1", val: 9, type: "Test" }] } }, { id: "s2", name: "Plan B", hypo: {} }] }));
w.localStorage.setItem("pro_settings_db_v4", JSON.stringify({ appearance: { accent: "blue" } }));
w.localStorage.setItem("pro_purtare_db_v4", JSON.stringify({ grades: {}, lastModule: "2026-1" }));
w.eval(require("./app_src")(dir) + "\n;window.__t={state,ui,refresh,get metrics(){return metrics},get sim(){return sim},get alerts(){return alerts},ccOpenGlobal,switchTab};");
const T = w.__t, $ = id => w.document.getElementById(id), q = s => w.document.querySelector(s), qa = s => [...w.document.querySelectorAll(s)];
const click = el => { if (!el) throw new Error("no element"); el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
const assert = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) process.exitCode = 1; };
const txt = id => $(id).textContent.replace(/\s+/g, " ").trim();
const at = (...a) => { w.__setNow(...a); T.ui.home.day = null; T.refresh(); };

const nav = tab => click(q(`[data-action="nav"][data-tab="${tab}"]`));
const toasts = () => qa(".toast").map(t => t.textContent);

(async () => {
  await new Promise(r => setTimeout(r, 50));
/* ==================== Adaugă: întâi ce, apoi formularul ==================== */
// Calendarul are rândul cu butoane care deschid direct formularul
nav("tab-calendar");
assert(qa("#cal-compose .cc-launch-btn").map(b => b.dataset.type || "").join() === "Test,Temă,Proiect,Notă,", "Calendar shows the add buttons (Test, Temă, Proiect, Notă, Altceva)");
click(q('#cal-compose .cc-launch-btn[data-type="Proiect"]'));
assert(!$("cc-overlay").hidden && q("#cc-form").dataset.type === "Proiect" && q("#cc-form").dataset.step === "form", "a Calendar button opens that form directly");
assert(q('.cc-subj.is-none.is-on') && !q('.cc-subj.is-on:not(.is-none)'), "event without subject: 'Fără materie' is chosen");
click(q('[data-action="cc-overlay-close"]'));
assert($("cc-overlay").hidden, "× closes");

// Test cu detalii: titlul devine „Test Fizica: cinematică”, ziua sare la următoarea oră de fizică (vineri 9)
T.ccOpenGlobal();
assert(qa(".cc-tile").length === 4 && qa(".cc-mini").length === 4, "type step: 4 tiles + Examen, Prezentare, Altceva, Materie nouă");
click(q('.cc-tile[data-type="Test"]'));
click(q('.cc-subj[data-mat="Fizica"]'));
assert(q(".cc-day.is-on")?.dataset.date === "2026-10-09" && q('.cc-day[data-date="2026-10-09"]').classList.contains("has-lesson"), "subject picked: day jumps to its next lesson, marked 'are oră'");
const inp = $("cc-text"); inp.value = "cinematică"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
assert(/Test Fizica: cinematică/.test($("cc-preview").textContent), "preview shows the title with details");
click(q(".cc-add"));
assert($("cc-overlay").hidden && T.state.calendar["2026-10-09"].some(e => e.title === "Test Fizica: cinematică" && e.subject === "Fizica" && e.type === "Test"), "test added and the sheet closes");

// Altceva fără text: cere textul
T.ccOpenGlobal({ type: "Personal" });
click(q(".cc-add"));
assert(/Scrie ce vrei/.test(toasts().at(-1)) && !$("cc-overlay").hidden, "Altceva needs a text");
click(q('[data-action="cc-overlay-close"]'));

// Nota: întâi materia, apoi nota
T.ccOpenGlobal({ type: "Notă" });
click(q('.cc-val[data-val="8"]')); click(q(".cc-add"));
assert(/Alege materia/.test(toasts().at(-1)), "grade without subject: asks for it");
q('.cc-subj[data-mat="Chimie"]').focus(); click(q('.cc-subj[data-mat="Chimie"]'));
assert(q('.cc-val[data-val="8"]').classList.contains("is-on") && w.document.activeElement === q('.cc-subj[data-mat="Chimie"]'), "picking keeps the grade and the focus");
click(q('[data-action="cc-gtype"][data-type="Ascultare"]'));
click(q(".cc-add"));
const g = T.state.subjects["Chimie"].grades.at(-1);
assert(g && g.val === 8 && g.type === "Ascultare" && g.date === "2026-10-08" && $("cc-overlay").hidden, "grade saved: 8, Ascultare, today");

// „+” de pe o zi din calendar: ziua apare sus, iar formularul o păstrează
click(q('.ag-add[data-date="2026-10-12"]') || q('[data-action="cc-day"][data-date="2026-10-12"]'));
assert(q("#cc-form").dataset.step === "type" && /12 octombrie/.test(q(".cc-ctx").textContent), "a calendar day opens the type step with that day");
click(q('.cc-tile[data-type="Temă"]'));
assert(q(".cc-day.is-on")?.dataset.date === "2026-10-12", "the form keeps the day");
click(q('[data-action="cc-overlay-close"]'));
  console.log(process.exitCode ? "SOME FAILED" : "ALL PASSED");
})();
