const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const dir = process.argv[2];
const assert = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) process.exitCode = 1; };
function boot(seed = {}) {
  const vc = new VirtualConsole(); vc.on("jsdomError", e => console.log("JSDOM ERR", e.message)); vc.on("error", (...e) => console.log("CONSOLE ERR", ...e.map(x => x && x.stack || x)));
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8").replace(/<script src="https:[^>]+><\/script>/, "").replace(/<script src="(script|js\/[^"]+)\.js" defer><\/script>/g, "");
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.matchMedia = q => ({ matches: false, addEventListener(){}, media: q });
  w.CSS = { escape: s => s.replace(/"/g, '\\"') };
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
  w.eval(`(() => { const Real = Date; const now = new Real(2026, 9, 8, 9, 30).getTime();
    class FakeDate extends Real { constructor(...a) { if (a.length === 0) super(now); else super(...a); } static now() { return now; } }
    window.Date = FakeDate; })()`);
  for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
  w.eval(require("./app_src")(dir) + "\n;window.__t={state,ui,refresh,get alerts(){return alerts}};");
  const $ = id => w.document.getElementById(id), q = s => w.document.querySelector(s), qa = s => [...w.document.querySelectorAll(s)];
  const click = el => { if (!el) throw new Error("no element"); el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
  const key = (k, opts = {}, target = w.document.body) => target.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }));
  const toasts = () => qa(".toast .toast-text").map(t => t.textContent);
  return { w, T: w.__t, $, q, qa, click, key, toasts };
}
const rowByName = (qa, name) => qa(".setup-row").find(li => li.dataset.name === name);

