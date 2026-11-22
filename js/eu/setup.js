/* urNotes · Configurarea la prima pornire și programa.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

/* ==================== CONFIGURARE LA PRIMA PORNIRE ==================== */
/*
 * Un asistent pas cu pas (clasa → profil → materii → țintă → județ) care apare când caietul e gol.
 * Materiile propuse urmează planurile-cadru (liceu: clasa a IX-a, OMEC nr. 4350/2025; gimnaziu: planul în vigoare).
 * Orele sunt orientative: școlile pot redistribui orele, iar elevul le poate corecta în pasul 2.
 */
const SETUP_DONE_KEY = "pro_setup_done_v4";
/* Un singur drum, câte o întrebare pe ecran: clasa → profilul (doar la liceu) → materiile → ținta → județul → gata. */
const WZ_LABELS = { class: "Clasa", profile: "Profilul", subjects: "Materiile", goal: "Ținta", county: "Județul", done: "Gata" };
const WZ_TARGETS = [7, 8, 8.5, 9, 9.5, 10];
/* Avertizarea are sens doar sub țintă: „sub 9” cu ținta 8 nu se poate alege. */
const WZ_RISKS = [
    { v: 5, title: "Doar când risc corigența", sub: "când media unei materii scade sub 5" },
    { v: 6, title: "Din timp", sub: "când media unei materii scade sub 6" },
    { v: 7, title: "Mai devreme", sub: "când media unei materii scade sub 7" },
    { v: 8, title: "Cât mai devreme", sub: "când media unei materii scade sub 8" }
];
/*
 * Materiile propuse urmează planurile-cadru oficiale, după profil ȘI clasă (verificate în octombrie 2026):
 *   – clasa a IX-a: planul-cadru nou, OMEC 4350/2025 (modificat prin OMEC 4152/2026; intensiv informatică: OMEC 6873/2025),
 *     aplicat din 2026–2027 doar la a IX-a;
 *   – clasele X–XII: planurile din 2009 (OMECI 3410/2009, filiera teoretică și vocațională; pedagogic OMECTS 5347/2011;
 *     tehnologic OMECTS 3081/2010 și OMECI 3412/2009), cu anexa pentru XI–XII înlocuită prin OME 3667/2023 și OME 7723/2024
 *     (Istoria evreilor. Holocaustul în a XI-a, Istoria comunismului din România în a XII-a);
 *   – gimnaziul: OMENCS 3590/2016, anexa 2.
 * La vocațional și tehnologic, împărțirea orelor de specialitate pe discipline diferă între școli: e orientativă.
 * Orele de CDȘ / opționale nu apar (le alege fiecare școală). Totul se poate corecta în pasul 2.
 */
