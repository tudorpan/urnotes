// Foile de stil: reguli care trebuie să rămână întregi (o selecție care și-a pierdut „{ display: none }”
// se lipește de regula următoare și arată ce ar trebui ascuns — așa a apărut pagina materiei sub listă).
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
const assert = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) process.exitCode = 1; };
const css = ["style.css", "ui.css"].map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
/** Toate regulile (selector → declarații), inclusiv cele din @media. */
const rules = [];
const re = /([^{}]+)\{([^{}]*)\}/g; let m;
while ((m = re.exec(css))) rules.push({ sel: m[1].trim().replace(/\s+/g, " "), body: m[2] });
const hides = sel => rules.some(r => r.sel.split(",").map(s => s.trim()).includes(sel) && /display:\s*none/.test(r.body));
const shows = sel => rules.filter(r => r.sel.split(",").map(s => s.trim()).includes(sel) && /display:\s*(?!none\b)[a-z]/.test(r.body));
for (const sel of [".catalog-layout.show-detail .cat-list-pane", ".catalog-layout:not(.show-detail) .cat-detail-pane",
                   "#tab-catalog.cat-detail-open .page-intro", "#tab-catalog.cat-detail-open .cat-summary"]) {
  assert(hides(sel) && !shows(sel).length, `Note: „${sel}” is hidden and never shown`);
}
// acoladele se închid
const open = (css.match(/\{/g) || []).length, close = (css.match(/\}/g) || []).length;
assert(open === close, `braces balanced (${open}/${close})`);
// nicio regulă goală rămasă după ștergeri
const empty = rules.filter(r => !r.body.trim() && !r.sel.startsWith("@")).map(r => r.sel);
assert(!empty.length, `no empty rules ${empty.slice(0, 3).join(" | ")}`);
console.log(process.exitCode ? "" : "ALL PASSED");
