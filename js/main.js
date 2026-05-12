// main.js — orchestrator. Boot, theme, reaction-diffusion hero, SplitText display headings, Konami shell.

import { runBoot } from "./effects/boot.js";
import { startReactionDiffusion } from "./effects/reaction-diffusion.js";
import { startTerminal } from "./effects/terminal.js";
import { startAsciiDecoder } from "./effects/ascii-decoder.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Don't let the browser auto-restore scroll to a previous anchor on reload.
// Without this, a stale URL hash from a prior nav-click drops the user into
// whatever section was last visited (e.g. "#press").
if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
}
if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
}
window.scrollTo(0, 0);

// year stamp
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// theme — persist in localStorage, default to dark
(function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "light") document.body.classList.add("light-mode");
    const btn = document.getElementById("theme-btn");
    function update() {
        const isLight = document.body.classList.contains("light-mode");
        btn.textContent = isLight ? "☀️" : "🌙";
    }
    update();
    btn.addEventListener("click", () => {
        document.body.classList.toggle("light-mode");
        const isLight = document.body.classList.contains("light-mode");
        localStorage.setItem("theme", isLight ? "light" : "dark");
        update();
    });
})();

// kick off boot, then mount the rest after it fades
const bootEl = document.getElementById("boot");
runBoot(bootEl, { reducedMotion, onDone: mountAll });

function mountAll() {
    // hero piece — reaction-diffusion ASCII
    const rdCanvas = document.getElementById("rd-canvas");
    if (rdCanvas) startReactionDiffusion(rdCanvas, { reducedMotion });

    // konami terminal (donut command no longer renders a default; opt-in only)
    const term = startTerminal({ donutEl: null });

    // make the inline shell-access block above /now clickable
    const shellAccess = document.getElementById("shell-access");
    if (shellAccess && term && term.open) {
        shellAccess.addEventListener("click", () => term.open());
        shellAccess.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                term.open();
            }
        });
    }

    // per-section ASCII art pieces — decode in when each section enters viewport
    startAsciiDecoder({ reducedMotion });

    // section-body reveal via IntersectionObserver
    const sections = document.querySelectorAll(".section");
    if ("IntersectionObserver" in window && !reducedMotion) {
        const obs = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add("in-view");
                        obs.unobserve(e.target);
                    }
                }
            },
            { threshold: 0.12 }
        );
        sections.forEach((s) => obs.observe(s));
    } else {
        sections.forEach((s) => s.classList.add("in-view"));
    }

    // pointer-tracked glow on project tiles
    document.querySelectorAll(".project-tile").forEach((tile) => {
        tile.addEventListener("pointermove", (e) => {
            const r = tile.getBoundingClientRect();
            const mx = ((e.clientX - r.left) / r.width) * 100;
            const my = ((e.clientY - r.top) / r.height) * 100;
            tile.style.setProperty("--mx", mx + "%");
            tile.style.setProperty("--my", my + "%");
        });
    });

    // smooth-scroll the nav with a View-Transition wrap when supported.
    // We deliberately do *not* update history with a hash — that's what caused
    // reloads to drop into stale anchors like #press.
    document.querySelectorAll(".directory-nav a").forEach((a) => {
        a.addEventListener("click", (e) => {
            const id = a.getAttribute("href").slice(1);
            const target = document.getElementById(id);
            if (!target) return;
            e.preventDefault();
            const doScroll = () => target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
            if (document.startViewTransition && !reducedMotion) {
                document.startViewTransition(doScroll);
            } else {
                doScroll();
            }
        });
    });

    // live typed prompt: cycles `whoami` → `cat about.txt` → `ls ~/projects` → `tail -f ~/now`
    typeHero();
}

function typeHero() {
    const target = document.getElementById("hero-typed");
    if (!target) return;
    const phrases = ["whoami", "cat about.txt", "ls ~/projects", "tail -f ~/now"];
    let pi = 0;
    let ci = phrases[pi].length;
    let stage = "hold";
    target.textContent = phrases[pi];
    if (reducedMotion) return;

    // initial hold before first erase
    setTimeout(() => { stage = "erasing"; }, 2200);

    setInterval(() => {
        if (stage === "typing") {
            if (ci < phrases[pi].length) {
                ci++;
                target.textContent = phrases[pi].slice(0, ci);
            } else {
                stage = "hold";
                setTimeout(() => { stage = "erasing"; }, 1800);
            }
        } else if (stage === "erasing") {
            if (ci > 0) {
                ci--;
                target.textContent = phrases[pi].slice(0, ci);
            } else {
                pi = (pi + 1) % phrases.length;
                stage = "typing";
            }
        }
    }, 80);
}