const LICEU = [9, 10, 11, 12];
const ROMAN = { 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII" };
const LM2 = ["Limba franceză", { hint: "limba modernă 2" }];
const MAX_ORE = 7; // cea mai mare normă dintr-un plan-cadru (Informatică, intensiv, a XI-a)
const TARGET_CHOICES = [5, 6, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const LM2_CHOICES = ["Limba franceză", "Limba germană", "Limba spaniolă", "Limba italiană", "Limba rusă", "Limba portugheză"];
/* Dirigenția: în gimnaziu și în noua clasă a IX-a apare în planul-cadru sub alt nume; la celelalte clase o adăugăm noi. */
const DIRIG = "Dirigenție";
const DIRIG_ALIASES = ["Consiliere și dezvoltare personală", "Dezvoltare personală și consiliere pentru carieră"];
/* Opționalul (curriculum la decizia școlii): un singur loc, căruia elevul îi scrie doar tema. */
const OPT = "Opțional";
const isOptionalName = name => name === OPT || String(name).startsWith(`${OPT} · `);
const optionalTopic = name => isOptionalName(name) && name !== OPT ? name.slice(OPT.length + 3) : "";
const optionalName = topic => {
    const t = cleanName(topic, 40);
    return t ? `${OPT} · ${t}` : OPT;
};

/**
 * Pornește de la o listă de bază [nume, ore], schimbă orele (`set`), scoate materii (`drop`)
 * și adaugă materiile de specialitate (`add`). Orele 0 din `set` scot materia.
 */
function plan(base, { set = {}, drop = [], add = [] } = {}) {
    const rows = base
        .filter(([name]) => !drop.includes(name))
        .map(([name, ore, opt]) => [name, name in set ? set[name] : ore, opt])
        .filter(([, ore]) => ore > 0);
    return [...rows, ...add].map(([name, ore, opt]) => opt ? [name, ore, opt] : [name, ore]);
}
const withLm2 = (rows, ore) => rows.map(r => r[0] === LM2[0] ? [r[0], ore ?? r[1], LM2[1]] : r);

/* ---------- Clasa a IX-a: planul-cadru nou (OMEC 4350/2025, modificat prin OMEC 4152/2026), din 2026–2027 ---------- */
// Trunchiul comun, la fel pentru toate profilurile (19 ore); orele de „curriculum de specialitate” se adaugă peste el.
const TC_IX = [
    ["Limba și literatura română", 3], ["Limba engleză", 2], [LM2[0], 1],
    ["Matematică", 2], ["Fizică", 1], ["Chimie", 1], ["Biologie", 1],
    ["Istorie", 1], ["Geografie", 1], ["Logică", 1], ["Religie", 1],
    ["Educație artistică", 1, { hint: "educație muzicală și vizuală, câte o jumătate de oră" }],
    ["Educație fizică și sport", 1], ["TIC", 1], ["Dezvoltare personală și consiliere pentru carieră", 1]
];
const ix = opts => withLm2(plan(TC_IX, opts));

/* ---------- Clasele X–XII: planurile din 2009 (OMECI 3410/2009), cu modificările din 2023 și 2024 ---------- */
// Clasa a X-a (ciclul inferior al liceului, anexa 1 — neschimbată din 2009). Profilul real și cel umanist au câte un tabel comun.
const X_REAL = [
    ["Limba și literatura română", 3], ["Limba engleză", 2], [LM2[0], 2],
    ["Matematică", 4], ["Fizică", 3], ["Chimie", 2], ["Biologie", 2], ["Informatică", 1],
    ["Istorie", 1], ["Geografie", 1], ["Psihologie", 1], ["Religie", 1],
    ["Educație artistică", 1, { hint: "muzică și arte vizuale, alternativ" }], ["Educație fizică", 2], ["TIC", 1], ["Educație antreprenorială", 1]
];
const X_UMAN = [
    ["Limba și literatura română", 4], ["Limba engleză", 3], [LM2[0], 2], ["Limba latină", 1],
    ["Matematică", 2], ["Fizică", 2], ["Chimie", 1], ["Biologie", 1],
    ["Istorie", 3], ["Geografie", 2], ["Psihologie", 2], ["Religie", 1],
    ["Educație artistică", 1, { hint: "muzică și arte vizuale, alternativ" }], ["Educație fizică", 1], ["TIC", 1], ["Educație antreprenorială", 1]
];
// Trunchiul comun vocațional în a X-a (19 ore), peste care vin disciplinele artistice / sportive / teologice.
const X_VOC = [
    ["Limba și literatura română", 3], ["Limba engleză", 2], [LM2[0], 1],
    ["Matematică", 2], ["Fizică", 2], ["Chimie", 1], ["Biologie", 1],
    ["Istorie", 1], ["Geografie", 1], ["Psihologie", 1], ["Religie", 1],
    ["Educație fizică", 1], ["TIC", 1], ["Educație antreprenorială", 1]
];
// Clasele XI–XII (ciclul superior, anexa 2 înlocuită prin OME 3667/2023 și OME 7723/2024):
// în a XI-a „Istoria evreilor. Holocaustul”, în a XII-a „Istoria comunismului din România” — câte o oră, obligatorii.
const XI_XII_ISTORIE = cls => cls === 11 ? ["Istoria evreilor. Holocaustul", 1] : ["Istoria comunismului din România", 1];
const SOCIO_SUP = cls => cls === 11 ? "Economie" : "Filosofie";
const SUP_COMMON = cls => [
    ["Limba și literatura română", 3], ["Limba engleză", 2], [LM2[0], 2],
    ["Istorie", 1], XI_XII_ISTORIE(cls), ["Geografie", 1], [SOCIO_SUP(cls), 1], ["Religie", 1]
];
const sup = (cls, opts) => withLm2(plan(SUP_COMMON(cls), opts));

/* ---------- Clasele X–XII, filiera tehnologică (OMECTS 3081/2010; OMECI 3412/2009 cu OME 3664/2023 și 7724/2024) ---------- */
function tehnologicSup(cls, kind) {
    const servicii = kind === "servicii";
    const resurse = kind === "resurse";
    return withLm2([
        ["Limba și literatura română", 3], ["Limba engleză", 2], [LM2[0], 2],
        ["Matematică", 3],
        ...(servicii ? [] : resurse
            ? [["Chimie", cls === 11 ? 2 : 1], ["Biologie", cls === 11 ? 1 : 2]]
            : [["Fizică", 2], ["Chimie", 1]]),
        ["Istorie", servicii && cls === 11 ? 2 : 1], XI_XII_ISTORIE(cls), ["Geografie", servicii && cls === 12 ? 2 : 1],
        [cls === 11 ? "Economie" : "Economie aplicată", servicii ? 2 : 1], ["Religie", 1], ["Educație fizică", 1], ["TIC", 1],
        ["Cultură de specialitate", 6, { hint: "modulele calificării tale, la un loc" }],
        ["Pregătire practică", servicii && cls === 11 ? 6 : 5, { hint: "plus stagiile de practică de la sfârșitul anului" }]
    ]);
}
const TEHNOLOGIC_IX = [
    ["Pregătire teoretică de specialitate", 4, { hint: "modulele calificării tale, la un loc" }],
    ["Laborator tehnologic și instruire practică", 6, { hint: "plus 5 săptămâni de stagiu de practică pe an" }]
];
const TEHNOLOGIC_X = kind => withLm2(plan(X_VOC, {
    set: { "Matematică": kind === "servicii" ? 2 : 3, "Fizică": kind === "servicii" ? 1 : 2, [LM2[0]]: 2 },
    add: [
        ["Pregătire de specialitate", 6, { hint: "modulele calificării tale, la un loc" }],
        ["Instruire practică", 5, { hint: "plus 3 săptămâni de stagiu de practică pe an" }]
    ]
}));

const SETUP_GROUPS = [
    { id: "teoretic", label: "Liceu teoretic" },
    { id: "vocational", label: "Liceu vocațional" },
    { id: "tehnologic", label: "Liceu tehnologic" },
    { id: "alte", label: "Gimnaziu și altele" }
];

const SETUP_PROFILES = {
    "mate-info": {
        group: "teoretic", label: "Matematică-informatică", hint: "profil real", classes: LICEU,
        variantLabel: "Tipul clasei",
        variants: [{ id: "normal", label: "Normală" }, { id: "intensiv", label: "Intensiv informatică" }],
        subjects: ({ cls, variant }) => {
            const intensiv = variant?.id === "intensiv";
            if (cls === 9) return ix({ set: { "Matematică": 4, "Fizică": 3, "Chimie": 2 }, add: [["Informatică", intensiv ? 4 : 2]] });
            if (cls === 10) return withLm2(plan(X_REAL, { set: { "Informatică": intensiv ? 4 : 1 } }));
            return sup(cls, { add: [["Matematică", 4], ["Fizică", 3], ["Chimie", 1], ["Biologie", 1], ["Informatică", intensiv ? 7 : 4], ["Educație fizică", 1]] });
        }
    },
    "stiinte": {
        group: "teoretic", label: "Științe ale naturii", hint: "profil real", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({ set: { "Matematică": 3, "Fizică": 3, "Chimie": 3, "Biologie": 3 }, add: [["Informatică", 1]] });
            if (cls === 10) return withLm2(plan(X_REAL));
            return sup(cls, { add: [["Matematică", 3], ["Fizică", 3], ["Chimie", 2], ["Biologie", 2], ["TIC", cls === 11 ? 2 : 1], ["Educație fizică", 1]] });
        }
    },
    "filologie": {
        group: "teoretic", label: "Filologie", hint: "profil umanist", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({ set: { "Limba și literatura română": 5, "Limba engleză": 3, [LM2[0]]: 2, "Istorie": 2, "Geografie": 2, "Logică": 2 }, add: [["Limba latină", 1]] });
            if (cls === 10) return withLm2(plan(X_UMAN));
            return sup(cls, {
                set: { "Limba și literatura română": 4, "Limba engleză": 3, [LM2[0]]: 3, "Istorie": 2, [SOCIO_SUP(cls)]: cls === 12 ? 2 : 1 },
                add: [["Limba latină", cls === 11 ? 2 : 1], ["Literatură universală", 1], ["Științe", 1], ...(cls === 11 ? [["Sociologie", 1]] : []),
                    ["TIC", 1], ["Educație artistică", 1], ["Educație fizică", 1]]
            });
        }
    },
    "sociale": {
        group: "teoretic", label: "Științe sociale", hint: "profil umanist", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({ set: { "Limba și literatura română": 4, "Limba engleză": 3, [LM2[0]]: 2, "Istorie": 2, "Geografie": 2, "Logică": 2 }, add: [["Limba latină", 1]] });
            if (cls === 10) return withLm2(plan(X_UMAN));
            return sup(cls, {
                set: { "Istorie": 3, "Geografie": 2, [SOCIO_SUP(cls)]: cls === 11 ? 2 : 3 },
                add: [["Matematică", 2], ...(cls === 11 ? [["Sociologie", 2]] : [["Studii sociale", 1, { hint: "disciplina socio-umană a școlii" }]]),
                    ["TIC", cls === 11 ? 2 : 1], ["Educație artistică", 1], ["Educație fizică", 1]]
            });
        }
    },
    "arte-vizuale": {
        group: "vocational", label: "Arte vizuale", hint: "arte plastice, decorative, arhitectură, design", classes: LICEU,
        variantLabel: "Specializarea",
        variants: [
            { id: "plastice", label: "Arte plastice" },
            { id: "decorative", label: "Arte decorative" },
            { id: "arhitectura", label: "Arhitectură" },
            { id: "design", label: "Design" }
        ],
        subjects: ({ cls, variant }) => {
            const id = variant?.id || "plastice";
            const atelier = { plastice: "Atelier de specialitate", decorative: "Atelier de arte decorative", arhitectura: "Atelier de arhitectură", design: "Atelier de design" }[id];
            // În a IX-a, toate specializările de arte vizuale au aceleași discipline (OMEC 4350/2025, anexa 12).
            if (cls === 9) return ix({
                drop: ["Educație artistică"],
                add: [["Educație muzicală", 1], [atelier, 2], ["Studiul formelor în desen", 2], ["Studiul formelor în culoare", 2], ["Studiul formelor în volum", 2],
                    ["Crochiuri", 1], ["Istoria artelor și a arhitecturii", 1]]
            });
            const arhi = id === "arhitectura" || id === "design"; // în X–XII, design-ul e în tabelul „arhitectură, arte ambientale și design”
            if (cls === 10) return withLm2(plan(X_VOC, {
                add: [["Educație muzicală", 1], ["Studiul formelor în desen", 2], [arhi ? "Geometrie descriptivă și perspectivă" : "Studiul formelor în culoare și studiul culorii", 2],
                    ["Studiul formelor în volum", 2], [atelier, 2], [arhi ? "Istoria artelor și a arhitecturii" : "Istoria artelor", 1]]
            }));
            return sup(cls, {
                add: arhi
                    ? [["Matematică", 2], ["Desen", 3], ["Geometrie descriptivă și perspectivă", 2], [atelier, 4], ["Istoria artelor și a arhitecturii", 2],
                        ["Procesarea computerizată a imaginii", 2], ["Educație fizică", 1]]
                    : [["Studiul formelor în desen", 3], ["Crochiuri", 1], [atelier, 4], ["Studiul corpului și al figurii umane", 3], ["Istoria artelor", 2],
                        ["Procesarea computerizată a imaginii", 2], ["Educație fizică", 1]]
            });
        }
    },
    "muzica": {
        group: "vocational", label: "Muzică", hint: "instrument, canto, teorie", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({
                drop: ["Educație artistică"],
                add: [["Instrument principal", 3, { hint: "sau canto, după secție" }], ["Ansamblu", 3, { hint: "coral, orchestral sau cameral" }], ["Teorie-solfegiu-dicteu", 3],
                    ["Istoria muzicii", 1], ["Pian complementar", 1], ["Armonie", 1]]
            });
            if (cls === 10) return withLm2(plan(X_VOC, {
                add: [["Educație vizuală", 1], ["Instrument principal", 3, { hint: "sau canto, după secție" }], ["Teorie-solfegiu-dicteu", 2], ["Ansamblu", 2, { hint: "coral, orchestral sau cameral" }],
                    ["Armonie", 1], ["Istoria muzicii", 1], ["Pian complementar", 1]]
            }));
            return sup(cls, {
                add: [["Instrument principal", 4, { hint: "sau canto, după secție" }], ["Teorie-solfegiu-dicteu", 2], ["Armonie", 2], ["Istoria muzicii", 2],
                    ["Ansamblu", 2, { hint: "coral, orchestral sau cameral" }], ["Forme muzicale", 1], ["Pian complementar", 1], ["Educație fizică", 1], ["TIC", 1]]
            });
        }
    },
    "coregrafie": {
        group: "vocational", label: "Coregrafie", hint: "dans clasic și contemporan", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({
                drop: ["Educație artistică", "Educație fizică și sport"],
                add: [["Dans clasic", 8], ["Dans contemporan", 1], ["Dans de caracter", 1], ["Dans românesc", 1], ["Repertoriu individual", 1], ["Repertoriu de ansamblu", 1],
                    ["Istoria baletului", 1], ["Educație muzicală", 1], ["Laborator de creație", 1]]
            });
            if (cls === 10) return withLm2(plan(X_VOC, {
                drop: ["Educație fizică"],
                add: [["Educație muzicală", 1], ["Educație vizuală", 1], ["Dans clasic", 7], ["Dans contemporan", 2], ["Dans de caracter", 2], ["Dans românesc", 1], ["Istoria baletului", 1]]
            }));
            return sup(cls, {
                add: [["Biologie", 1], ["Educație muzicală", 1], ["Dans clasic", 8], ["Dans contemporan", 2], ["Dans de caracter", 2], ["Dans românesc", 1],
                    ["Repertoriu", cls === 11 ? 1 : 2], ["Istoria baletului", 1], ...(cls === 11 ? [["TIC", 1]] : [])]
            });
        }
    },
    "teatru": {
        group: "vocational", label: "Arta actorului", hint: "teatru", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({
                drop: ["Educație artistică"],
                add: [["Arta actorului", 4], ["Mișcare scenică", 2], ["Dicție și vorbire scenică", 1], ["Istoria teatrului", 1], ["Artele spectacolului", 1],
                    ["Educație muzicală", 1], ["Educație vizuală", 1]]
            });
            if (cls === 10) return withLm2(plan(X_VOC, {
                add: [["Educație muzicală", 1], ["Educație vizuală", 1], ["Arta actorului", 4], ["Mișcare scenică", 2], ["Dicție și vorbire scenică", 1], ["Istoria teatrului", 1]]
            }));
            return sup(cls, {
                add: [["Arta actorului", 5], ["Mișcare scenică", 2], ["Dicție și vorbire scenică", 1], ["Istoria teatrului", 1], ["Artele spectacolului", 1],
                    ["Educație muzicală", 1], ["Educație fizică", 2], ["TIC", 1]]
            });
        }
    },
    "sportiv": {
        group: "vocational", label: "Sportiv", hint: "instructor sportiv", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({ drop: ["Educație fizică și sport"], add: [["Pregătire sportivă teoretică", 2], ["Pregătire sportivă practică", 12]] });
            if (cls === 10) return withLm2(plan(X_VOC, {
                drop: ["Educație fizică"],
                add: [["Educație muzicală", 1], ["Educație vizuală", 1], ["Pregătire sportivă teoretică", 2], ["Pregătire sportivă practică", 10]]
            }));
            return sup(cls, { add: [["Matematică", 1], ["Biologie", 1], ["Educație muzicală", 1], ["Pregătire sportivă teoretică", 2], ["Pregătire sportivă practică", 14]] });
        }
    },
    "pedagogic": {
        group: "vocational", label: "Pedagogic", hint: "învățător-educatoare", classes: LICEU,
        subjects: ({ cls }) => {
            if (cls === 9) return ix({ set: { "Limba și literatura română": 5 }, add: [["Pedagogie", 2], ["Practică pedagogică", 3], ["Managementul emoțiilor", 1]] });
            if (cls === 10) return withLm2(plan(X_VOC, {
                set: { "Limba și literatura română": 4, [LM2[0]]: 2, "Fizică": 1, "TIC": 2 },
                add: [["Psihologie generală", 2], ["Teoria și practica instruirii și evaluării", 1], ["Educație muzicală", 1], ["Educație vizuală", 1],
                    ["Pregătire practică de specialitate", 3]]
            }));
            if (cls === 11) return withLm2([
                ["Limba și literatura română", 4], ["Metodica predării limbii române", 1], ["Limba engleză", 2], [LM2[0], 1],
                ["Matematică", 1], ["Aritmetică", 1], ["Metodica predării matematicii", 1], ["Științe ale naturii", 1], ["Metodica predării științelor", 1],
                ["Istorie", 1], XI_XII_ISTORIE(11), ["Geografie", 1], ["Metodica predării istoriei și geografiei", 1], ["Economie", 1], ["Religie", 1],
                ["Managementul clasei de elevi", 1], ["Psihologia vârstelor", 1], ["Practică pedagogică", 4],
                ["Educație muzicală și plastică", 1], ["Metodica educației muzicale și plastice", 1], ["Educație fizică", 1], ["Metodica educației fizice", 1], ["TIC", 1]
            ]);
            return withLm2([
                ["Limba și literatura română", 4], ["Limba engleză", 2], [LM2[0], 2],
                ["Matematică", 1], ["Aritmetică", 1], ["Științe", 2], ["Istorie", 1], XI_XII_ISTORIE(12), ["Geografie", 1], ["Filosofie", 1], ["Religie", 1],
                ["Psihopedagogie specială", 1], ["Psihologia educației", 1], ["Didactici inovative", 1], ["Practică pedagogică", 4],
                ["Educație muzicală și plastică", 2], ["Educație fizică", 1], ["TIC", 1]
            ]);
        }
    },
    "teologic": {
        group: "vocational", label: "Teologic", hint: "teologie ortodoxă", classes: LICEU,
        subjects: ({ cls }) => {
            // Ora de religie din trunchiul comun devine disciplină teologică.
            if (cls === 9) return ix({
                drop: ["Religie"],
                add: [["Studiul Sfintei Scripturi", 2], ["Învățătura de credință ortodoxă", 1], ["Liturgică și teologie practică", 3], ["Muzică bisericească", 3],
                    ["Spiritualitate și formare duhovnicească", 1], ["Limba latină", 1], ["Limba greacă", 1]]
            });
            if (cls === 10) return withLm2(plan(X_VOC, {
                drop: ["Religie"], set: { "Limba și literatura română": 4 },
                add: [["Studiul Sfintei Scripturi", 2], ["Liturgică", 2], ["Muzică bisericească", 2], ["Învățătura de credință ortodoxă", 1],
                    ["Limba latină", 1], ["Limba greacă", 1], ["Educație muzicală", 1], ["Educație vizuală", 1]]
            }));
            return sup(cls, {
                drop: ["Religie"],
                add: [["Studiul Sfintei Scripturi", 2], ["Învățătura de credință ortodoxă", 2], ["Liturgică", 2], ["Muzică bisericească", 3], ["Istoria bisericii", 2],
                    ["Morală și spiritualitate ortodoxă", 1], ["Pastorală", 1], ["Limba latină", 1], ["Limba greacă", 1],
                    ["Educație artistică", 1], ["Educație muzicală", 1], ["Educație fizică", 1], ["TIC", 1]]
            });
        }
    },
    "tehnic": {
        group: "tehnologic", label: "Tehnic", hint: "electronică, mecanică, construcții…", classes: LICEU,
        subjects: ({ cls }) => cls === 9 ? ix({ add: TEHNOLOGIC_IX }) : cls === 10 ? TEHNOLOGIC_X("tehnic") : tehnologicSup(cls, "tehnic")
    },
    "servicii": {
        group: "tehnologic", label: "Servicii", hint: "economic, turism, comerț…", classes: LICEU,
        subjects: ({ cls }) => cls === 9 ? ix({ add: TEHNOLOGIC_IX }) : cls === 10 ? TEHNOLOGIC_X("servicii") : tehnologicSup(cls, "servicii")
    },
    "resurse": {
        group: "tehnologic", label: "Resurse naturale și protecția mediului", hint: "agricultură, alimentație, ecologie…", classes: LICEU,
        subjects: ({ cls }) => cls === 9 ? ix({ add: TEHNOLOGIC_IX }) : cls === 10 ? TEHNOLOGIC_X("resurse") : tehnologicSup(cls, "resurse")
    },
    "gimnaziu": {
        // OMENCS 3590/2016, anexa 2 (cu modificările din 2018 și 2019), în vigoare și în 2026–2027
        group: "alte", label: "Gimnaziu", hint: "clasele V–VIII", classes: [5, 6, 7, 8],
        subjects: ({ cls }) => withLm2([
            ["Limba și literatura română", 4], ["Limba engleză", 2], [LM2[0], 2],
            ...(cls === 7 ? [["Elemente de limbă latină și de cultură romanică", 1]] : []),
            ["Matematică", 4], ...(cls >= 6 ? [["Fizică", 2]] : []), ...(cls >= 7 ? [["Chimie", 2]] : []),
            ["Biologie", cls === 6 || cls === 7 ? 2 : 1],
            ["Educație socială", 1, { hint: { 5: "gândire critică și drepturile copilului", 6: "educație interculturală", 7: "educație pentru cetățenie democratică", 8: "educație economico-financiară" }[cls] }],
            ["Istorie", cls === 5 || cls === 8 ? 2 : 1], ["Geografie", cls === 8 ? 2 : 1], ["Religie", 1],
            ["Educație plastică", 1], ["Educație muzicală", 1], ["Educație fizică și sport", 2],
            ["Educație tehnologică și aplicații practice", 1], ["Informatică și TIC", 1], ["Consiliere și dezvoltare personală", 1]
        ])
    }
};

