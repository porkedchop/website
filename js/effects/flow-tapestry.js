// flow-tapestry.js — hero piece: a generative flow-field tapestry rendered in ASCII glyphs.
//
// What it does:
// - Hundreds of particles drift through a multi-octave 2D simplex-noise field.
// - Each particle leaves a trail of ASCII glyphs whose shape matches its velocity angle.
// - The canvas slowly fades to black (or white in light mode) so trails persist briefly
//   then dissolve, like long-exposure light painting.
// - Field is large and the canvas is sampled per-cell so the result reads as one
//   intricate woven composition, not a single rotating object.

import { createNoise2D } from "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/+esm";

// Glyph chosen by angle: 0 = horizontal, π/4 = diag up-right, π/2 = vertical, etc.
// Eight directional bins so the trails read as flowing strokes.
const ANGLE_GLYPHS = ["─", "╲", "│", "╱", "─", "╲", "│", "╱"];

export function startFlowTapestry(canvas, { reducedMotion = false } = {}) {
    if (!canvas) return { stop: () => {} };
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return { stop: () => {} };

    const noise = createNoise2D();
    let dpr = 1;
    let w = 0, h = 0;
    let particles = [];

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const rect = canvas.getBoundingClientRect();
        w = Math.max(1, Math.floor(rect.width));
        h = Math.max(1, Math.floor(rect.height));
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seed();
        // clear once on resize
        ctx.fillStyle = readBg();
        ctx.fillRect(0, 0, w, h);
    }

    function seed() {
        const count = Math.min(900, Math.max(220, Math.floor((w * h) / 1700)));
        particles = new Array(count).fill(null).map(spawn);
    }

    function spawn(_, i = 0) {
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            life: 60 + (Math.random() * 320) | 0,
            speed: 0.5 + Math.random() * 0.7,
        };
    }

    function readAccent() {
        const cs = getComputedStyle(document.body);
        return (cs.getPropertyValue("--accent") || "#4ca1af").trim();
    }
    function readBg() {
        const cs = getComputedStyle(document.body);
        return (cs.getPropertyValue("--bg") || "#0a0a0a").trim();
    }
    function readFg() {
        const cs = getComputedStyle(document.body);
        return (cs.getPropertyValue("--fg") || "#e8e8e8").trim();
    }

    function angleAt(x, y, t) {
        // domain-warped multi-octave: ask the field to bend itself
        const s1 = 0.0024;
        const warpX = noise(x * 0.0018 + 11, y * 0.0018 + 31, t * 0.07) * 90;
        const warpY = noise(x * 0.0018 - 19, y * 0.0018 + 7,  t * 0.07) * 90;
        const a = noise((x + warpX) * s1, (y + warpY) * s1, t * 0.06);
        // [-1,1] → angle range that biases horizontal so trails read as flowing weave
        return a * Math.PI * 1.4;
    }

    function glyphForAngle(theta) {
        // normalize to [0, 2π)
        let a = theta % (Math.PI * 2);
        if (a < 0) a += Math.PI * 2;
        const idx = Math.floor((a / (Math.PI * 2)) * ANGLE_GLYPHS.length) % ANGLE_GLYPHS.length;
        return ANGLE_GLYPHS[idx];
    }

    let lastT = performance.now();
    let elapsed = 0;
    let running = true;

    function step() {
        if (!running) return;
        const now = performance.now();
        const dt = Math.min(48, now - lastT);
        lastT = now;
        elapsed += dt * 0.001;

        // soft fade — leaves long, painterly trails
        const isLight = document.body.classList.contains("light-mode");
        ctx.fillStyle = isLight ? "rgba(247,247,245,0.06)" : "rgba(10,10,10,0.08)";
        ctx.fillRect(0, 0, w, h);

        const accent = readAccent();
        const fg = readFg();
        ctx.font = "12px JetBrains Mono, ui-monospace, monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const a = angleAt(p.x, p.y, elapsed);
            p.x += Math.cos(a) * p.speed * (dt / 16);
            p.y += Math.sin(a) * p.speed * (dt / 16);
            p.life -= 1;

            if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10 || p.life <= 0) {
                particles[i] = spawn();
                continue;
            }

            // varying tint: most strokes accent, some fg highlights
            const useFg = (i % 13 === 0);
            ctx.fillStyle = useFg ? fg : accent;
            ctx.globalAlpha = useFg ? 0.85 : 0.55;
            ctx.fillText(glyphForAngle(a), p.x, p.y);
        }

        requestAnimationFrame(step);
    }

    const onResize = debounce(resize, 150);
    window.addEventListener("resize", onResize, { passive: true });
    let ro = null;
    try {
        ro = new ResizeObserver(() => resize());
        ro.observe(canvas.parentElement || canvas);
    } catch (_) {}

    resize();

    if (reducedMotion) {
        // single static composition, no animation
        const now = performance.now();
        elapsed = 0;
        ctx.font = "12px JetBrains Mono, ui-monospace, monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = readBg();
        ctx.fillRect(0, 0, w, h);
        const accent = readAccent();
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.6;
        // render a single snapshot of trails by stepping particles N times
        for (let frame = 0; frame < 220; frame++) {
            for (const p of particles) {
                const a = angleAt(p.x, p.y, frame * 0.05);
                p.x += Math.cos(a) * p.speed;
                p.y += Math.sin(a) * p.speed;
                if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
                    p.x = Math.random() * w; p.y = Math.random() * h;
                    continue;
                }
                ctx.fillText(glyphForAngle(a), p.x, p.y);
            }
        }
        return { ok: true, stop() { window.removeEventListener("resize", onResize); ro && ro.disconnect(); } };
    }

    requestAnimationFrame(step);

    return {
        ok: true,
        stop() {
            running = false;
            window.removeEventListener("resize", onResize);
            ro && ro.disconnect();
        },
    };
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
