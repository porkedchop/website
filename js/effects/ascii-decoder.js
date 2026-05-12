// ascii-decoder.js — thematic ASCII art pieces, decoded character-by-character
// when the host section enters the viewport. Each char cycles through random
// glyphs for a few frames then locks to the target — a "decoder" effect.

const SCRAMBLE_POOL = "!@#$%&*+=?<>[]{}|/\\:;01ABCXYZ◆◇◊●▓▒░█│─┌┐└┘".split("");
function randGlyph() { return SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0]; }

// ─── Art bank ──────────────────────────────────────────────────────────────
// Keep each piece ~10 lines tall, ~38 chars wide. Centered alignment.

export const ART = {
    now: `         ┌───────────────────────┐
         │   MON · 09:42:07      │
         │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
         │   ──●●●─────────────  │
         │   building · shipping │
         └───────────────────────┘`,

    experience: `        ╔═════╗  ╔═════╗  ╔═════╗
        ║▓▓ ▓▓║  ║░░ ░░║  ║▓▓ ▓▓║
        ║▓▓ ░░║  ║░░ ▓▓║  ║▓▓ ▓▓║
        ║▓▓ ▓▓║  ║▓▓ ░░║  ║▓▓ ░░║
        ║▓▓ ░░║  ║░░ ░░║  ║▓▓ ▓▓║
        ╚══╤══╝  ╚══╤══╝  ╚══╤══╝
           │        │        │
           └────────┴────────┘
                    │
        ─────── ship ───────`,

    projects: `         ●─────●          ●─────●
         │     │          │     │
         │  □  │──────────│  □  │
         │     │          │     │
         ●──┬──●          ●──┬──●
            │                │
            └───────●────────┘
                    │
                 ●──┴──●
                 │  ★  │
                 ●─────●`,

    skills: `         ╭─────●─────●─────╮
        ╱ ╲   ╱ ╲   ╱ ╲   ╱ ╲
       ●   ●─●   ●─●   ●─●   ●
        ╲ ╱   ╲ ╱   ╲ ╱   ╲ ╱
         ●─────●─────●─────●
        ╱ ╲   ╱ ╲   ╱ ╲   ╱ ╲
       ●   ●─●   ●─●   ●─●   ●
        ╲ ╱   ╲ ╱   ╲ ╱   ╲ ╱
         ╰─────●─────●─────╯`,

    education: `      ┌──────────┬──────────┬──────────┐
      │ EECS 281 │ EECS 370 │ EECS 388 │
      ├──────────┼──────────┼──────────┤
      │ EECS 481 │ EECS 484 │ EECS 493 │
      ╞══════════╧══════════╧══════════╡
      │  michigan · cs + econ · 2025   │
      └────────────────────────────────┘`,

    press: `         ┌─────────────────────────┐
         │ ╔═════════════════════╗ │
         │ ║   THE DAILY EDIT.   ║ │
         │ ╚═════════════════════╝ │
         │ ▓▓▓▓▓ ▓▓▓▓▓▓ ▓▓▓ ▓▓▓▓  │
         │ ▓▓▓▓ ▓▓▓▓▓▓▓ ▓▓ ▓▓▓ ▓▓ │
         │                         │
         │  "a model for student-  │
         │   built innovation."    │
         └─────────────────────────┘`,
};

export function startAsciiDecoder({ reducedMotion = false } = {}) {
    const targets = document.querySelectorAll(".section-ascii[data-art-id]");
    if (targets.length === 0) return;

    targets.forEach((el) => {
        const id = el.dataset.artId;
        const art = ART[id];
        if (!art) {
            el.textContent = "";
            return;
        }
        el.dataset.target = art;
        if (reducedMotion) {
            renderFinal(el, art);
        } else {
            renderInitial(el, art);
        }
    });

    if (reducedMotion) return;

    const observer = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (e.isIntersecting && !e.target.dataset.decoded) {
                    e.target.dataset.decoded = "1";
                    decode(e.target);
                    observer.unobserve(e.target);
                }
            }
        },
        { threshold: 0.18 }
    );
    targets.forEach((el) => observer.observe(el));
}

// Build the DOM as <span class="ch"> per character so we can mutate individually.
function renderInitial(el, art) {
    el.textContent = "";
    for (const ch of art) {
        if (ch === "\n") {
            el.appendChild(document.createTextNode("\n"));
            continue;
        }
        const span = document.createElement("span");
        span.className = "ch ch--scrambling";
        span.dataset.target = ch;
        span.textContent = ch === " " ? " " : randGlyph();
        el.appendChild(span);
    }
}

function renderFinal(el, art) {
    el.textContent = "";
    for (const ch of art) {
        if (ch === "\n") { el.appendChild(document.createTextNode("\n")); continue; }
        const span = document.createElement("span");
        span.className = "ch";
        span.textContent = ch;
        el.appendChild(span);
    }
}

function decode(el) {
    const chars = Array.from(el.querySelectorAll(".ch"));
    // each non-space char gets a random number of scramble hops + a random "lock" time
    const start = performance.now();
    const charPlans = chars.map((c, i) => {
        const target = c.dataset.target;
        if (target === " ") {
            c.textContent = " ";
            c.classList.remove("ch--scrambling");
            return null;
        }
        return {
            el: c,
            target,
            lockAt: start + 150 + (i * 8) + Math.random() * 800,
        };
    });

    function tick(now) {
        let allLocked = true;
        for (const plan of charPlans) {
            if (!plan) continue;
            if (plan.el.classList.contains("ch--locked")) continue;
            if (now >= plan.lockAt) {
                plan.el.textContent = plan.target;
                plan.el.classList.remove("ch--scrambling");
                plan.el.classList.add("ch--locked");
            } else {
                plan.el.textContent = randGlyph();
                allLocked = false;
            }
        }
        if (!allLocked) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