/** Ce plan stă la baza propunerii, spus pe scurt sub alegerea clasei. */
function setupPlanNote(profile, cls) {
    if (profile === "gimnaziu") return "După planul-cadru pentru gimnaziu din 2016 (OMENCS 3590/2016), încă în vigoare.";
    const group = SETUP_PROFILES[profile]?.group;
    const special = group === "vocational" || group === "tehnologic"
        ? " Orele disciplinelor de specialitate diferă de la o școală la alta: verifică-le cu orarul tău."
        : "";
    return cls === 9
        ? `Clasa a IX-a are planul-cadru nou (OMEC 4350/2025), aplicat din 2026–2027: 19 ore comune pentru toate profilurile, plus cele ale profilului tău.${special}`
        : `Clasa a ${ROMAN[cls]}-a rămâne pe planul-cadru din 2009 (OMECI 3410/2009${group === "tehnologic" ? ", 3081/2010 și 3412/2009" : ""}), cu modificările din 2023 și 2024${cls >= 11 ? (cls === 11 ? " (ora de Istoria evreilor. Holocaustul)" : " (ora de Istoria comunismului din România)") : ""}.${special}`;
}

function setupDone() {
    try { return localStorage.getItem(SETUP_DONE_KEY) === "1"; } catch (_) { return true; }
}

