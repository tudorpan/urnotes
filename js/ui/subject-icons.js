/* urNotes · O pictogramă pentru fiecare materie.
   Desenate aici, pe aceeași grilă ca restul iconițelor (24×24, linie de 1,7, capete rotunjite), ca să arate ca un set.
   Materia își găsește singură pictograma după nume (SUBJECT_ICON_RULES); din pagina materiei se poate alege alta.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const SUBJECT_ICONS = {
    // limbă și literatură: o carte deschisă, cu un semn de carte
    romana: { label: "Carte", d: `<path d="M12 6.5C10 5.2 7 4.8 3.5 5.2v13c3.5-.4 6.5 0 8.5 1.3 2-1.3 5-1.7 8.5-1.3v-13C17 4.8 14 5.2 12 6.5z"/><path d="M12 6.5v13"/><path d="M15.5 5.1V10l1.5-1 1.5 1V5.2"/>` },
    // matematică: echerul cu unghiul drept și raportorul
    mate: { label: "Echer", d: `<path d="M4 20V5.5L18.5 20z"/><path d="M4 16h4v4"/><path d="M4 10.5a9.5 9.5 0 0 1 9.5 9.5"/>` },
    // fizică: atomul
    fizica: { label: "Atom", d: `<ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>` },
    // chimie: vasul Erlenmeyer, cu lichid și două bule
    chimie: { label: "Eprubetă", d: `<path d="M9.5 3.5h5M10 3.5v5.2L5 18a1.8 1.8 0 0 0 1.6 2.6h10.8A1.8 1.8 0 0 0 19 18l-5-9.3V3.5"/><path d="M7.2 14.5h9.6"/><circle cx="11" cy="17.3" r=".9"/><circle cx="13.8" cy="16" r=".6"/>` },
    // biologie: o frunză cu nervuri
    biologie: { label: "Frunză", d: `<path d="M5 19C4 11 9 4.5 19.5 4.5 19.5 15 13 20 5 19z"/><path d="M5 19L15 9"/><path d="M9.5 14.5h4M12 12V8.5"/>` },
    // istorie: o coloană antică
    istorie: { label: "Coloană", d: `<path d="M5 6.5h14M6 4h12l1 2.5M5 6.5L6 4"/><path d="M7 9h10M7 9v9M17 9v9M10.3 9v9M13.7 9v9"/><path d="M5.5 18h13M4 20.5h16"/>` },
    // geografie: globul cu meridiane și paralele
    geografie: { label: "Glob", d: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.3 3.8 8.5s-1.2 6.1-3.8 8.5M12 3.5C9.4 5.9 8.2 8.8 8.2 12s1.2 6.1 3.8 8.5"/><path d="M5.2 7.5h13.6M5.2 16.5h13.6"/>` },
    // engleză: turnul cu ceas din Londra
    engleza: { label: "Big Ben", d: `<path d="M12 2.5l2 3.5h-4z"/><path d="M9.5 6h5v4h-5z"/><circle cx="12" cy="8" r="1.1"/><path d="M9 10h6l-.5 10.5h-5z"/><path d="M10.3 13h3.4M10.2 16h3.6"/><path d="M6.5 20.5h11"/>` },
    // franceză: turnul Eiffel
    franceza: { label: "Turnul Eiffel", d: `<path d="M12 2.5v2.5"/><path d="M10.8 5h2.4l1.3 6h-5z"/><path d="M9.5 11h5"/><path d="M9.5 11L6 20.5M14.5 11l3.5 9.5"/><path d="M8.3 15h7.4"/><path d="M9.2 20.5a2.8 2.8 0 0 1 5.6 0"/><path d="M4.5 20.5h15"/>` },
    // germană: un castel cu turnuri ascuțite (ca Neuschwanstein)
    germana: { label: "Castel", d: `<path d="M4 20.5V11l2-3.5L8 11v9.5M16 20.5V11l2-3.5 2 3.5v9.5"/><path d="M8 20.5v-7h8v7"/><path d="M10 13.5V8.5l2-4 2 4v5"/><path d="M10.6 20.5v-3a1.4 1.4 0 0 1 2.8 0v3"/><path d="M3 20.5h18"/>` },
    // spaniolă: un evantai deschis
    spaniola: { label: "Evantai", d: `<path d="M12 19.5L3.8 9.6a11 11 0 0 1 16.4 0z"/><path d="M12 19.5L7.7 6M12 19.5V5.2M12 19.5l4.3-13.5"/><circle cx="12" cy="19.5" r="1"/>` },
    // italiană: turnul din Pisa, aplecat
    italiana: { label: "Turnul din Pisa", d: `<g transform="rotate(8 12 20)"><path d="M9 20.5V6.5h6v14"/><path d="M8.5 6.5h7M10 4h4v2.5"/><path d="M9 9.5h6M9 12.5h6M9 15.5h6M9 18h6"/></g><path d="M5 20.5h14"/>` },
    // latină: cununa de lauri
    latina: { label: "Lauri", d: `<path d="M11 19.5C7.6 18.2 5.8 14.7 6.4 10.6c.2-1.7.8-3.3 1.6-4.6M13 19.5c3.4-1.3 5.2-4.8 4.6-8.9-.2-1.7-.8-3.3-1.6-4.6"/><ellipse cx="7.6" cy="17.9" rx=".9" ry="2" transform="rotate(-62 7.6 17.9)" fill="currentColor" stroke="none"/><ellipse cx="16.4" cy="17.9" rx=".9" ry="2" transform="rotate(62 16.4 17.9)" fill="currentColor" stroke="none"/><ellipse cx="5.4" cy="15.3" rx=".9" ry="2" transform="rotate(-38 5.4 15.3)" fill="currentColor" stroke="none"/><ellipse cx="18.6" cy="15.3" rx=".9" ry="2" transform="rotate(38 18.6 15.3)" fill="currentColor" stroke="none"/><ellipse cx="4.3" cy="12.1" rx=".9" ry="2" transform="rotate(-14 4.3 12.1)" fill="currentColor" stroke="none"/><ellipse cx="19.7" cy="12.1" rx=".9" ry="2" transform="rotate(14 19.7 12.1)" fill="currentColor" stroke="none"/><ellipse cx="4.6" cy="8.8" rx=".9" ry="2" transform="rotate(12 4.6 8.8)" fill="currentColor" stroke="none"/><ellipse cx="19.4" cy="8.8" rx=".9" ry="2" transform="rotate(-12 19.4 8.8)" fill="currentColor" stroke="none"/><ellipse cx="6.0" cy="5.9" rx=".9" ry="2" transform="rotate(34 6.0 5.9)" fill="currentColor" stroke="none"/><ellipse cx="18.0" cy="5.9" rx=".9" ry="2" transform="rotate(-34 18.0 5.9)" fill="currentColor" stroke="none"/><ellipse cx="8.9" cy="15.0" rx=".75" ry="1.6" transform="rotate(-20 8.9 15.0)" fill="currentColor" stroke="none"/><ellipse cx="15.1" cy="15.0" rx=".75" ry="1.6" transform="rotate(20 15.1 15.0)" fill="currentColor" stroke="none"/><ellipse cx="7.6" cy="11.6" rx=".75" ry="1.6" transform="rotate(8 7.6 11.6)" fill="currentColor" stroke="none"/><ellipse cx="16.4" cy="11.6" rx=".75" ry="1.6" transform="rotate(-8 16.4 11.6)" fill="currentColor" stroke="none"/><ellipse cx="8.0" cy="8.3" rx=".75" ry="1.6" transform="rotate(30 8.0 8.3)" fill="currentColor" stroke="none"/><ellipse cx="16.0" cy="8.3" rx=".75" ry="1.6" transform="rotate(-30 16.0 8.3)" fill="currentColor" stroke="none"/>` },
    // limbă străină (oricare alta): două bule de vorbă
    limba: { label: "Bule de vorbă", d: `<path d="M3.5 5.5h10v7h-5L5.5 15v-2.5h-2z"/><path d="M13.5 9h7v7h-2v2.5l-3-2.5h-5v-3"/><path d="M6.5 9h4"/>` },
    // informatică: un ecran cu cod
    informatica: { label: "Cod", d: `<rect x="3" y="4.5" width="18" height="13" rx="2"/><path d="M9.5 9l-2.5 2 2.5 2M14.5 9l2.5 2-2.5 2M12.8 8.3l-1.6 5.4"/><path d="M8.5 20.5h7"/>` },
    // TIC: laptopul
    tic: { label: "Laptop", d: `<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 18.5h19l-1.5-3.5H4z"/>` },
    // educație fizică și sport: mingea de baschet
    sport: { label: "Minge", d: `<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17"/><path d="M6 6a8.8 8.8 0 0 1 0 12M18 6a8.8 8.8 0 0 0 0 12"/>` },
    // muzică: două optimi legate
    muzica: { label: "Note muzicale", d: `<path d="M9 17.5V6l10-2v11.5"/><path d="M9 9.5l10-2"/><circle cx="6.8" cy="17.5" r="2.2"/><circle cx="16.8" cy="15.5" r="2.2"/>` },
    // arte / desen: paleta cu pensula
    arte: { label: "Paletă", d: `<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.6-1.8-.3-1.4.7-2.6 2.1-2.6H18a2.5 2.5 0 0 0 2.5-2.6C20.4 8.3 16.7 3.5 12 3.5z"/><circle cx="8" cy="11" r="1.1"/><circle cx="10.5" cy="7.5" r="1.1"/><circle cx="15" cy="7.8" r="1.1"/>` },
    // religie: o lumânare aprinsă
    religie: { label: "Lumânare", d: `<path d="M12 3c1.6 1.8 2 3.1 1.4 4.2A1.6 1.6 0 0 1 10.6 7.2C10 6.1 10.4 4.8 12 3z"/><path d="M12 9v1.5"/><rect x="9.5" y="10.5" width="5" height="9" rx="1"/><path d="M7 20.5h10"/>` },
    // logică: o piesă de puzzle
    logica: { label: "Puzzle", d: `<path d="M5 8.5h3.2a2 2 0 1 1 3.6 0H15v3.3a2 2 0 1 1 0 3.6V19H11.8a2 2 0 1 0-3.6 0H5v-3.6a2 2 0 1 0 0-3.6z"/>` },
    // filosofie: bufnița
    filosofie: { label: "Bufniță", d: `<path d="M6 5l2.5 2.2h7L18 5v8.5a6 6 0 0 1-12 0z"/><circle cx="9.5" cy="10.5" r="2"/><circle cx="14.5" cy="10.5" r="2"/><path d="M11.3 13.4l.7 1 .7-1"/><path d="M9 20.5l1.5-1.4M15 20.5l-1.5-1.4"/>` },
    // psihologie: un profil de om cu un gând în spirală
    psihologie: { label: "Minte", d: `<path d="M9 20.5v-3H7a2 2 0 0 1-2-2v-2.3L3.6 12 5 10C5 6.4 7.9 3.5 11.5 3.5S18 6.4 18 10c0 2.4-1.2 4.2-3 5.3v5.2"/><path d="M11.8 10.2a.8.8 0 1 1-.9-1.1 1.8 1.8 0 0 1 2.3 1.6 2.8 2.8 0 0 1-2.6 2.8 3.8 3.8 0 0 1-3.6-3.4"/>` },
    // economie: o bancă de monede și o săgeată care urcă
    economie: { label: "Monede", d: `<ellipse cx="8.5" cy="12.5" rx="4.5" ry="1.8"/><path d="M4 12.5v6c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8v-6"/><path d="M4 15.5c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8"/><path d="M15 12.5l5-6"/><path d="M16.5 6.5H20V10"/>` },
    // antreprenoriat: becul unei idei
    antreprenor: { label: "Idee", d: `<path d="M9 17.5h6M9.8 20.5h4.4"/><path d="M9 17.5c0-2-3.5-3.3-3.5-7.5a6.5 6.5 0 0 1 13 0c0 4.2-3.5 5.5-3.5 7.5"/><path d="M12 7.5l-1.5 3h3L12 13.5"/>` },
    // sociologie, educație socială: trei oameni
    sociala: { label: "Oameni", d: `<circle cx="12" cy="7.5" r="2.6"/><path d="M7.5 19.5v-1.3a4.5 4.5 0 0 1 9 0v1.3"/><circle cx="5.5" cy="10" r="2"/><path d="M2.5 18.5v-.8a3.3 3.3 0 0 1 4-3.2"/><circle cx="18.5" cy="10" r="2"/><path d="M21.5 18.5v-.8a3.3 3.3 0 0 0-4-3.2"/>` },
    // educație civică, drept: balanța
    civica: { label: "Balanță", d: `<path d="M12 3.5v16M7.5 20.5h9"/><path d="M4.5 7h15M12 5.5l-7.5 1.5M12 5.5l7.5 1.5"/><path d="M4.5 7L2 13h5zM19.5 7L17 13h5z"/><path d="M2 13a2.5 2.5 0 0 0 5 0M17 13a2.5 2.5 0 0 0 5 0"/>` },
    // dirigenție, consiliere: busola
    dirigentie: { label: "Busolă", d: `<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/><path d="M12 3.5v1.5M12 19v1.5M3.5 12H5M19 12h1.5"/>` },
    // educație tehnologică: o rotiță
    tehnologie: { label: "Rotiță", d: `<path d="M10.4 3.5h3.2l.5 2.4 1.7.9 2.2-1.1 2.3 2.3-1.1 2.2.9 1.7 2.4.5v3.2l-2.4.5-.9 1.7 1.1 2.2-2.3 2.3-2.2-1.1-1.7.9-.5 2.4h-3.2l-.5-2.4-1.7-.9-2.2 1.1-2.3-2.3 1.1-2.2-.9-1.7-2.4-.5v-3.2l2.4-.5.9-1.7-1.1-2.2 2.3-2.3 2.2 1.1 1.7-.9z" transform="translate(12 12) scale(.86) translate(-12 -12)"/><circle cx="12" cy="12" r="3"/>` },
    // astronomie: o planetă cu inel
    astronomie: { label: "Planetă", d: `<circle cx="12" cy="12" r="5.5"/><path d="M6.7 13.7C3.6 15.6 2 17.4 2.6 18.4c.9 1.6 6.8-.6 13-4.9 6.2-4.3 9.7-9 8.8-10.6-.6-1-2.9-.6-5.9.8" transform="translate(12 12) scale(.85) translate(-12 -12)"/>` },
    // geologie, științe: o lupă
    stiinte: { label: "Lupă", d: `<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3l5.2 5.2"/><path d="M7.5 9a3.5 3.5 0 0 1 3-2.5"/>` },
    // teatru, opțional artistic: măștile
    teatru: { label: "Măști", d: `<path d="M3.5 5.5c3-1.3 6-1.3 9 0v5c0 3-2 5.3-4.5 5.3S3.5 13.5 3.5 10.5z"/><path d="M6 8.5h1.3M9.2 8.5h1.3M6.3 12a2.8 2.8 0 0 0 3.9 0"/><path d="M14.5 9c2-.6 4-.5 6 .3v4.6c0 3-2 5.3-4.5 5.3-1.5 0-2.9-.9-3.7-2.3"/><path d="M15.8 12.2H17M18.3 12.2h1.2M16 16.3a2.6 2.6 0 0 1 3.3 0"/>` }
};

// numele materiei (fără diacritice) → pictograma; prima regulă care se potrivește câștigă
const SUBJECT_ICON_RULES = [
    [/educatie fizica|sport/, "sport"], [/matem/, "mate"], [/fizic/, "fizica"], [/chimi/, "chimie"],
    [/biolog|anatom|ecolog/, "biologie"], [/romana|literatur/, "romana"],
    [/englez/, "engleza"], [/francez/, "franceza"], [/german/, "germana"], [/spaniol/, "spaniola"], [/italian/, "italiana"], [/latin/, "latina"],
    [/limba|lb\.|rus|maghiar|ucrainean|turc|chinez|japonez|portughez/, "limba"],
    [/istori/, "istorie"], [/geograf/, "geografie"], [/geolog|stiinte/, "stiinte"], [/astronom/, "astronomie"],
    [/^tic$|tehnologia informatiei|comunicatiilor/, "tic"], [/informatic|programar/, "informatica"],
    [/religi/, "religie"], [/logic/, "logica"], [/filosof/, "filosofie"], [/psiholog/, "psihologie"],
    [/antreprenor/, "antreprenor"], [/economi/, "economie"],
    [/civic|drept|cultura civica/, "civica"], [/sociolog|sociala|social/, "sociala"],
    [/muzic/, "muzica"], [/teatru|actorie|dans/, "teatru"], [/desen|arte|plastic|vizual|pictur/, "arte"],
    [/dirigen|consiliere/, "dirigentie"], [/tehnolog/, "tehnologie"]
];

const foldName = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Cheia pictogramei unei materii: cea aleasă de elev („i:cheie”) sau cea găsită după nume. "" = niciuna (rămân inițialele). */
function subjectIconKey(mat) {
    const own = state.subjects?.[mat]?.icon;
    if (typeof own === "string" && own.startsWith("i:") && SUBJECT_ICONS[own.slice(2)]) return own.slice(2);
    const name = foldName(mat);
    for (const [re, key] of SUBJECT_ICON_RULES) if (re.test(name)) return key;
    return "";
}
/** O pictogramă din set, după cheie. */
function subjectIconSVG(key, cls = "") {
    const ic = SUBJECT_ICONS[key];
    if (!ic) return "";
    return `<svg class="sic${cls ? ` ${cls}` : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic.d}</svg>`;
}
/** Pictograma materiei; fără una potrivită, inițialele (ca până acum). */
function subjectGlyph(mat, cls = "") {
    const key = subjectIconKey(mat);
    return key ? subjectIconSVG(key, cls) : `<span class="sic-initials${cls ? ` ${cls}` : ""}">${escapeHTML(subjectInitials(mat))}</span>`;
}
