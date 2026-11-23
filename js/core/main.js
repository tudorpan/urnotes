/* urNotes · Start (ultimul fișier încărcat).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

/* ==================== START ==================== */
// La final, ca toate constantele de mai sus să fie deja definite.
// Dacă pornirea se împiedică undeva, intro-ul tot se încheie: altfel lampa ar rămâne peste aplicație.
function start() {
    try { init(); } catch (err) {
        console.error("urNotes: pornirea s-a oprit", err);
        try { hideSplash(); } catch (_) { document.getElementById("splash")?.remove(); }
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
    start();
}