function markSetupDone() {
    try { localStorage.setItem(SETUP_DONE_KEY, "1"); } catch (_) { /* fără stocare: nu insistăm */ }
}

/** Asistentul apare singur doar când caietul e complet gol și nu a fost închis înainte. */
function shouldOfferSetup() {
    if (!canEdit()) return false;
    return !setupDone() && Object.keys(state.subjects).length === 0 && Object.keys(state.calendar).length === 0;
}

function openSetup(step = 0) {
    if (!requireAccount()) return;
    const s = state.settings;
    ui.setup = {
        step: step === 0 ? "welcome" : "class",
        profile: "",
        cls: 0,
        variant: "",
        lm2: s.school.lm2 || LM2_CHOICES[0],
        county: s.school.county || "",
        rows: [],
        target: s.goals.targetGPA,
        risk: s.calc.riskThreshold,
        // Datele de module modificate de mână rămân neatinse.
        preset: matchingModulePreset(s.modules) === "custom" ? "keep" : (countyPreset(s.school.county) || matchingModulePreset(s.modules)),
        returnFocus: document.activeElement
    };
    // Programa aleasă înainte rămâne selectată (de ex. când elevul trece în clasa următoare)
    const mine = myProgramme();
    if (mine) {
        const cls = SETUP_PROFILES[mine.profile].classes ? mine.cls : 9;
        Object.assign(ui.setup, { profile: mine.profile, cls, variant: mine.variant });
        ui.setup.rows = setupRowsFor(mine.profile, cls, mine.variant, ui.setup.lm2);
    }
    wzFixRisk();
    closeQuickAdd({ restoreFocus: false });
    closeNotifPanel({ restoreFocus: false });
    closeActionModal();
    if (typeof ccCloseOverlay === "function") ccCloseOverlay();
    $("setup").hidden = false;
    document.body.classList.add("modal-open");
    renderSetup();
}

