/* urNotes · Intro-ul: lampa (~1,5 s, apoi ~0,5 s zborul spre antet; la fiecare pornire; o atingere îl grăbește).
   Lampa răsare din masă (se întinde, se turtește, se așază), capul atârnă moale, apoi se ridică și se uită la nume
   (trece puțin peste și revine), lampa se ghemuiește o clipă și becul pâlpâie și se aprinde: lumina scoate „urNotes”
   din întuneric. Dă din cap, apoi sare pe un arc în colțul de sus și devine logoul din antet (butonul lămpii).

   De ce merge lin pe orice telefon: fiecare parte e un strat separat (camera, lumina, corpul, capul, becul) și se mișcă
   doar prin transform și opacitate, cu animații Web Animations. Pe acestea le mută placa grafică singură, fără să
   redeseneze nimic și fără JavaScript la fiecare cadru. Curbele (pornire și oprire lină, depășire și revenire) sunt pe
   fiecare poză-cheie. Zborul e un arc: o mișcare pe orizontală și una pe verticală, cu curbe diferite.
   Straturile și culorile sunt în index.html (#splash) și identity.css (#splash.intro).
   Fișierele din js/ se încarcă în ordinea din index.html și împart același spațiu global (scripturi clasice). */
"use strict";

const intro = { t0: 0, ready: false, flying: false, done: false, skipped: false, el: null, anims: [] };
const INTRO_FLY_AT = 1500; // ms de la pornire: de aici lampa poate zbura (dacă aplicația e gata)

/* curbe */
const IC = {
    out: "cubic-bezier(.16, .84, .3, 1)",     // pleacă hotărât, se așază lung
    io: "cubic-bezier(.45, 0, .25, 1)",       // de la o poză la alta
    in: "cubic-bezier(.55, 0, .85, .35)",
    pop: "cubic-bezier(.2, 1.4, .4, 1)"       // cu o mică depășire
};

function introPlay(node, frames, opts) {
    if (!node) return null;
    const a = node.animate(frames, { fill: "both", ...opts });
    intro.anims.push(a);
    return a;
}

function introStart() {
    const el = document.getElementById("splash");
    if (!el || !el.classList.contains("intro") || el.classList.contains("is-still") || !Element.prototype.animate) return;
    intro.el = el;
    intro.t0 = performance.now();
    document.body.classList.add("intro-on");
    const q = s => el.querySelector(s);
    const body = q(".in-body"), head = q(".in-head"), glow = q(".in-glow"), lit = q(".in-lit");

    // corpul: răsare din masă (întins), se turtește la oprire, se așază; apoi ghemuirea dinaintea „clicului” și o mică săltare
    introPlay(body, [
        { offset: 0, opacity: 0, transform: "scale(.9, .04)", easing: IC.out },
        { offset: 0.05, opacity: 1 },
        { offset: 0.3, transform: "scale(.95, 1.09)", easing: IC.io },
        { offset: 0.42, transform: "scale(1.04, .95)", easing: IC.io },
        { offset: 0.52, transform: "none", easing: IC.io },
        { offset: 0.66, transform: "scale(1.03, .94)", easing: IC.out },       // se ghemuiește
        { offset: 0.76, transform: "scale(.98, 1.04)", easing: IC.io },        // clic!
        { offset: 0.88, transform: "none", easing: IC.io },
        { offset: 1, opacity: 1, transform: "none" }
    ], { duration: 1400, delay: 40 });
    // capul: atârnă (se leagănă puțin cât urcă), se ridică spre nume cu depășire, tresare la aprindere, dă din cap
    introPlay(head, [
        { offset: 0, transform: "rotate(30deg)", easing: IC.io },
        { offset: 0.17, transform: "rotate(14deg)", easing: IC.io },
        { offset: 0.26, transform: "rotate(26deg)", easing: IC.io },
        { offset: 0.48, transform: "rotate(-56deg)", easing: IC.io },          // trece puțin peste
        { offset: 0.56, transform: "rotate(-39deg)", easing: IC.io },
        { offset: 0.62, transform: "rotate(-42.25deg)", easing: IC.io },
        { offset: 0.7, transform: "rotate(-47deg)", easing: IC.out },          // tresare când se aprinde
        { offset: 0.78, transform: "rotate(-42.25deg)", easing: IC.io },
        { offset: 0.86, transform: "rotate(-33deg)", easing: IC.io },          // dă din cap
        { offset: 0.93, transform: "rotate(-45deg)", easing: IC.io },
        { offset: 1, transform: "rotate(-42.25deg)" }
    ], { duration: 1500 });
    // becul pâlpâie (aproape în trepte, ca un bec adevărat), apoi lumina rămâne aprinsă
    const flicker = [
        { offset: 0, opacity: 0 }, { offset: 0.18, opacity: 0.9 }, { offset: 0.3, opacity: 0.15 },
        { offset: 0.55, opacity: 1 }, { offset: 0.7, opacity: 0.4 }, { offset: 1, opacity: 1 }
    ];
    introPlay(glow, flicker, { duration: 260, delay: 960, easing: "linear" });
    introPlay(lit, flicker, { duration: 260, delay: 975, easing: "linear" });

    el.addEventListener("pointerdown", introSkip, { once: true });
    setTimeout(() => introMaybeFly(), INTRO_FLY_AT + 10);
    // plasă de siguranță: dacă aplicația nu anunță că e gata (o eroare la pornire), lampa pleacă oricum
    setTimeout(() => { if (!intro.ready) introReady(); }, 6000);
}

