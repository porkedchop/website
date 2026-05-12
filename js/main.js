// main.js — orchestrator. Boot, theme, reaction-diffusion hero, SplitText display headings, Konami shell.

import { runBoot } from "./effects/boot.js";
import { startReactionDiffusion } from "./effects/reaction-diffusion.js";
import { startTerminal } from "./effects/terminal.js";
import { initSplitText } from "./effects/split-text.js";
import { startAsciiDecoder } from "./effects/ascii-decoder.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    startTerminal({ donutEl: null });

    // split + reveal display headings
    initSplitText(".display", { reducedMotion });

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

    // smooth-scroll the nav with a View-Transition wrap when supported
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
            history.replaceState(null, "", "#" + id);
        });
    });
}