function closeSetup() {
    $("setup").hidden = true;
    // veștile bune ținute cât a fost deschisă configurarea, una după alta
    const later = showToast.later || [];
    showToast.later = [];
    later.forEach(([msg, opts], i) => setTimeout(() => showToast(msg, opts), 700 + i * 900));
    if ($("action-modal").hidden) document.body.classList.remove("modal-open");
    const back = ui.setup?.returnFocus;
    ui.setup = null;
    if (back && document.contains(back) && back !== document.body) back.focus();
}

/** Materiile din programa unui profil și a unei clase: [{ name, ore, hint, kind }] (kind: subject | lm2 | dirig | opt). */
function programmeRows(profile, cls, variantId, lm2 = LM2_CHOICES[0]) {
    const p = SETUP_PROFILES[profile];
    if (!p) return [];
    const variant = p.variants ? (p.variants.find(v => v.id === variantId) || p.variants[0]) : null;
    const rows = p.subjects({ cls, variant }).map(([name, ore, opt = {}]) => {
        if (DIRIG_ALIASES.includes(name)) return { name: DIRIG, ore, hint: `în planul-cadru: ${name}`, kind: "dirig", off: false };
        if (name === LM2[0]) return { name: lm2, ore, hint: "limba modernă 2: alege-o pe a ta", kind: "lm2", off: Boolean(opt.off) };
        return { name, ore, hint: opt.hint || "", kind: "subject", off: Boolean(opt.off) };
    });
    if (!rows.some(r => r.kind === "dirig")) rows.push({ name: DIRIG, ore: 1, hint: cls >= 9 ? "ora de dirigenție (de obicei fără note, nu intră în medie)" : "ora de dirigenție", kind: "dirig", off: false });
    rows.push({ name: OPT, ore: 1, hint: "maximum un opțional: scrie ce faci la ora la decizia școlii", kind: "opt", off: true });
    return rows;
}

function setupRowsFor(profile, cls, variantId, lm2) {
    return programmeRows(profile, cls, variantId, lm2).map(r => {
        const existing = r.kind === "opt" ? Object.keys(state.subjects).find(isOptionalName) : findSubjectName(r.name);
        // Doar ce e cu adevărat la alegere se poate debifa: religia (se poate renunța la ea) și opționalul.
        const choice = r.kind === "opt" || r.name === "Religie" || r.off;
        return { ...r, on: !r.off, choice, topic: "", exists: Boolean(existing), shown: existing || r.name };
    });
}

/** Programa salvată a elevului, sau null dacă nu și-a ales-o încă (ex. date vechi sau un backup importat). */
function myProgramme() {
    const sc = state.settings.school;
    return sc.profile && SETUP_PROFILES[sc.profile] ? sc : null;
}
function myProgrammeRows() {
    const sc = myProgramme();
    return sc ? programmeRows(sc.profile, sc.cls, sc.variant, sc.lm2) : [];
}
function programmeLabel() {
    const sc = myProgramme();
    if (!sc) return "";
    const p = SETUP_PROFILES[sc.profile];
    const variant = p.variants?.find(v => v.id === sc.variant);
    return [p.label, variant && variant.id !== p.variants[0].id ? variant.label : "", p.classes ? `clasa a ${ROMAN[sc.cls]}-a` : ""].filter(Boolean).join(" · ");
}
/** O materie e în programă? Fără programă aleasă nu judecăm (nu marcăm nimic). */
const firstOptional = () => Object.keys(state.subjects).find(isOptionalName) || null;
function inProgramme(name) {
    if (isOptionalName(name)) return !myProgramme() || firstOptional() === name; // maximum un opțional: al doilea iese din programă
    if (!myProgramme()) return true;
    const low = String(name).toLocaleLowerCase("ro");
    return myProgrammeRows().some(r => r.name.toLocaleLowerCase("ro") === low)
        || DIRIG_ALIASES.some(a => a.toLocaleLowerCase("ro") === low);
}
/** Rândul din programă al unei materii (orele oficiale), sau null. */
function programmeRowFor(name) {
    const rows = myProgrammeRows();
    if (isOptionalName(name)) return firstOptional() === name ? rows.find(r => r.kind === "opt") || null : null;
    const low = String(name).toLocaleLowerCase("ro");
    return rows.find(r => r.name.toLocaleLowerCase("ro") === low)
        || (DIRIG_ALIASES.some(a => a.toLocaleLowerCase("ro") === low) ? rows.find(r => r.kind === "dirig") : null)
        || null;
}

/** Orele nu se scriu de mână: vin din planul-cadru. Și dirigenția din liceu rămâne mereu în afara mediei. */
function syncProgrammeHours() {
    const sc = myProgramme();
    if (!sc || guest.on) return;
    // ultima zi de cursuri a clasei (a XII-a și a VIII-a termină mai devreme), dacă modulele sunt cele oficiale
    const mods = state.settings.modules;
    const preset = matchingModulePreset(mods);
    const lastDay = presetModules(preset, sc.cls)[4].end;
    if (preset !== "custom" && mods[4].end !== lastDay) mods[4] = { ...mods[4], end: lastDay };
    for (const [mat, sub] of Object.entries(state.subjects)) {
        const row = programmeRowFor(mat);
        if (!row) continue;
        if (sub.ore !== row.ore) sub.ore = row.ore;
        if (row.kind === "dirig" && sc.cls >= 9 && !sub.excludeFromGPA) sub.excludeFromGPA = true;
    }
}

