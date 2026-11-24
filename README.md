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

### Aspectul: o cameră de studiu, seara

Forma vine din aplicațiile Apple (`app.css`, clasa `style-app` pe `<body>`): fontul sistemului, liste grupate pe carduri rotunjite, foi iOS pe telefon.
Identitatea vine peste ea, din `identity.css` și `js/ui/identity.js`:

- **Culori.** Seara (tema întunecată) e cerneala nopții (`#0B1226`) cu hârtie caldă (`#EDE8DD`); dimineața (tema luminoasă) e o hârtie rece, palidă (`#EEF0F6`) cu cerneală albastră. Accentul e lampa.
- **Lampa.** O lumină caldă în capul ecranului, care se schimbă cu ora (`data-lamp` = morning / day / evening / night pe `<body>`): roz-albastră dimineața, aproape stinsă ziua, caldă seara, un cerc mic noaptea. Culoarea ei se alege din Eu › Lampa ta (Aur, Trandafir, Lună, Jad) și dă și butoanele, linkurile, ziua de azi. Tema implicită, „După lampă”, se întunecă singură de la 18:00 până la 7:00.
- **Litere.** Titlurile, salutul („Bună seara, Tudor.”) și cifrele mari sunt cu serif (`ui-serif`: New York pe iPhone și Mac), restul cu fontul sistemului.
- **Sigiliul.** Prima literă a numelui tău într-un sigiliu de ceară în culoarea lămpii: pe butonul Eu, în profil și lângă salutul din Azi (cu câte sigilii ai). Logo-ul aplicației e o lampă de birou articulată al cărei braț desenează N-ul din urNotes; capul se apleacă și luminează masa, pe cerneala nopții. În aplicație lampa e vie (`lampLogoSVG()`): atinsă, se aprinde (tema de seară) sau se stinge (tema de zi), cu o pâlpâire și cu schimbarea temei întinzându-se pe ecran din lampă; cu mouse-ul deasupra, capul se apleacă spre masă. Aspectul e simplificat: lumina din capul ecranului doar seara și discret, carduri plate fără umbre, pictogramele materiilor fără pătrățel, auriul doar pentru ce e important (`icons/logo.svg`; iconițele PNG și cea din fila browserului sunt generate din el).
- **Intro-ul** (`#splash` din `index.html`, `js/ui/intro.js`, `identity.css`, `hideSplash()` din `js/core/boot.js`): ~4,3 s la fiecare pornire, apoi zborul spre antet. Lampa e animată ca un personaj, nu ca o imagine: un mic schelet (bază, două încheieturi, cap) mișcat cadru cu cadru pe poze-cheie legate prin curbe (pornire și oprire lină, anticipare, depășire și revenire), cu inerție în cap și respirație în opriri. Lumina e calculată din poziția becului la fiecare cadru: conul iese din gura abajurului (marginile date de pereții lui, cu penumbră), în aer se vede doar ca o ceață fină, iar pe masă face o pată mai strălucitoare spre bec; scade cu distanța, literele își aruncă umbra pe masă dinspre bec, camera primește puțină lumină difuză, iar becul se încălzește (pâlpâire cu întârzierea filamentului, de la portocaliu la alb-cald) și se răcește când lampa se întoarce. Se desenează singură, adoarme și respiră, inspiră și se întinde, se uită în jur, trece peste nume și se întoarce brusc la el, sare de bucurie, aterizează turtită și se aprinde din izbitură peste „urNotes”, dă din cap, apoi se ghemuiește și sare pe un arc în colțul din stânga sus, unde devine logoul din bară. O atingere o grăbește; fără mișcare dacă telefonul cere mai puțină mișcare.
- **Momentele bune.** Un 10, o țintă atinsă sau o realizare nouă: sigiliul se ștampilează în mijlocul ecranului (fără să oprească nimic), cu o vibrație scurtă (și pe iPhone, prin comutatorul nativ ascuns) și un clinchet discret. Ambele se pot opri din Eu › Lampa ta. Realizările sunt colecția din Eu › Sigiliile tale.
- **Atelierul sigiliului** (`js/ui/seal.js`, din Eu › Profil sau atingând sigiliul): avatarul tău e un sigiliu pe care îl faci singur: formă (Ceară, Floare, Hexagon, Scut, Stea), ceară (culoarea lămpii, Aur, Trandafir, Lună, Jad, Cerneală, Vișiniu), margine (Simplă, Punctată, Dublă, Frânghie, Lauri) și ce e gravat (1–2 litere, pictograma unei materii sau unul din 12 simboluri). Unele se deblochează pe măsură ce strângi sigilii (realizări); momentul unei realizări noi spune ce s-a deblocat. Sigiliul apare pe butonul Eu, în profil, lângă salutul din Azi, la momentele bune și în colecție.
- **Mai multe de-ale tale** (`js/ui/personal.js`, Eu): cum să te salute aplicația (poreclă) și un rând al tău sub salut (un motto sau un țel); litera titlurilor (clasică cu serif, rotunjită sau simplă); Pagina Azi: ascunzi carduri și le muți în ordinea ta.
- **Pictogramele materiilor** (`js/ui/subject-icons.js`): 32 de pictograme desenate pe grila iconițelor aplicației (24×24, linie de 1,7): carte, echer, atom, eprubetă, frunză, coloană, glob, Big Ben, turnul Eiffel, castel, evantai, turnul din Pisa, lauri, cod, laptop, minge, note muzicale, paletă, lumânare, puzzle, bufniță, minte, monede, bec, oameni, balanță, busolă, rotiță, planetă, lupă, măști. Fiecare materie își găsește singură pictograma după nume (fără diacritice); din pagina materiei o atingi și alegi alta. Apar în Note, în Azi › Materiile tale, în meniul lateral, în pagina materiei și în Orar, în culoarea materiei. O materie fără potrivire păstrează inițialele.
- Fără fonturi descărcate; contrastul trece verificarea WCAG AA în ambele teme și cu toate cele patru lămpi.
- `style.css` + `ui.css` sunt temelia; `tokens.css`, `styles.css` și `app.css` dau forma, `identity.css` culorile și lumina.