/** Aplicația e gata (din hideSplash): lampa zboară când ajunge la momentul ei. */
function introReady() {
    intro.ready = true;
    const el = document.getElementById("splash");
    if (!el) return;
    if (!intro.el) { // fără mișcare (sau fără animații): masa luminată, apoi se stinge ușor
        setTimeout(() => {
            el.style.transition = "opacity .25s ease";
            el.style.opacity = "0";
            setTimeout(() => el.remove(), 300);
        }, Math.max(0, 500 - performance.now()));
        return;
    }
    introMaybeFly();
}
function introSkip() {
    if (intro.flying || !intro.el) return;
    intro.skipped = true;
    intro.anims.forEach(a => { try { a.finish(); } catch (_) {} });
    introMaybeFly();
}
function introMaybeFly() {
    if (intro.flying || !intro.ready || !intro.el) return;
    if (!intro.skipped && performance.now() - intro.t0 < INTRO_FLY_AT) return;
    intro.flying = true;
    introFly();
}

/** Lampa se ghemuiește și sare pe un arc la locul ei din antet; aplicația apare dedesubt. */
function introFly() {
    const el = intro.el, q = s => el.querySelector(s);
    const fx = q(".intro-fx"), fy = q(".intro-fy"), art = q(".intro-art");
    const fast = intro.skipped, dur = fast ? 380 : 540;
    const target = [...document.querySelectorAll(".lamp-btn .lamp-logo")].find(n => n.getBoundingClientRect().width > 0);
    const finish = () => {
        if (intro.done) return;
        intro.done = true;
        document.body.classList.remove("intro-on");
        // lampa din antet „aterizează”: se turtește și revine
        target?.animate([{ transform: "scale(1.14, .86)" }, { transform: "scale(.95, 1.06)", offset: .45 }, { transform: "scale(1.02, .98)", offset: .75 }, { transform: "none" }],
            { duration: 380, easing: "cubic-bezier(.2, .7, .3, 1)" });
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "both" }).finished.then(() => el.remove(), () => el.remove());
    };
    if (!target || !art || !fx || !fy) {
        intro.done = true;
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "both" }).finished.then(() => { el.remove(); document.body.classList.remove("intro-on"); });
        return;
    }
    // unde trebuie să ajungă: lampa (în repaus) suprapusă peste lampa din antet
    const union = nodes => nodes.filter(Boolean).map(n => n.getBoundingClientRect()).filter(r => r.width || r.height).reduce((a, r) => ({
        left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom)
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const src = union([q(".in-arm"), q(".in-base")]);
    const dst = union([target.querySelector(".ll-arm"), target.querySelector("rect.ll-arm-fill")]);
    const a = art.getBoundingClientRect();
    const s = (dst.right - dst.left) / (src.right - src.left);
    const tx = dst.left - a.left - (src.left - a.left) * s;
    const ty = dst.top - a.top - (src.top - a.top) * s;
    const opt = (o = {}) => ({ duration: dur, fill: "both", ...o });

    // lumina se stinge cât se întoarce capul; camera se stinge; fundalul dispare după ce lampa s-a micșorat
    q(".in-glow").animate([{ opacity: 1 }, { opacity: 0 }], opt({ duration: 140 }));
    q(".in-lit").animate([{ opacity: 1 }, { opacity: 0 }], opt({ duration: 140 }));
    q(".in-room").animate([{ opacity: 1 }, { opacity: 0 }], opt({ duration: 200 }));
    el.animate([{ backgroundColor: "rgba(11, 18, 38, 1)" }, { backgroundColor: "rgba(11, 18, 38, 0)" }], opt({ duration: dur * 0.55, delay: dur * 0.4, easing: "ease" }));
    // capul se uită spre colț și ajunge cum e în logo; corpul se ghemuiește la desprindere și se întinde în aer
    q(".in-head").animate([{ transform: "rotate(-42.25deg)" }, { transform: "rotate(-70deg)", offset: 0.3, easing: IC.io }, { transform: "rotate(-12deg)" }], opt({ easing: IC.io }));
    q(".in-body").animate([
        { transform: "none", easing: IC.out }, { transform: "scale(1.06, .9)", offset: 0.14, easing: IC.out },
        { transform: "scale(.96, 1.06)", offset: 0.45, easing: IC.io }, { transform: "none" }
    ], opt());
    // arcul: orizontal lin, vertical întâi în sus (din lansare), apoi în jos spre colț
    const up = Math.min(0, ty) * 0.35 - 60;
    fx.animate([{ transform: "translateX(0)" }, { transform: `translateX(${tx}px)` }], opt({ easing: "cubic-bezier(.4, 0, .25, 1)" }));
    fy.animate([{ transform: "translateY(0)", easing: "cubic-bezier(.2, .7, .4, 1)" }, { transform: `translateY(${up}px)`, offset: 0.38, easing: "cubic-bezier(.5, 0, .6, 1)" }, { transform: `translateY(${ty}px)` }], opt());
    art.animate([{ transform: "scale(1)" }, { transform: `scale(${s})` }], opt({ easing: "cubic-bezier(.3, 0, .35, 1)" }))
        .finished.then(finish, finish);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", introStart, { once: true });
else introStart();