/** Ce mai poate adăuga: materiile din programă care lipsesc din catalog (+ opționalul, dacă nu-l are). */
function missingProgrammeRows() {
    const hasOpt = Object.keys(state.subjects).some(isOptionalName);
    return myProgrammeRows().filter(r => r.kind === "opt" ? !hasOpt : !findSubjectName(r.name) && !(r.kind === "dirig" && DIRIG_ALIASES.some(a => findSubjectName(a))));
}

/** Numele unei materii existente, fără să conteze literele mari/mici. */
function findSubjectName(name) {
    const low = String(name).trim().toLocaleLowerCase("ro");
    return Object.keys(state.subjects).find(m => m.toLocaleLowerCase("ro") === low) || null;
}

/* ---------- asistentul: pașii ---------- */
function wzSteps(st = ui.setup) {
    return ["welcome", "class", ...(st.cls >= 9 || !st.cls ? ["profile"] : []), "subjects", "goal", "county", "done"];
}

/** Avertizarea rămâne mereu sub țintă. */
function wzRisks(target) {
    return WZ_RISKS.filter(r => r.v < target);
}
function wzFixRisk() {
    const st = ui.setup;
    const ok = wzRisks(st.target);
    if (!ok.length) { st.risk = 5; return; }
    if (!ok.some(r => r.v === st.risk)) st.risk = st.risk >= st.target ? ok[ok.length - 1].v : ok[0].v;
}

function wzCanContinue() {
    const st = ui.setup;
    if (st.step === "class") return Boolean(st.cls);
    if (st.step === "profile") return Boolean(SETUP_PROFILES[st.profile]) && st.profile !== "gimnaziu";
    return true;
}

function wzGo(step) {
    if (!wzSteps().includes(step)) return;
    const steps = wzSteps();
    if (steps.indexOf(step) < steps.indexOf(ui.setup.step)) ui.setup.goingBack = true;
    ui.setup.step = step;
    renderSetup();
}

function renderSetup() {
    const st = ui.setup;
    if (!st) return;
    const steps = wzSteps();
    const counted = steps.slice(1, -1); // fără bun venit și fără „gata”
    const n = st.step === "done" ? counted.length : counted.indexOf(st.step) + 1;
    const head = $("setup-steps");
    head.classList.toggle("is-hidden", st.step === "welcome");
    head.setAttribute("aria-hidden", String(st.step === "welcome"));
    head.innerHTML = st.step === "welcome" ? "" : `
        <button type="button" class="wz-back" data-action="setup-back" aria-label="Înapoi">${icon("chevron")}</button>
        <div class="wz-progress">
            <span class="wz-progress-text">${st.step === "done" ? "Gata" : `Pasul ${n} din ${counted.length}<span class="sr-only">: ${WZ_LABELS[st.step]}</span>`}</span>
            <span class="wz-bar" aria-hidden="true"><i style="width:${Math.round(n / counted.length * 100)}%"></i></span>
        </div>`;
    const skip = document.querySelector("#setup .setup-skip");
    if (skip) skip.hidden = st.step === "done";
    const keep = st.renderedStep === st.step ? $("setup-body").scrollTop : 0;
    $("setup-body").innerHTML = ({
        welcome: setupWelcomeHTML, class: setupClassHTML, profile: setupProfileHTML,
        subjects: setupSubjectsHTML, goal: setupGoalHTML, county: setupCountyHTML, done: setupDoneHTML
    })[st.step]();
    $("setup-foot").innerHTML = setupFootHTML();
    $("setup-body").scrollTop = keep;
    // Pas nou: de sus, cu focus pe titlu. Același pas: rămâne unde erai.
    if (st.renderedStep !== st.step) {
        const firstPaint = !st.renderedStep;
        st.renderedStep = st.step;
        $("setup-body").scrollTop = 0;
        // pas nou: conținutul intră ușor (nu și la deschidere, nici la o bifă pe același pas)
        const body = $("setup-body");
        body.classList.remove("wz-enter", "wz-enter-back");
        if (!firstPaint) { void body.offsetWidth; body.classList.add(st.goingBack ? "wz-enter-back" : "wz-enter"); }
        st.goingBack = false;
        const focus = $("setup-body").querySelector("[data-autofocus]") || $("setup-body").querySelector("h2");
        focus?.focus({ preventScroll: true });
    }
}

function setupFootHTML() {
    const { step } = ui.setup;
    if (step === "welcome") return `<button type="button" class="btn btn-primary wz-main" data-action="setup-next" data-autofocus>Începem</button>`;
    if (step === "done") return `
        <button type="button" class="btn btn-primary wz-main" data-action="setup-finish">Intră în aplicație</button>
        <button type="button" class="btn btn-text wz-alt" data-action="setup-finish" data-timetable="1">${icon("calendar-days")} Completez și orarul</button>`;
    return `<button type="button" class="btn btn-primary wz-main" data-action="setup-next" ${wzCanContinue() ? "" : "disabled"}>Continuă</button>`;
}

function setupWelcomeHTML() {
    const has = Object.keys(state.subjects).length > 0;
    return `
        <div class="wz-hero">
            <span class="wz-logo" aria-hidden="true"><img class="brand-logo" src="icons/logo.svg" alt="" aria-hidden="true"></span>
            <h2 id="setup-title" tabindex="-1">${has ? "Schimbă clasa sau profilul" : "Bun venit în urNotes"}</h2>
            <p>${has
                ? "Îți pun materiile noii clase. Notele și materiile pe care le ai rămân neatinse."
                : "Îmi spui în ce clasă ești și îți pregătesc catalogul cu materiile tale. Durează un minut."}</p>
        </div>
        <div class="wz-list">
            <label class="wz-row wz-input-row" for="setup-me-name">
                <span class="wz-row-title">Prenumele tău</span>
                <input type="text" id="setup-me-name" class="wz-input" maxlength="40" autocomplete="given-name" placeholder="ex: Ana" value="${escapeHTML(state.settings.profile.name)}">
            </label>
        </div>
        <p class="wz-hint">Apare doar pe pagina Azi și pe raport.</p>
        <button type="button" class="wz-link" data-action="setup-import">${icon("upload")} Am deja un backup (.json)</button>`;
}

function setupClassHTML() {
    const { cls } = ui.setup;
    const cell = c => `<button type="button" class="wz-cell" data-action="setup-class" data-cls="${c}" aria-pressed="${cls === c}">${ROMAN[c]}</button>`;
    return `
        <h2 id="setup-title" tabindex="-1">În ce clasă ești?</h2>
        <p class="wz-lead">Materiile și orele diferă de la o clasă la alta.</p>
        <h3 class="wz-group" id="wz-g-gim">Gimnaziu</h3>
        <div class="wz-cells" role="group" aria-labelledby="wz-g-gim">${[5, 6, 7, 8].map(cell).join("")}</div>
        <h3 class="wz-group" id="wz-g-lic">Liceu</h3>
        <div class="wz-cells" role="group" aria-labelledby="wz-g-lic">${LICEU.map(cell).join("")}</div>`;
}