(async () => {
  // --- 1. prima pornire: caiet gol → asistentul apare, un singur drum
  let A = boot();
  await new Promise(r => setTimeout(r, 30));
  let { w, T, $, q, qa, click, key, toasts } = A;
  const txt = () => $("setup-body").textContent;
  const next = () => click(q('#setup-foot [data-action="setup-next"]'));
  const back = () => click(q('#setup-steps [data-action="setup-back"]'));
  const hrs = n => { const r = rowByName(qa, n); return Number((r?.querySelector(".wz-hours") || r?.querySelector("small"))?.textContent.split(" ")[0]); };
  assert(!$("setup").hidden && /Bun venit/.test(txt()), "empty notebook: setup opens with welcome");
  assert($("setup-steps").classList.contains("is-hidden") && $("setup-me-name") && qa("#setup-foot button").length === 1 && /Începem/.test(q("#setup-foot").textContent), "welcome: name + one button, no progress bar");
  assert(q('#setup-body [data-action="setup-import"]'), "welcome: backup import is a small link");
  key("n");
  assert($("quick-add").hidden, "shortcuts are off while setup is open");
  next();
  assert(/În ce clasă ești/.test(txt()) && qa(".wz-cell").length === 8 && /Pasul 1 din 5/.test($("setup-steps").textContent), "step 1: class, 8 big cells, progress 1/5");
  assert(q('#setup-foot [data-action="setup-next"]').disabled, "Continue disabled until a class is chosen");
  click(q('[data-action="setup-class"][data-cls="9"]'));
  assert(/Ce profil ai/.test(txt()) && /Pasul 2 din 5/.test($("setup-steps").textContent), "picking a high-school class goes straight to the profile");
  assert(qa('[data-action="setup-profile"]').length === 14 && !q('[data-id="gimnaziu"]') && qa(".wz-group").map(h => h.textContent).join("|") === "Teoretic|Vocațional|Tehnologic", "14 high-school profiles in 3 groups (no Gimnaziu here)");
  click(q('[data-action="setup-profile"][data-id="mate-info"]'));
  assert(q('[data-id="mate-info"]').getAttribute("aria-checked") === "true" && q(".wz-sub [data-variant]") && /Ce profil ai/.test(txt()), "mate-info has a specialization: picker shows, no auto-advance");
  next();
  assert(/Materiile tale/.test(txt()) && /Clasa a IX-a, Matematică-informatică/.test(txt()) && qa(".setup-row").length >= 17, "step 3: subjects, says class + profile (" + qa(".setup-row").length + ")");
  assert(hrs("Matematică") === 4 && !rowByName(qa, "Matematică").querySelector("input"), "Matematică: 4 ore, fixed (no control)");
  assert(q(".wz-more") && !q(".wz-more").open && q(".wz-more").contains(rowByName(qa, "TIC")), "compulsory subjects folded under 'Celelalte materii'");
  const rel = rowByName(qa, "Religie").querySelector(".setup-check");
  assert(rel && !q(".wz-more").contains(rel), "Religie is one of the choices, on top");
  rel.checked = false; rel.dispatchEvent(new w.Event("change", { bubbles: true }));
  assert(rowByName(qa, "Religie").classList.contains("is-off"), "switching Religie off greys it");
  assert(rowByName(qa, "Dirigenție") && /nu intră în medie/.test(rowByName(qa, "Dirigenție").textContent), "IX: Dirigenție, marked as not in the average");
  const lm2 = q(".setup-lm2"); lm2.value = "Limba germană"; lm2.dispatchEvent(new w.Event("change", { bubbles: true }));
  assert(rowByName(qa, "Limba germană") && !rowByName(qa, "Limba franceză"), "second language picked from a list");
  const optRow = qa(".setup-row").find(li => li.dataset.kind === "opt");
  assert(optRow && optRow.classList.contains("is-off") && !q(".setup-opt-topic"), "Opțional off by default, no name field yet");
  const oc = optRow.querySelector(".setup-check"); oc.checked = true; oc.dispatchEvent(new w.Event("change", { bubbles: true }));
  const topic = q(".setup-opt-topic"); assert(topic, "turning the optional on asks for its name");
  topic.value = "Educație financiară"; topic.dispatchEvent(new w.Event("input", { bubbles: true }));
  next();
  assert(/Ce medie vrei/.test(txt()) && /Pasul 4 din 5/.test($("setup-steps").textContent), "step 4: goal");
  click(q('[data-action="setup-target"][data-v="8"]'));
  const riskVals = () => qa('[data-action="setup-risk"]').map(b => b.dataset.v).join(",");
  assert(riskVals() === "5,6,7", "target 8 → warnings only below 8 (no 'sub 8' or 'sub 9')");
  click(q('[data-action="setup-risk"][data-v="7"]'));
  click(q('[data-action="setup-target"][data-v="7"]'));
  assert(riskVals() === "5,6" && q('[data-action="setup-risk"][aria-checked="true"]').dataset.v === "6", "lowering the target moves the warning below it (7 → 6)");
  click(q('[data-action="setup-target"][data-v="9.5"]'));
  click(q('[data-action="setup-risk"][data-v="7"]'));
  assert(q('[data-action="setup-target"][data-v="9.5"]').getAttribute("aria-pressed") === "true" && q('[data-action="setup-risk"][data-v="7"]').getAttribute("aria-checked") === "true", "target 9.50, warn under 7");
  next();
  assert(/Din ce județ ești/.test(txt()) && $("setup-county") && !$("setup-preset"), "step 5: county only (modules follow it)");
  $("setup-county").value = "Iași"; $("setup-county").dispatchEvent(new w.Event("change", { bubbles: true }));
  next();
  assert(/Totul e pregătit/.test(txt()) && /a IX-a/.test(txt()) && /Matematică-informatică/.test(txt()) && /9\.50/.test(txt()) && /sub 7/.test(txt()) && /Iași/.test(txt()), "done: summary of every choice");
  assert(q("#setup .setup-skip").hidden && qa("#setup-foot button").length === 2, "done: no 'Sari peste', two buttons");
  click(q('[data-action="setup-goto"][data-step="goal"]'));
  assert(/Ce medie vrei/.test(txt()) && q('[data-action="setup-target"][data-v="9.5"]').getAttribute("aria-pressed") === "true", "'Schimbă' jumps back to the step with the choice kept");
  next(); assert($("setup-county").value === "Iași", "county kept");
  back(); back();
  assert(/Materiile tale/.test(txt()) && rowByName(qa, "Limba germană") && q(".setup-opt-topic").value === "Educație financiară", "Back keeps the subject choices");
  next(); next(); next();
  click(q('#setup-foot [data-action="setup-finish"]:not([data-timetable])'));
  const names = Object.keys(T.state.subjects);
  assert($("setup").hidden && names.includes("Limba germană") && names.includes("Opțional · Educație financiară") && names.includes("Dirigenție") && names.includes("TIC") && !names.includes("Religie"), "finish: subjects created as chosen (" + names.length + ")");
  assert(T.state.subjects["Dirigenție"].excludeFromGPA === true, "high-school Dirigenție doesn't count in the average");
  const st = T.state.settings;
  assert(st.school.profile === "mate-info" && st.school.cls === 9 && st.school.lm2 === "Limba germană" && st.school.county === "Iași", "programme + county saved");
  assert(T.state.subjects["Matematică"].ore === 4 && T.state.subjects["Matematică"].target === 9.5, "hours + target saved per subject");
  assert(st.goals.targetGPA === 9.5 && st.calc.riskThreshold === 7 && st.calc.method === "arithmetic", "settings: target, risk, method");
  assert(w.localStorage.getItem("pro_setup_done_v4") === "1" && JSON.parse(w.localStorage.getItem("pro_catalog_db_v4"))["Fizică"], "saved; setup marked done");
  assert(T.ui.activeTab === "tab-dashboard" && /Gata!/.test(toasts().at(-1)), "lands on Azi with a confirmation");

  // --- 2. după „Sari peste”, nu mai apare
  A = boot(); await new Promise(r => setTimeout(r, 30)); ({ w, T, $, q, qa, click, key, toasts } = A);
  click(q('[data-action="setup-skip"]'));
  assert($("setup").hidden && w.localStorage.getItem("pro_setup_done_v4") === "1", "Sari peste closes and remembers");
  assert(q('#azi-day [data-action="setup-open"]'), "Azi empty state offers the profile setup");
  click(q('#azi-day [data-action="setup-open"]'));
  assert(!$("setup").hidden, "…which reopens it");
  A = boot({ "pro_setup_done_v4": "1" }); await new Promise(r => setTimeout(r, 30));
  assert(A.$("setup").hidden, "not shown again after it was skipped");

  // --- 3. gimnaziu: fără pasul de profil
  A = boot(); await new Promise(r => setTimeout(r, 30)); ({ w, T, $, q, qa, click, key, toasts } = A);
  next(); click(q('[data-action="setup-class"][data-cls="6"]'));
  assert(/Materiile tale/.test(txt()) && /Pasul 2 din 4/.test($("setup-steps").textContent) && /^Clasa a VI-a\./.test(q(".wz-lead").textContent), "gimnaziu: class VI goes straight to subjects (4 steps)");
  const g = qa(".setup-row").map(li => li.dataset.name);
  assert(g.includes("Fizică") && !g.includes("Chimie") && !g.some(n => /latin/i.test(n)), "class VI: Fizică, no Chimie/Latină");
  assert(hrs("Limba și literatura română") === 4 && hrs("Istorie") === 1 && hrs("Biologie") === 2 && hrs("Educație fizică și sport") === 2 && g.includes("Dirigenție") && !g.includes("Consiliere și dezvoltare personală"), "class VI hours from OMENCS 3590/2016");
  back();
  click(q('[data-action="setup-class"][data-cls="11"]'));
  assert(/Ce profil ai/.test(txt()) && !q('[data-action="setup-profile"][aria-checked="true"]'), "switching to high school asks for a profile");
  assert(q('#setup-foot [data-action="setup-next"]').disabled, "…and waits for it");

  // --- 3a. clasa contează
  A = boot(); await new Promise(r => setTimeout(r, 30)); ({ w, T, $, q, qa, click, key, toasts } = A);
  const go = (cls, prof) => { if (!/În ce clasă/.test(txt())) { while (!/În ce clasă/.test(txt())) back(); } click(q(`[data-action="setup-class"][data-cls="${cls}"]`)); if (prof) { click(q(`[data-action="setup-profile"][data-id="${prof}"]`)); if (/Ce profil ai/.test(txt())) next(); } };
  next();
  go(11, "mate-info");
  assert(/Clasa a XI-a/.test(q(".wz-lead").textContent), "subjects step names the class");
  assert(hrs("Informatică") === 4 && hrs("Chimie") === 1 && hrs("Limba franceză") === 2 && !rowByName(qa, "TIC") && !rowByName(qa, "Educație artistică"), "mate-info XI: Informatică 4, Chimie 1, no TIC / Educație artistică");
  assert(rowByName(qa, "Economie") && !rowByName(qa, "Științe socio-umane"), "XI: Economie");
  assert(hrs("Istoria evreilor. Holocaustul") === 1, "XI: Holocaust history is compulsory (1 h)");
  go(12, "mate-info");
  assert(rowByName(qa, "Filosofie") && !rowByName(qa, "Economie") && rowByName(qa, "Istoria comunismului din România") && !rowByName(qa, "Istoria evreilor. Holocaustul"), "XII: Filosofie + Istoria comunismului");
  go(10, "mate-info");
  assert(rowByName(qa, "Psihologie") && rowByName(qa, "TIC") && hrs("Informatică") === 1 && hrs("Fizică") === 3 && rowByName(qa, "Educație antreprenorială"), "X: Psihologie, TIC, Informatică 1, Fizică 3");
  go(11, "filologie");
  assert(!rowByName(qa, "Matematică") && hrs("Limba franceză") === 3 && hrs("Limba latină") === 2 && rowByName(qa, "Științe") && rowByName(qa, "Literatură universală") && !rowByName(qa, "Fizică"), "filologie XI");
  go(11, "tehnic");
  assert(hrs("Cultură de specialitate") === 6 && hrs("Pregătire practică") === 5 && hrs("Matematică") === 3, "tehnic XI: specialty + practice hours");
  go(12, "mate-info");
  next(); next(); next();
  click(q('#setup-foot [data-action="setup-finish"]:not([data-timetable])'));
  assert(T.state.settings.report.cls === "a XII-a" && T.state.subjects["Istoria comunismului din România"] && !T.state.subjects["Istoria evreilor. Holocaustul"], "class goes to the report header; XII subjects added");

  // --- 3b. arte vizuale: specializarea schimbă materiile de specialitate
  A = boot(); await new Promise(r => setTimeout(r, 30)); ({ w, T, $, q, qa, click, key, toasts } = A);
  next(); click(q('[data-cls="9"]'));
  click(q('[data-action="setup-profile"][data-id="arte-vizuale"]'));
  const sub = q(".wz-sub");
  assert(sub && sub.previousElementSibling.dataset.id === "arte-vizuale" && q('[data-variant="plastice"]').getAttribute("aria-pressed") === "true", "Arte vizuale: specialization right under it (Arte plastice preselected)");
  next();
  let vn = qa(".setup-row").map(li => li.dataset.name);
  assert(vn.includes("Studiul formelor în desen") && vn.includes("Crochiuri") && vn.includes("Educație muzicală") && !vn.includes("Educație artistică"), "Arte vizuale IX: specialty subjects");
  back(); click(q('[data-variant="arhitectura"]')); next();
  assert(qa(".setup-row").some(li => li.dataset.name === "Atelier de arhitectură"), "Arhitectură IX: its own atelier");
  assert(new Set(qa(".setup-row").map(li => li.dataset.name.toLocaleLowerCase("ro"))).size === qa(".setup-row").length, "no duplicate subjects");
  back();
  click(q('[data-action="setup-profile"][data-id="sportiv"]'));
  assert(/Materiile tale/.test(txt()), "Sportiv: no specialization → straight to subjects");
  vn = qa(".setup-row").map(li => li.dataset.name);
  assert(vn.includes("Pregătire sportivă practică") && !vn.includes("Educație fizică"), "Sportiv: sports training replaces Educație fizică");
  back(); click(q('[data-action="setup-profile"][data-id="mate-info"]')); click(q('[data-variant="intensiv"]')); next();
  assert(hrs("Informatică") === 4 && hrs("Matematică") === 4 && hrs("Logică") === 1 && hrs("Dirigenție") === 1, "mate-info IX intensiv");

  // --- 4. cu date existente: din „Eu”, nu dublează
  A = boot({ "pro_catalog_db_v4": { "Matematică": { ore: 4, target: 10, grades: [{ val: 9, type: "Test", date: "2026-10-01" }] } }, "pro_settings_db_v4": { calc: { method: "weighted" } } });
  await new Promise(r => setTimeout(r, 30)); ({ w, T, $, q, qa, click, key, toasts } = A);
  assert($("setup").hidden, "existing data: no automatic setup");
  click(q('#tab-setari [data-action="setup-open"]'));
  assert(!$("setup").hidden && /Schimbă clasa sau profilul/.test(txt()) && /rămân neatinse/.test(txt()), "Eu → setup says existing grades stay");
  next(); click(q('[data-cls="9"]')); click(q('[data-action="setup-profile"][data-id="stiinte"]')); if (/Ce profil/.test(txt())) next();
  const ex = rowByName(qa, "Matematică");
  assert(ex.classList.contains("is-existing") && /e deja în catalog/.test(ex.textContent), "existing subject marked 'e deja în catalog'");
  next(); next(); next();
  assert(/1 existente/.test(txt()), "summary mentions subjects already there");
  click(q('[data-action="setup-finish"][data-timetable="1"]'));
  assert(T.state.subjects["Matematică"].grades.length === 1 && T.state.subjects["Matematică"].ore === 3, "existing subject: grades untouched, hours follow the programme " + JSON.stringify([T.state.subjects["Matematică"].grades.length, T.state.subjects["Matematică"].ore, T.state.settings.calc.method]));
  assert(!$("tt-overlay").hidden && /Orarul/.test($("tt-title").textContent), "'Completez și orarul' opens the timetable editor");

  // --- 5. „Schimbă programa” (după ce ai una): pornește de la clasă, cu alegerile de dinainte
  T.ui.setup = null; $("tt-overlay").hidden = true;
  const pc = w.document.createElement("button"); pc.dataset.action = "programme-change"; w.document.querySelector("#tab-setari").appendChild(pc); click(pc);
  assert(/În ce clasă/.test(txt()) && q('[data-cls="9"]').getAttribute("aria-pressed") === "true", "programme change opens at the class step, current class selected");
  click(q('[data-cls="10"]'));
  assert(q('[data-id="stiinte"]').getAttribute("aria-checked") === "true" && !q('#setup-foot [data-action="setup-next"]').disabled, "…the profile stays chosen");
  console.log(process.exitCode ? "\nSOME FAILED" : "\nALL PASSED");
})().catch(e => { console.error("CRASH", e); process.exitCode = 1; });
// --- date de module personalizate rămân; configurarea închide un formular deschis
(async () => {
  await new Promise(r => setTimeout(r, 300));
  const custom = [{ start: "2026-09-08", end: "2026-10-24" }, { start: "2026-11-03", end: "2026-12-21" }, { start: "2027-01-12", end: "2027-02-13" }, { start: "2027-02-24", end: "2027-04-22" }, { start: "2027-05-06", end: "2027-06-19" }];
  const A = boot({ "pro_setup_done_v4": "1", "pro_catalog_db_v4": { M: { ore: 1, target: 10, grades: [{ val: 9, type: "Test", date: "2026-10-01" }] } }, "pro_settings_db_v4": { modules: custom } });
  await new Promise(r => setTimeout(r, 30));
  const { w, T, $, q, click, key } = A;
  click(q('[data-action="add-grade"]'));
  assert(!$("cc-overlay").hidden, "the quick-add bar is open");
  click(q('#tab-setari [data-action="setup-open"]'));
  assert($("action-modal").hidden && $("cc-overlay").hidden && !$("setup").hidden && w.document.body.classList.contains("modal-open"), "opening setup closes the form first");
  assert(q("#setup-steps").classList.contains("is-hidden") && q("#setup-steps").getAttribute("aria-hidden") === "true", "welcome: progress kept invisible (layout stable)");
  const nx = () => click(q('#setup-foot [data-action="setup-next"]'));
  nx(); click(q('[data-cls="7"]')); nx(); nx();
  assert(/rămân cum sunt/.test(q("#setup-body").textContent), "custom module dates: county step says they stay");
  q("#setup-county").value = "Cluj"; q("#setup-county").dispatchEvent(new w.Event("change", { bubbles: true }));
  nx(); click(q('[data-action="setup-finish"]:not([data-timetable])'));
  assert(JSON.stringify(T.state.settings.modules) === JSON.stringify(custom), "custom module dates untouched after setup");
  console.log(process.exitCode ? "\nSOME FAILED" : "\nALL PASSED (modules)");
})();
// --- alertă grupată pentru materiile fără note
(async () => {
  await new Promise(r => setTimeout(r, 400));
  const A = boot({ "pro_setup_done_v4": "1", "pro_catalog_db_v4": { A1: { ore: 1, target: 10, grades: [] }, B2: { ore: 1, target: 10, grades: [] }, C3: { ore: 1, target: 10, grades: [] }, D4: { ore: 1, target: 10, grades: [] } } });
  await new Promise(r => setTimeout(r, 30));
  const { w, T, $, q, qa, click } = A;
  const al = () => T.alerts.filter(a => a.icon === "note");
  assert(al().length === 1 && /la 4 materii: A1, B2, C3 și încă 1/.test(al()[0].text), "4 empty subjects → one grouped alert");
  assert($("notif-badge").textContent === "1", "badge counts it once");
  click($("notif-btn")); click(q('#alerte-container [data-action="alert-open"]'));
  assert(T.ui.activeTab === "tab-catalog" && T.ui.catalog.filter === "empty", "tapping it opens Catalog → 'Fără note'");
  T.state.subjects.A1.grades.push({ val: 9, type: "Test", date: "2026-10-01" }); T.state.subjects.B2.grades.push({ val: 9, type: "Test", date: "2026-10-01" }); T.refresh();
  assert(al().length === 2 && al().every(a => /Nu ai nicio notă înregistrată la (C3|D4)/.test(a.text)), "2 left → individual alerts again");
  // ascunsă ca grup → nu revine bucată cu bucată; apoi poate reapărea într-o situație nouă
  T.state.subjects.A1.grades = []; T.state.subjects.B2.grades = []; T.refresh();
  click($("notif-btn")); click([...w.document.querySelectorAll('#alerte-container [data-action="dismiss-alert"]')][0]);
  T.state.subjects.A1.grades.push({ val: 9, type: "Test", date: "2026-10-01" }); T.state.subjects.B2.grades.push({ val: 9, type: "Test", date: "2026-10-01" }); T.refresh();
  assert(al().length === 0, "dismissed group: remaining subjects don't come back one by one");
  T.state.subjects.E5 = { ore: 1, target: 10, grades: [] }; T.state.subjects.F6 = { ore: 1, target: 10, grades: [] }; T.refresh();
  assert(al().some(a => a.id === "nonote:group" || /E5|F6/.test(a.text)), "new empty subjects can be flagged again");
  console.log(process.exitCode ? "\nSOME FAILED" : "\nALL PASSED (group)");
})();
