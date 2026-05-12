// main.js — orchestrator: wires boot, atmosphere, hero shader, theme, nav, cursor, terminal.

import { runBoot } from "./effects/boot.js";
import { startFlowField } from "./effects/flow-field.js";
import { startAsciiShader } from "./effects/ascii-shader.js";
import { startCursor } from "./effects/cursor.js";
import { startTerminal } from "./effects/terminal.js";
import { startScrollSerpent } from "./effects/scroll-serpent.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// year
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
runBoot(bootEl, {
    reducedMotion,
    onDone: mountAll,
});

function mountAll() {
    // hero shader
    const heroCanvas = document.getElementById("hero-shader");
    let heroHandle = null;
    if (heroCanvas) {
        heroHandle = startAsciiShader(heroCanvas);
        if (!heroHandle.ok) {
            // hide the WebGL canvas; the hero text still works
            heroCanvas.style.display = "none";
        }
    }

    // atmosphere flow-field
    const atmosphereCanvas = document.getElementById("atmosphere");
    if (atmosphereCanvas) {
        startFlowField(atmosphereCanvas, { reducedMotion });
    }

    // cursor trail (skip on touch + reduced motion)
    startCursor({ disabled: reducedMotion });

    // konami terminal
    startTerminal({ donutEl: document.getElementById("footer-donut") });

    // scroll-serpent: alternates sides at section boundaries
    const sections = Array.from(document.querySelectorAll(".section"));
    startScrollSerpent(document.getElementById("serpent"), sections, { reducedMotion });

    // section reveal via IntersectionObserver
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

    // type the "whoami" command into the hero on first paint
    typeHero();

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

function typeHero() {
    const target = document.getElementById("hero-typed");
    if (!target) return;
    const phrases = ["whoami", "cat about.txt", "ls ~/projects", "now-playing"];
    let pi = 0;
    let stage = "typing";
    let ci = phrases[pi].length;
    target.textContent = phrases[pi];

    // start cycling after a beat
    setTimeout(() => {
        if (reducedMotion) return;
        setInterval(() => {
            if (stage === "typing") {
                if (ci < phrases[pi].length) {
                    ci++;
                    target.textContent = phrases[pi].slice(0, ci);
                } else {
                    stage = "hold";
                    setTimeout(() => (stage = "erasing"), 1700);
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
    }, 1500);
}