function setupProfileHTML() {
    const { profile, variant } = ui.setup;
    const p = SETUP_PROFILES[profile];
    return `
        <h2 id="setup-title" tabindex="-1">Ce profil ai?</h2>
        <p class="wz-lead">Scrie pe carnet sau pe orar (ex: Matematică-informatică).</p>
        <div role="radiogroup" aria-labelledby="setup-title">
            ${SETUP_GROUPS.filter(g => g.id !== "alte").map(g => `
                <h3 class="wz-group" id="setup-g-${g.id}">${escapeHTML(g.label.replace("Liceu ", "").replace(/^./, c => c.toUpperCase()))}</h3>
                <div class="wz-list" role="group" aria-labelledby="setup-g-${g.id}">
                    ${Object.entries(SETUP_PROFILES).filter(([, x]) => x.group === g.id).map(([id, x]) => `
                        <button type="button" class="wz-row wz-pick" role="radio" aria-checked="${profile === id}" data-action="setup-profile" data-id="${id}">
                            <span class="wz-row-text"><b>${escapeHTML(x.label)}</b><small>${escapeHTML(x.hint)}</small></span>
                            <span class="wz-tick" aria-hidden="true">${icon("check")}</span>
                        </button>
                        ${profile === id && x.variants ? `
                            <div class="wz-sub">
                                <span class="wz-sub-label" id="setup-var-label">${escapeHTML(x.variantLabel || "Specializarea")}</span>
                                <div class="azi-seg wz-seg" role="group" aria-labelledby="setup-var-label">
                                    ${x.variants.map(v => `<button type="button" data-action="setup-variant" data-variant="${v.id}" aria-pressed="${variant === v.id}">${escapeHTML(v.label)}</button>`).join("")}
                                </div>
                            </div>` : ""}`).join("")}
                </div>`).join("")}
        </div>
        ${p && p.group !== "teoretic" ? `<p class="wz-hint">${icon("info")} La vocațional și tehnologic, orele de specialitate diferă de la o școală la alta. Le poți potrivi după orar.</p>` : ""}`;
}

function setupSubjectsHTML() {
    const st = ui.setup;
    const p = SETUP_PROFILES[st.profile];
    const variant = p.variants?.find(v => v.id === st.variant);
    const who = [`Clasa a ${ROMAN[st.cls]}-a`, p.group !== "alte" ? p.label : "", variant && variant.id !== p.variants[0].id ? variant.label : ""].filter(Boolean).join(", ");
    const rows = st.rows.map((r, i) => ({ ...r, i }));
    const choices = rows.filter(r => !r.exists && (r.choice || r.kind === "lm2"));
    const fixed = rows.filter(r => !choices.includes(r));
    const on = rows.filter(r => r.on && !r.exists);
    const hours = rows.filter(r => r.on).reduce((a, r) => a + r.ore, 0);
    const toggle = r => `<span class="wz-switch"><input type="checkbox" class="setup-check" data-i="${r.i}" ${r.on ? "checked" : ""} aria-label="${escapeHTML(r.kind === "opt" ? "Am un opțional" : `Fac ${r.name}`)}"><i aria-hidden="true"></i></span>`;
    const choiceRow = r => {
        if (r.kind === "lm2") return `
            <li class="wz-row setup-row" data-name="${escapeHTML(r.name)}" data-kind="lm2">
                <span class="wz-row-text"><b>A doua limbă străină</b><small>${r.ore} ${r.ore === 1 ? "oră" : "ore"} pe săptămână</small></span>
                <select class="wz-select setup-lm2" data-i="${r.i}" aria-label="A doua limbă străină">${LM2_CHOICES.map(l => `<option value="${escapeHTML(l)}" ${l === r.name ? "selected" : ""}>${escapeHTML(l.replace("Limba ", ""))}</option>`).join("")}</select>
            </li>`;
        if (r.kind === "opt") return `
            <li class="wz-row setup-row ${r.on ? "" : "is-off"}" data-name="${OPT}" data-kind="opt">
                <span class="wz-row-text"><b>Am un opțional</b><small>ora aleasă de școală</small></span>${toggle(r)}
            </li>
            ${r.on ? `<li class="wz-row wz-input-row"><input type="text" class="wz-input setup-opt-topic" data-i="${r.i}" value="${escapeHTML(r.topic)}" maxlength="40" placeholder="Cum se numește? (ex: Educație financiară)" aria-label="Numele opționalului" data-autofocus></li>` : ""}`;
        return `
            <li class="wz-row setup-row ${r.on ? "" : "is-off"}" data-name="${escapeHTML(r.name)}" data-kind="${r.kind}">
                <span class="wz-row-text"><b>${escapeHTML(r.name)}</b><small>${r.name === "Religie" ? "poți renunța la ea printr-o cerere" : escapeHTML(r.hint || "la alegere")}</small></span>${toggle(r)}
            </li>`;
    };
    return `
        <h2 id="setup-title" tabindex="-1">Materiile tale</h2>
        <p class="wz-lead">${escapeHTML(who)}. Le-am pus din planul-cadru. Mai ai de ales doar ce e mai jos.</p>
        ${choices.length ? `<ul class="wz-list">${choices.map(choiceRow).join("")}</ul>` : ""}
        <details class="wz-more">
            <summary><span>Celelalte ${fixed.length} materii</span><small>${plural(hours, "oră", "ore")} pe săpt.</small></summary>
            <ul class="wz-list wz-plain">
                ${fixed.map(r => `
                    <li class="wz-row setup-row ${r.exists ? "is-existing" : ""}" data-name="${escapeHTML(r.exists ? r.shown : r.name)}" data-kind="${r.kind}">
                        <span class="wz-row-text"><b>${escapeHTML(r.exists ? r.shown : r.name)}</b>${r.exists ? `<small>e deja în catalog</small>` : r.kind === "dirig" && st.cls >= 9 ? `<small>nu intră în medie</small>` : ""}</span>
                        <span class="wz-hours">${r.ore} ${r.ore === 1 ? "oră" : "ore"}</span>
                    </li>`).join("")}
            </ul>
        </details>
        <p class="wz-hint">Pun ${plural(on.length, "materie nouă", "materii noi")} în catalog. Purtarea e deja acolo.</p>`;
}

function setupGoalHTML() {
    const { target, risk } = ui.setup;
    const targets = [...new Set([...WZ_TARGETS, target])].sort((a, b) => a - b);
    const risks = wzRisks(target);
    return `
        <h2 id="setup-title" tabindex="-1">Ce medie vrei la sfârșitul anului?</h2>
        <p class="wz-lead">La fiecare materie îți arăt ce note îți mai trebuie ca s-o atingi.</p>
        <div class="azi-seg wz-seg wz-targets" role="group" aria-label="Media generală dorită">
            ${targets.map(v => `<button type="button" data-action="setup-target" data-v="${v}" aria-pressed="${target === v}">${v.toFixed(2)}</button>`).join("")}
        </div>
        <h3 class="wz-q" id="wz-risk-l">Când să te anunț că o materie are nevoie de tine?</h3>
        ${risks.length ? `
            <div class="wz-list" role="radiogroup" aria-labelledby="wz-risk-l">
                ${risks.map(r => `
                    <button type="button" class="wz-row wz-pick" role="radio" aria-checked="${risk === r.v}" data-action="setup-risk" data-v="${r.v}">
                        <span class="wz-row-text"><b>${r.title}</b><small>${r.sub}</small></span>
                        <span class="wz-tick" aria-hidden="true">${icon("check")}</span>
                    </button>`).join("")}
            </div>
            <p class="wz-hint">Pragul e mereu sub ținta ta (${target.toFixed(2)}).</p>`
            : `<p class="wz-hint">Te anunț când media unei materii scade sub 5.</p>`}`;
}