### Calendarul

Ca Google Calendar (`js/calendar/calendar-view.js`, `js/calendar/cal-quick.js`, stilurile din `gcal.css`):
- Bara de sus: „Azi”, ‹ ›, luna și modul: Zi, 3 zile, Săptămână, Lună, Program. Din meniul modului: „Afișează weekendurile” (fără ele, săptămâna și luna au doar luni–vineri) și „Orarul meu”.
- Taste (pe calculator): D / X / W / M / A pentru mod, J / K sau săgețile înainte și înapoi, T = azi, C = eveniment nou; cu detaliile unui eveniment deschise, E = editează, Delete = șterge.
- Pagina nu se derulează: calendarul umple ecranul până la bara de jos și se vede tot, iar derularea e doar în el (grila cu ore, lista). Coloana din stânga se strânge ca să încapă; pe ecrane mici pleacă întâi legătura dublă „Orarul meu”, apoi lista cu evenimentele trecute rămâne doar titlu.
- În stânga (pe calculator): „Creează”, calendarul mic, ce a rămas neterminat și „Calendarele mele”, de unde ascunzi testele, temele, proiectele, orele, planul sau vacanțele. Pe telefon, calendarul mic se deschide din titlu, iar „+”-ul plutitor din dreapta jos creează un eveniment.
- Zi, 3 zile și Săptămână: grila cu orele zilei. Orele din orar sunt blocuri deschise în culoarea materiei (de la 8:00, câte 50 de minute; `state.settings.school.start` le poate muta), evenimentele cu oră sunt blocuri pline, cele fără oră stau în rândul „toată ziua”, iar linia roșie arată ora de acum.
- Lună: grila cu bare colorate; câte încap depinde de înălțimea ecranului, restul devin „încă N”. Program: doar zilele cu ceva, una sub alta.
- Eveniment nou, ca la Google: atingi un loc gol (sau tragi cu mouse-ul peste mai multe ore, sau „Creează”) și se deschide o fereastră mică acolo (pe telefon, o foaie de jos): titlu, tip, ziua și ora (sau „toată ziua”), materia (ghicită din orar) și repetarea; „Mai multe opțiuni” deschide formularul întreg. În calendar apare pe loc un bloc „(Fără titlu)” care se schimbă cât scrii; în grila cu ore îl tragi (altă oră sau altă zi) și îl lungești de marginea de jos, din 15 în 15 minute, cu mouse-ul sau cu degetul. Pe telefon foaia e scurtă și nu deschide singură tastatura, iar grila se derulează ca blocul să stea deasupra ei; când atingi un câmp, foaia devine un formular pe tot ecranul, cu bara lui sus (× · Eveniment nou · Salvează), care urmează spațiul lăsat de tastatură (`visualViewport`), așa că vezi ce scrii și restul câmpurilor. Câmpurile au 16px, ca iOS să nu mărească pagina. „+”-ul din bara de jos rămâne foaia obișnuită de adăugat din toată aplicația.
- Atingi un eveniment: fereastra cu detalii (Notă, Făcut, editează, șterge). Pe calculator, tragi un eveniment pe altă zi; în grila cu ore, unul care nu se repetă primește și ora unde l-ai lăsat.

### Glisări și taste scurte

