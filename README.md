# urNotes — notele tale, în stilul tău

Aplicație web pentru evidența notelor școlare, personalizată pentru fiecare elev (numele tău și culoarea ta): medii, ținte, purtare, calendar cu teste și teme, orar, statistici, simulator „ce-ar fi dacă” și raport pentru printare.

Gândită ca un Notion doar pentru școală: fiecare materie e o pagină (cu media, notele și notițele tale), meniul lateral arată toate paginile, iar testele și temele le vezi ca săptămână, lună, tabel sau panou.

**Deschide aplicația:** https://tudorpan.github.io/urnotes/ (numele proiectului Firebase rămâne `zece-2f182`: Google nu permite redenumirea lui)

- Funcționează direct în browser (HTML, CSS și JavaScript, fără instalare).
- Datele se salvează în browser (localStorage) și merg și offline; din Setări poți exporta și importa un backup.
- Opțional, conturi (Google sau email + parolă) cu sincronizare între dispozitive, prin Firebase: completează `firebase-config.js` și publică regulile din `firestore.rules`. Fără configurare, aplicația rămâne doar locală.

## Serverul (repository-ul urnotes-api)

Acest repository e doar aplicația (interfața), publicată pe GitHub Pages. Serverul e în [tudorpan/urnotes-api](https://github.com/tudorpan/urnotes-api), cu istoria lui, și se publică separat. Cele două vorbesc doar prin API-ul serverului (`/v1/...`), la adresa din `api-config.js`; pentru încercări pe un singur dispozitiv, `?api=http://localhost:8080` în adresa aplicației.

Aplicația merge și fără server. Când `api-config.js` are adresa serverului urNotes, ea:
- ia datele școlare (anii, județele, examenele) de pe server, așa că un ordin nou al ministrului nu mai cere o versiune nouă;
- trimite serverului amintirea de seară a fiecărei zile, iar serverul o trimite ca notificare push, chiar cu aplicația închisă;
- lasă elevul să creeze coduri pentru un părinte sau un profesor, care îi vor vedea datele fără să le poată schimba;
- sincronizează caietul notă cu notă (nu ca o copie întreagă), deci două dispozitive nu se mai suprascriu;
- are conturi de părinte și de profesor: la prima intrare cu un cont nou alegi „elev”, „părinte” sau „profesor”; părintele și profesorul văd caietul elevului doar pentru citire, iar profesorul face clase cu cod și pune teste care apar în calendarul fiecărui elev.

Detalii, API, formele datelor și pornire: README-ul din urnotes-api.

**Regulile comune.** `shared/rules.js` (medii, rotunjire, purtare, realism) trebuie să fie identic aici și pe server. Locul lui e în urnotes-api; aici e o copie, ca aplicația să meargă și offline. După ce regulile se schimbă pe server: `node scripts/sync-rules.mjs` și commit. Testele de pe GitHub pică până atunci.

## Cum e organizat codul

Fără pas de build: fișiere statice, publicate direct pe GitHub Pages.

- `index.html`: paginile (taburile) și ordinea scripturilor.
- `style.css`: aspectul componentelor; `ui.css`: stilul colorat „urNotes” (culori, litere, meniul, plăcile post-it); `tokens.css`: culorile, literele și umbrele comune.
- `shared/rules.js`: regulile de calcul (medii, rotunjire, purtare, realism), copia celor din urnotes-api (vezi mai sus).
- `tests/`: testele aplicației (jsdom): `cd tests && npm ci && node run.js`. Le rulează și GitHub la fiecare push.
- `scripts/sync-rules.mjs`: aduce sau verifică copia regulilor.
- `js/`: aplicația, pe secțiuni. Sunt scripturi clasice care împart același spațiu global și se încarcă în ordinea din `index.html`:
  - `core/`: configurarea (`config.js`, cu anii școlari în `SCHOOL_YEAR_DATA`), utilitarele, modelul, stocarea, motorul de calcul (`metrics.js`), randarea, acțiunile (`events.js`), adresele paginilor (`router.js`) și pornirea (`state.js`, `boot.js`, `main.js`, încărcate ultimele).
  - `azi/`: pagina Azi (`azi.js`) și „Ce ai luat?” (`realism.js`).
  - `note/`: materiile și notele (`catalog.js`, `grades-subjects.js`, `quickgrade.js`, `notes.js`), Progresul (`stats.js`, `report.js`, `selects-charts.js`) și Ce-ar fi dacă (`simulator.js`).
  - `calendar/`: calendarul, fereastra „Adaugă” (`cal-compose.js`: întâi alegi ce adaugi, apoi un formular scurt pentru acel lucru), orarul și amintirile de seară.
  - `plan/`: planul de învățat (`plan.js`) și examenele (`exams.js`, cu `EXAM_CALENDAR`).
  - `eu/`: pagina Eu: setările, backupul, configurarea, turul, anii școlari, mascota (`pal.js`) și creșterea ei (`growth.js`).
  - `cont/`: contul și sincronizarea (`account.js`, `guest.js`, `api.js`, `serversync.js`) și, ca extra, părinții și profesorii (`viewer.js`).
  - `ui/`: navigarea, căutarea (Ctrl+K), meniul lateral, ferestrele de pe ecrane mari, foile de jos de pe telefon și animațiile.
- `cloud.js`: conturile și sincronizarea (Firebase); `sw.js`: lucrul fără internet și amintirile din fundal.

### Paginile

Aplicația e făcută pentru elev, în jurul zilei lui. Patru secțiuni, la fel pe telefon și pe calculator, plus **Eu**:

| Secțiune | Adresă | Ce e acolo |
| --- | --- | --- |
| **Azi** | `/azi` | „Acum” (un singur lucru important), „Ce ai luat?”, orele de azi, de făcut, planul de azi, „La note” (primele concluzii din Progres), săptămâna |
| **Note** | `/note` · `/progres` · `/ce-ar-fi-daca` | file: **Materii** (fiecare materie cu notele și notițele ei), **Progres**, **Ce-ar fi dacă** |
| **Calendar** | `/calendar` | teste, teme, orarul; vederi Săptămână, Lună, Agendă, Tabel, Panou |
| **Plan** | `/plan` · `/examene` | file: **Săptămâna** (ce înveți în fiecare zi) și **Examene** (Bac, Evaluarea Națională) |
| **Eu** | `/eu` (vechea `/setari` duce aici) | profilul și mascota, contul, setările, tema, backupul; părinții și profesorii, ca extra, în Cont |

Pe telefon, bara de jos are Azi · Note · ＋ · Calendar · Plan, iar „Eu” e avatarul din bara de sus.
O filă a unei secțiuni se înregistrează cu `hub` (calea „Note › Progres”, fără „înapoi”): `registerTab("tab-…", { …, group: "grades", hub: "tab-catalog" })`; filele se pun în `<nav class="subnav">` din `index.html`. O sub-pagină cu „înapoi” se înregistrează cu `parent`.

### Aspectul

Un singur stil (`app.css`, clasa `style-app` pe `<body>`), după aplicațiile Apple: fontul sistemului, titluri mari, liste grupate pe card alb cu colțuri rotunjite, fundal gri deschis și un singur albastru pentru butoane și linkuri.
Materiile apar doar ca un punct sau un pătrățel în culoarea lor; roșul rămâne pentru „risc”. Modul întunecat e negru cu carduri gri închis.

- Azi: carduri simple cu cifre, „Materiile tale” ca listă (punct, nume, medie, săgeată), „Acum” cu butoane rotunde pentru notă. Note: rânduri cu inițialele materiei și media în dreapta. Pagina unei materii: titlu mare, notele în cercuri. Calendar: ziua de azi în cerc roșu, evenimentele cu o bară colorată. Eu: profil cu inițialele.
- Pe telefon: bara de file de jos e translucidă, iar „Adaugă” se deschide ca o foaie iOS.
- Fără fonturi descărcate; contrastul trece verificarea WCAG AA în ambele moduri.
- `style.css` + `ui.css` sunt temelia; `tokens.css` și `styles.css` vin peste ele, iar `app.css` le dă aspectul final.

### Calendarul

Ca Google Calendar (`js/calendar/calendar-view.js`, stilurile din `gcal.css`):
- Bara de sus: „Azi”, ‹ ›, luna și modul (Zi, Săptămână, Lună, Program). Pe calculator merg și tastele D, W, M, A pentru mod și J / K (sau săgețile) înainte și înapoi.
- În stânga (pe calculator): „Creează”, calendarul mic, ce a rămas neterminat (teste fără notă, teme nebifate) și „Calendarele mele”, de unde ascunzi testele, temele, proiectele, orele, planul sau vacanțele. Pe telefon, calendarul mic se deschide din titlu.
- Zi și Săptămână: grila cu orele zilei. Orele din orar sunt blocuri deschise în culoarea materiei (de la 8:00, câte 50 de minute; `state.settings.school.start` le poate muta), evenimentele cu oră sunt blocuri pline, cele fără oră stau în rândul „toată ziua”, iar linia roșie arată ora de acum.
- Lună: grila cu bare colorate și „încă N”. Program: doar zilele cu ceva, una sub alta.
- Atingi un eveniment: se deschide fereastra cu detalii (Notă, Făcut, editează, șterge). Atingi un loc gol: adaugi ceva în ziua (și la ora) aceea. Atingi o oră din orar: adaugi un test sau o temă la materia ei. Pe calculator, tragi un eveniment pe altă zi.

### Mișcarea și gesturile

- Mișcare curată (`motion.css`): lentila de sub fila aleasă alunecă cu un mic arc, iar iconița sare ușor; în segmente (Materii / Progres / Ce-ar fi dacă, ținta din configurare) bucata aleasă alunecă, chiar și de la o pagină la alta (`glideAll()` din `js/ui/fluid.js`); la o filă nouă, cardurile urcă puțin, unul după altul; calendarul, materia următoare și secțiunile vin din partea în care mergi; foile urcă, ferestrele apar din mijloc, butoanele se lasă sub deget, comutatoarele se lungesc când le apeși. Nimic nu se animă la pornire; cu „reducere mișcare” din sistem totul se oprește.
- Între file apare un ecran scurt de 0,9 s, în felul iOS (`js/ui/tabloader.js`, stilurile `tl-*` din `motion.css`): pagina intră pe loc într-o ceață adâncă, pe marginile ecranului curge o lumină moale (albastru, violet, roz, chihlimbar), apoi ceața se risipește și pagina nouă, deja gata dedesubt, intră în focus. Nu întârzie nimic, nu oprește atingerile, nu apare la pornire și nici cu „reducere mișcare”.
- Sticlă (liquid glass, variabilele `--lg-*` din `app.css`) doar pe ce plutește: bara de file (o capsulă), lentila filei alese, butoanele rotunde din colț, toast-urile și butoanele configurării. E aproape transparentă și înviorează culorile de dedesubt, cu o margine de 1 px care prinde lumina (gradient decupat cu mască), lumină moale în interior și o umbră largă și slabă. Cardurile cu note rămân opace.
- Gesturi (`js/ui/scena.js`): pe telefon glisezi între materii și tragi foaia „Adaugă” în jos ca s-o închizi; ții apăsat (sau clic dreapta) pe o carte de pe raft ca să pui o notă; atingi fila activă ca să urci sus; fiecare pagină își ține minte locul; „Anulează” are o bară cu timpul rămas.

### Mascotele

Sunt oprite: `MASCOT_ON = false` în `js/core/config.js` ascunde colegul peste tot (Azi, Eu, configurarea, turul, notificările de nivel). Codul a rămas: `PAL_KINDS` (`js/eu/growth.js`) are patru mascote (Bufi, Cotorel, Gumi, Tiți), iar corpurile sunt în `buddyBodySVG()` (`js/azi/azi.js`). Ca să revină, pui `MASCOT_ON = true` și scoți regula care le ascunde din `app.css`.

### Configurarea de la început

Un singur drum, câte o întrebare pe ecran (`js/eu/setup.js`, stilurile `wz-*` din `app.css`): prenumele → clasa (V–XII, opt butoane mari) → profilul (doar la liceu; specializarea apare sub profil, dacă are) → materiile → ținta → județul → rezumatul.
- La materii alegi doar ce chiar e la alegere (a doua limbă străină, religia, opționalul); celelalte vin din planul-cadru și stau strânse sub „Celelalte materii”.
- Avertizarea pentru o materie e mereu sub țintă: cu ținta 8 poți alege „sub 5”, „sub 6” sau „sub 7”, nu „sub 9”. Dacă scazi ținta, pragul coboară singur.
- Județul alege săptămâna vacanței de schi și, din ea, datele modulelor (datele scrise de mână în „Eu” rămân).
- Rezumatul are „Schimbă” lângă fiecare alegere. Nimic nu se salvează până la „Intră în aplicație” (în afară de prenume).

### Cum adaugi ceva

- **O pagină nouă:** adaugi o `<section id="tab-…" class="tab-content">` în `index.html` și un fișier în secțiunea lui din `js/` care apelează `registerTab("tab-…", { render, title, icon, group, pal })`. Scriptul îl treci în `index.html` (înainte de `state.js`) și în lista `APP_JS` din `sw.js`.
- **Un an școlar nou:** adaugi anul în `SCHOOL_YEAR_DATA` (`js/core/config.js`), după ordinul ministrului. Până atunci, anul se estimează singur.
- **Calendarul examenelor:** datele Evaluării Naționale și ale Bacalaureatului stau în `EXAM_CALENDAR` (`js/plan/exams.js`), pe ani școlari. Pentru un an nou, adaugi o intrare după ordinul ministrului.
- **Colegul care crește:** culorile, accesoriile și cât XP aduce fiecare lucru sunt în `js/eu/growth.js` (`PAL_COLORS`, `PAL_ACCESSORIES`, `XP`).
- **O schimbare de format al datelor:** crești `DATA_SCHEMA` și adaugi o migrare în `MIGRATIONS` (`js/core/storage.js`). Datele vechi (din browser, backup sau cont) se aduc singure la zi.
- **Anii încheiați:** se mută în arhivă (`state.archive`, Setări → Anul școlar), așa că datele de zi cu zi rămân mici, oricâți ani ar trece.