function setupCountyHTML() {
    const custom = matchingModulePreset(state.settings.modules) === "custom";
    return `
        <h2 id="setup-title" tabindex="-1">Din ce județ ești?</h2>
        <p class="wz-lead">Vacanța de schi e în altă săptămână în fiecare județ. Din ea aflu când încep și se termină modulele tale.</p>
        <div class="wz-list">
            <label class="wz-row" for="setup-county">
                <span class="wz-row-title">Județul</span>
                <select id="setup-county" class="wz-select">${countyOptions(ui.setup.county)}</select>
            </label>
        </div>
        <p class="wz-hint">${custom ? "Datele modulelor scrise de tine în „Eu” rămân cum sunt." : "Dacă nu știi acum, mergi mai departe: pun calendarul obișnuit și îl schimbi din „Eu”."}</p>`;
}

function setupDoneHTML() {
    const st = ui.setup;
    const p = SETUP_PROFILES[st.profile];
    const fresh = st.rows.filter(r => r.on && !r.exists && (r.kind !== "opt" || !firstOptional())).length;
    const kept = st.rows.filter(r => r.exists).length;
    const first = firstName();
    const risk = WZ_RISKS.find(r => r.v === st.risk);
    const row = (label, value, step) => `
        <li class="wz-row">
            <span class="wz-row-title">${label}</span>
            <span class="wz-row-value">${value}</span>
            ${step ? `<button type="button" class="wz-edit" data-action="setup-goto" data-step="${step}" aria-label="Schimbă: ${label}">Schimbă</button>` : ""}
        </li>`;
    return `
        <div class="wz-hero">
            <span class="wz-done" aria-hidden="true">${icon("check")}</span>
            <h2 id="setup-title" tabindex="-1">${first ? `Totul e pregătit, ${escapeHTML(first)}` : "Totul e pregătit"}</h2>
            <p>Verifică pe scurt. Orice schimbi și mai târziu, din „Eu”.</p>
        </div>
        <ul class="wz-list wz-summary">
            ${row("Clasa", `a ${ROMAN[st.cls]}-a`, "class")}
            ${p.group !== "alte" ? row("Profilul", escapeHTML(p.label), "profile") : ""}
            ${row("Materii", `${plural(fresh, "materie nouă", "materii noi")}${kept ? ` + ${kept} existente` : ""}`, "subjects")}
            ${row("Ținta", st.target.toFixed(2), "goal")}
            ${row("Te anunț", risk ? `sub ${risk.v}` : `sub ${st.risk}`, "goal")}
            ${row("Județul", st.county ? escapeHTML(st.county) : "necompletat", "county")}
        </ul>
        <p class="wz-hint">Cu orarul completat, pagina Azi îți arată orele fiecărei zile și adaugi testele dintr-o atingere.</p>`;
}

function validSetupPreset(value, fallback) {
    return value === "keep" || MODULE_PRESETS[value] ? value : fallback;
}

/** Verifică lista de materii înainte de pasul următor; întoarce un mesaj de eroare sau null. */
function setupRowsError() {
    const seen = new Set();
    for (const r of ui.setup.rows) {
        if (!r.on || r.exists) continue;
        const name = (r.kind === "opt" ? optionalName(r.topic) : r.name).trim().replace(/\s+/g, " ");
        if (!name) return "O materie bifată nu are nume.";
        if (r.kind === "opt" && (r.topic || "").trim() && (URN_RULES.looksLikeJunk(r.topic) || /\p{Extended_Pictographic}/u.test(r.topic))) return "Scrie numele opționalului (ex: Educație financiară).";
        if (name === "__proto__" || name === PURTARE_KEY || isLegacyPurtareName(name)) return "Purtarea e deja în catalog; nu o adăuga ca materie.";
        const low = name.toLocaleLowerCase("ro");
        if (seen.has(low)) return `„${name}” apare de două ori.`;
        if (findSubjectName(name)) return `Materia ${findSubjectName(name)} există deja.`;
        seen.add(low);
    }
    return null;
}

function setupNext() {
    const st = ui.setup;
    if (!wzCanContinue()) return;
    if (st.step === "subjects") {
        const err = setupRowsError();
        if (err) { showToast(`⚠️ ${err}`); return; }
    }
    const steps = wzSteps();
    wzGo(steps[Math.min(steps.length - 1, steps.indexOf(st.step) + 1)]);
}

function setupBack() {
    ui.setup.goingBack = true;
    const steps = wzSteps();
    wzGo(steps[Math.max(0, steps.indexOf(ui.setup.step) - 1)]);
}

function finishSetup(withTimetable) {
    const st = ui.setup;
    if (!st || !SETUP_PROFILES[st.profile]) return;
    const added = [];
    st.rows.forEach(r => {
        const name = (r.kind === "opt" ? optionalName(r.topic) : r.name).trim().replace(/\s+/g, " ");
        if (!r.on || r.exists || !name || findSubjectName(name)) return;
        if (r.kind === "opt" && firstOptional()) return; // maximum un opțional
        // dirigenția din liceu nu are note: nu trage media în jos
        state.subjects[name] = { ore: r.ore, target: st.target, grades: [], priority: false, excludeFromGPA: r.kind === "dirig" && st.cls >= 9 };
        added.push(name);
    });
    const s = state.settings;
    const prof = SETUP_PROFILES[st.profile];
    s.school = { profile: st.profile, cls: prof.classes ? st.cls : 0, variant: st.variant || "", lm2: st.lm2 || LM2_CHOICES[0], county: st.county || "" };
    s.goals.targetGPA = st.target;
    s.goals.minGPA = Math.min(s.goals.minGPA, st.target);
    s.calc.riskThreshold = st.risk;
    if (MODULE_PRESETS[st.preset]) s.modules = presetModules(st.preset, prof.classes ? st.cls : 0);
    // Clasa aleasă ajunge și pe antetul raportului (dacă elevul nu a scris deja alta).
    if (prof.classes && !s.report.cls) s.report.cls = `a ${ROMAN[st.cls]}-a`;
    addActivity(added.length ? `Configurare: ai adăugat ${plural(added.length, "materie", "materii")}.` : "Configurare: ținte și an școlar actualizate.");
    markSetupDone();
    closeSetup();
    ui.home.day = null;
    switchTab("tab-dashboard");
    refresh();
    if (withTimetable && Object.keys(state.subjects).length) {
        ui.tourAfterModal = true; // turul vine după ce închide orarul
        openTimetableModal();
    } else {
        showToast(`✅ Gata! Ai ${plural(Object.keys(state.subjects).length, "materie", "materii")} în catalog.`);
        setTimeout(maybeStartTour, 400);
    }
}
