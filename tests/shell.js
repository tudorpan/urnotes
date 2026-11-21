const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const dir = process.argv[2];
const vc = new VirtualConsole(); vc.on("jsdomError", e => console.log("JSDOM ERR", e.message)); vc.on("error", e => console.log("CONSOLE ERR", e));
let html = fs.readFileSync(path.join(dir, "index.html"), "utf8").replace(/<script src="https:[^>]+><\/script>/, "").replace(/<script src="(script|js\/[^"]+)\.js" defer><\/script>/g, "");
const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
w.matchMedia = q => ({ matches: false, addEventListener(){}, media: q });
w.CSS = { escape: s => s.replace(/"/g, '\\"') };
w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
w.localStorage.setItem("pro_settings_db_v4", JSON.stringify({ calc: { rev: 2, riskThreshold: 8 } })); // pragul vechi (8): testele de risc de mai jos pornesc de la el
w.localStorage.setItem("pro_catalog_db_v4", JSON.stringify({
  "Fizică": { ore: 2, target: 9, grades: [{ val: 5, type: "Test", date: "2026-10-01" }] },
  "Română": { ore: 4, target: 10, grades: [] }
}));
const soon = new Date(); soon.setDate(soon.getDate() + 3); // testul e mereu peste 3 zile (o dată fixă ieșea din fereastra notificărilor)
const soonKey = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`;
w.localStorage.setItem("pro_calendar_db_v4", JSON.stringify({ [soonKey]: [{ id: "e", title: "Test fizică cinematică", type: "Test", subject: "Fizică" }] }));
w.localStorage.setItem("pro_purtare_db_v4", JSON.stringify({ grades: {}, lastModule: "2026-1" }));
w.eval(require("./app_src")(dir) + "\n;window.__t={state,ui,refresh,switchTab,get alerts(){return alerts}};");
const T = w.__t, $ = id => w.document.getElementById(id), q = s => w.document.querySelector(s), qa = s => [...w.document.querySelectorAll(s)];
const click = el => { if (!el) throw new Error("no element"); el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
const key = (k, opts = {}, target = w.document.body) => target.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }));
const assert = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) process.exitCode = 1; };

(async () => {
  if (w.document.readyState === "loading") await new Promise(r => w.document.addEventListener("DOMContentLoaded", r));
  // side menu: patru secțiuni + Eu
  assert(qa(".side-nav .side-link").map(b => b.dataset.tab).join() === "tab-dashboard,tab-catalog,tab-calendar,tab-plan" && q(".side-foot [data-tab='tab-setari']") && /Eu/.test(q(".side-foot [data-tab='tab-setari']").textContent) && q(".side-nav .side-add") && q(".side-nav .side-search"), "side menu: Azi, Note, Calendar, Plan + Adaugă + Caută; Eu at the bottom");
  click(q("[data-action='nav'][data-tab='tab-statistici']"));
  assert(T.ui.activeTab === "tab-statistici" && q(".side-link.active").dataset.tab === "tab-catalog" && !w.document.body.classList.contains("is-subpage"), "Progres is a tab of Note and lights Note");
  assert(q("#tab-statistici .subnav-btn.active")?.dataset.tab === "tab-statistici" && qa("#tab-statistici .subnav-btn").length === 3, "Note tabs: Materii · Progres · Ce-ar fi dacă, Progres on");
  click(q('#tab-statistici .subnav-btn[data-tab="tab-simulator"]'));
  assert(T.ui.activeTab === "tab-simulator" && q(".side-link.active").dataset.tab === "tab-catalog" && q(".side-link.active").getAttribute("aria-current") === "page", "the 'Ce-ar fi dacă' tab keeps Note lit");
  assert($("topbar-back").hidden && /Note\s*[›\/]\s*\S*\s*Ce-ar fi dacă/.test($("topbar-crumb").textContent), "top bar: 'Note › Ce-ar fi dacă', no back button between tabs");
  click(q('#topbar-crumb .crumb-link'));
  assert(T.ui.activeTab === "tab-catalog", "crumb link returns to Note");
  T.switchTab("tab-examene");
  assert(q(".side-link.active").dataset.tab === "tab-plan" && q("#tab-examene .subnav-btn.active")?.dataset.tab === "tab-examene", "Examene is a tab of Plan");
  click(q('#tab-examene .subnav-btn[data-tab="tab-plan"]'));
  assert(T.ui.activeTab === "tab-plan", "Plan tabs switch back");
  assert(!$("tab-alerte") && !q('[data-tab="tab-alerte"]'), "Alerte tab removed");
  // phone bar
  assert(qa(".mobile-bottom-nav .mobile-nav-btn").map(b => b.dataset.tab).join() === "tab-dashboard,tab-catalog,tab-calendar,tab-plan" && q(".mobile-bottom-nav .mobile-add") && !$("more-btn") && $("me-btn"), "phone bar: Azi, Note, Calendar, Plan + raised +; Eu is the avatar up top");

  // notifications panel
  const unread = T.alerts.filter(a => a.unread).length;
  assert(unread > 0 && $("notif-badge").textContent === String(unread) && !$("notif-badge").hidden, "bell badge shows unread count");
  click($("notif-btn"));
  assert(!$("notif-panel").hidden && qa("#alerte-container .alert-card").length === T.alerts.length, "bell opens panel with all alerts");
  click(q('#notif-panel [data-action="mark-alerts-read"]'));
  assert($("notif-badge").hidden, "mark read clears badge");
  const before = T.alerts.length;
  click(q('#alerte-container [data-action="dismiss-alert"]'));
  assert(T.alerts.length === before - 1 && qa("#alerte-container .alert-card").length === before - 1, "dismiss inside panel updates the list live");
  key("Escape");
  assert($("notif-panel").hidden, "Escape closes panel");
  T.state.alertMeta.dismissed = {}; T.refresh();
  click($("notif-btn"));
  const riskBtn = qa('#alerte-container [data-action="alert-open"]').find(b => /pragul de risc/.test(b.textContent));
  assert(riskBtn && riskBtn.querySelector("use").getAttribute("href") === "#i-alert", "risk notification shows alert icon");
  click(riskBtn);
  assert($("notif-panel").hidden && T.ui.activeTab === "tab-catalog" && T.ui.catalog.selected === "Fizică", "tapping a risk notification opens that subject in Catalog");
  click($("notif-btn"));
  const examBtn = qa('#alerte-container [data-action="alert-open"]').find(b => /„Test fizică cinematică”/.test(b.textContent));
  click(examBtn);
  assert(T.ui.activeTab === "tab-calendar", "tapping an exam notification opens Calendar");

  // „+”: întâi „Ce adaugi?” (plăci mari), apoi formularul tipului ales
  click(q("[data-action='nav'][data-tab='tab-dashboard']"));
  click($("quick-add-btn"));
  assert(!$("cc-overlay").hidden && w.document.body.classList.contains("cc-overlay-open") && q("#cc-form")?.dataset.step === "type", "+ opens the type step over the page");
  assert(qa("#cc-overlay-host .cc-tile").map(b => b.dataset.type).join() === "Notă,Test,Temă,Proiect" && w.document.activeElement === q(".cc-tile"), "four big tiles, focus on the first");
  click(q('.cc-tile[data-type="Temă"]'));
  assert(q("#cc-form").dataset.step === "form" && q("#cc-form").dataset.type === "Temă" && /Temă nouă/.test(q(".cc-title").textContent), "a tile opens its own form");
  click(q('[data-action="cc-back"]'));
  assert(q("#cc-form").dataset.step === "type" && w.document.activeElement === q('.cc-tile[data-type="Temă"]'), "back returns to the tiles");
  key("Escape");
  assert($("cc-overlay").hidden, "Escape closes it");
  key("t");
  assert(!$("cc-overlay").hidden && q("#cc-form").dataset.step === "form" && q("#cc-form").dataset.type === "Test", "letter T goes straight to the Test form");
  key("Escape");
  key("n");
  assert(!$("cc-overlay").hidden && q("#cc-form").dataset.type === "Notă" && qa("#cc-overlay-host .cc-val").length === 10, "N goes straight to the grade form");
  key("n");
  assert(!$("cc-overlay").hidden, "N ignored while it is open");
  key("Escape");
  const field = $("cat-search"); field.focus(); key("n", {}, field);
  assert($("cc-overlay").hidden, "typing N in a field does not open it");
  // căutarea
  key("k", { ctrlKey: true });
  assert(!$("palette").hidden && qa("#palette-list .palette-item").length > 4, "Ctrl+K opens search");
  $("palette-input").value = "fiz"; $("palette-input").dispatchEvent(new w.Event("input", { bubbles: true }));
  assert(/Fizică/.test(q("#palette-list .palette-item.is-on")?.textContent) || console.log(qa("#palette-list li").map(l => l.textContent.trim().replace(/\s+/g, " "))), "typing finds the subject without diacritics");
  key("Escape");
  assert($("palette").hidden, "Escape closes search");
  // Azi › „La note”: primele concluzii din Progres, cu drum la materie
  T.switchTab("tab-dashboard");
  assert(!$("azi-focus").hidden && qa("#azi-focus .insight").length >= 1 && qa("#azi-focus .insight").length <= 3 && q('#azi-focus [data-tab="tab-statistici"]'), "Azi shows up to 3 grade insights + link to Progres");
  // „Eu”: o pagină (avatarul din bara de sus pe telefon)
  click($("me-btn"));
  assert(T.ui.activeTab === "tab-setari" && $("me-btn").classList.contains("active") && /Eu/.test($("h-setari").textContent), "avatar opens the Eu page and stays lit");
  const dark = w.document.body.classList.contains("dark-mode");
  click($("eu-theme"));
  assert(w.document.body.classList.contains("dark-mode") !== dark, "Eu → theme toggles");
  click(q('[data-action="nav"][data-tab="tab-dashboard"]'));
  assert(!$("me-btn").classList.contains("active"), "avatar not lit elsewhere");
  // Setări pe secțiuni
  click(q("[data-action='nav'][data-tab='tab-setari']"));
  assert(qa("#set-sec-nav .set-sec").length === 6 && $("settings-grid").dataset.sec, "settings: section menu with 6 sections");
  click(q('#set-sec-nav [data-sec="date"]'));
  assert($("settings-grid").dataset.sec === "date" && q('#set-sec-nav [data-sec="date"]').getAttribute("aria-pressed") === "true" && w.localStorage.getItem("urn_settings_section_v1") === "date", "settings: picking 'Date' shows that section and remembers it");
  key("ArrowLeft", {}, q('#set-sec-nav [data-sec="date"]'));
  assert($("settings-grid").dataset.sec !== "date", "settings: arrow keys move between sections");
  // clopoțelul deschide și închide notificările; Esc le închide de oriunde
  click($("notif-btn"));
  assert(!$("notif-panel").hidden, "bell opens notifications");
  click($("notif-btn"));
  assert($("notif-panel").hidden, "a second click on the bell closes them");
  click($("notif-btn")); w.document.body.focus(); key("Escape");
  assert($("notif-panel").hidden, "Escape closes notifications even with focus on the page");
  T.switchTab("tab-dashboard");
  w.document.body.insertAdjacentHTML("beforeend", '<button id="t-purt" data-action="purtare-settings"></button>');
  click($("t-purt"));
  assert(T.ui.activeTab === "tab-setari" && $("settings-grid").dataset.sec === "scoala", "Purtare → Setări opens the 'Școală' section");
  console.log(process.exitCode ? "\nSOME FAILED" : "\nALL PASSED");
})().catch(e => { console.error("CRASH", e); process.exitCode = 1; });
