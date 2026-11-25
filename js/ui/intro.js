/* urNotes · Pornirea: doar logoul (lampa) pe fundalul de seară. Apare și se aprinde printr-o singură animație CSS
   scurtă (identity.css), apoi, de îndată ce aplicația e gata (hideSplash din js/core/boot.js), ecranul se stinge
   ușor. Cel puțin cât să se vadă lampa aprinzându-se; o atingere îl închide imediat.
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const INTRO_MIN_MS = 650; // cât stă logoul cel puțin (să apuce să se aprindă)
const intro = { ready: false, gone: false };

function introHide(fast = false) {
    const el = document.getElementById("splash");
    if (!el || intro.gone) return;
    intro.gone = true;
    el.style.transition = `opacity ${fast ? 0.12 : 0.28}s ease`;
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    setTimeout(() => el.remove(), fast ? 160 : 320);
}

/** Aplicația e gata: logoul pleacă după ce a apucat să se aprindă. */
function introReady() {
    if (intro.ready) return;
    intro.ready = true;
    setTimeout(introHide, Math.max(0, INTRO_MIN_MS - performance.now()));
}

(() => {
    const el = document.getElementById("splash");
    if (!el) return;
    el.addEventListener("pointerdown", () => { if (intro.ready) introHide(true); }, { once: true });
    // plasă de siguranță: dacă aplicația nu anunță că e gata (o eroare la pornire), ecranul pleacă oricum
    setTimeout(() => introHide(), 5000);
})();