Ca pe iPhone (`js/ui/swipe.js`, stilurile `sw-*` din `motion.css`); sub ce tragi apare culoarea și numele acțiunii, iar peste prag telefonul vibrează scurt (unde se poate):
- un mesaj de jos: îl tragi în orice parte sau în jos și pleacă (merge și cu mouse-ul);
- o notificare din clopoțel: stânga sau dreapta o ascunde, cu „Anulează”; panoul întreg se închide trăgându-l spre dreapta;
- un eveniment trecut din Calendar: dreapta = Făcut / Fără notă, stânga = Notă;
- o materie din Note: spre stânga deschide nota rapidă la ea;
- pagina unei materii (pe telefon): din marginea stângă spre dreapta te întoarce la toate materiile, ca „înapoi” din aplicațiile de iPhone (pagina urmează degetul; dincolo de o treime sau cu o aruncare pleacă, altfel revine);
- nota rapidă: ții degetul pe o notă și aluneci peste celelalte; unde îl ridici, acolo pui nota;
- calendarul (Zi, 3 zile, Săptămână, Lună): stânga / dreapta merge la următoarea / anterioara;
- foile de jos (formularele, eveniment nou din Calendar, detaliile unui eveniment, „Adaugă”): le tragi în jos ca să se închidă (`js/ui/phone.js`).

Tasta `?` (sau „Taste scurte și gesturi” din meniul modului din Calendar) deschide foaia cu toate tastele scurte și gesturile.

### Mișcarea și gesturile

- Mișcare curată (`motion.css`): lentila de sub fila aleasă alunecă cu un mic arc, iar iconița sare ușor; în segmente (Materii / Progres / Ce-ar fi dacă, ținta din configurare) bucata aleasă alunecă, chiar și de la o pagină la alta (`glideAll()` din `js/ui/fluid.js`); la o filă nouă, cardurile urcă puțin, unul după altul; calendarul, materia următoare și secțiunile vin din partea în care mergi; foile urcă, ferestrele apar din mijloc, butoanele se lasă sub deget, comutatoarele se lungesc când le apeși. Nimic nu se animă la pornire; cu „reducere mișcare” din sistem totul se oprește.
- Ce se deschide animat se și închide animat (`leaveGhost()` / `leaveRemove()` din `js/ui/fluid.js`): foile de jos coboară (din locul unde le-ai lăsat cu degetul), panoul de notificări iese în dreapta, ferestrele din mijloc se micșorează și se sting, iar fundalul se stinge odată cu ele: „Ce adaugi?”, formularele, notificările, căutarea, orarul, meniul unei materii, nota rapidă, evenimentul nou și detaliile unui eveniment din Calendar. Toate foile de jos (inclusiv „Ce adaugi?”) urmează degetul când le tragi în jos, de oriunde.
- Ce tragi cu mouse-ul se mișcă și el (`flipMove()` din `js/ui/fluid.js`): în Calendar, evenimentul ridicat se estompează, iar o umbră cu titlul și ora arată din 15 în 15 minute unde ajunge (ca la Google); la lăsare se așază acolo, iar celelalte își fac loc alunecând. Blocul nou (Fără titlu) alunecă între sferturile de oră în loc să sară. Blocurile din notițe și orele din Orar alunecă în locurile noi, iar cel lăsat se așază din locul unde ți-a scăpat din mână; linia unde ajunge se deschide lin.
- Între file apare un ecran scurt de 0,95 s (`js/ui/tabloader.js` și stilurile `tl-*` din `motion.css`): pe un fond plin, trei picături mici se rotesc una în jurul alteia, alunecă spre mijloc și se lipesc într-una (filtru SVG), care se umflă puțin și pocnește; în clipa aceea fondul se deschide din mijloc spre margini, cu marginea moale, și apare pagina nouă, deja gata (s-a desenat dedesubt). Nu întârzie nimic, nu oprește atingerile, nu apare la pornire și nici cu „reducere mișcare”.
- Sticlă (liquid glass, variabilele `--lg-*` din `app.css`) doar pe ce plutește: bara de file (o capsulă), lentila filei alese, butoanele rotunde din colț, toast-urile și butoanele configurării. E aproape transparentă și înviorează culorile de dedesubt, cu o margine de 1 px care prinde lumina (gradient decupat cu mască), lumină moale în interior și o umbră largă și slabă. Cardurile cu note rămân opace.
- Înainte să pui o notă (nota rapidă, `js/note/quickgrade.js`): apăsând sau trecând peste o notă vezi ce s-ar întâmpla: media materiei (▲/▼ cu cât), media finală, media generală și dacă atingi ținta. Nu se schimbă nimic până nu o pui.
- Mediile se rostogolesc (`rollNumbers()` din `js/ui/nav.js`, atributul `data-roll`): după o notă, media generală, media de pe rândul materiei și cea din pagina ei numără până la valoarea nouă, cu o pulsație verde (a urcat) sau roșie (a coborât).
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

