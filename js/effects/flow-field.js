// flow-field.js — atmosphere layer: drifting ASCII glyphs following a Perlin flow field.
// Uses simplex-noise via CDN ESM import. Falls back gracefully when not available.

import { createNoise2D } from "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/+esm";

const GLYPHS = "·∘∙◦*⋆+×|/\\—_~^¯`'\".".split("");

export function startFlowField(canvas, { reducedMotion = false } = {}) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return { stop: () => {} };

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    let cols = 0, rows = 0;
    const cellW = 12;   // px per glyph cell (visual density)
    const cellH = 16;
    let field = null;   // Float32Array of angles (length cols*rows)
    let particles = [];
    const noise2D = createNoise2D();

    const PARTICLE_COUNT_TARGET = () => {
        // density scales with viewport area, capped for perf
        const target = Math.floor((w * h) / 18000);
        return Math.min(420, Math.max(80, target));
    };

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = Math.ceil(w / cellW);
        rows = Math.ceil(h / cellH);
        field = new Float32Array(cols * rows);

        // initialize / resize particles
        const target = PARTICLE_COUNT_TARGET();
        if (particles.length > target) {
            particles.length = target;
        } else {
            while (particles.length < target) {
                particles.push(spawnParticle());
            }
        }
    }

    function spawnParticle() {
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            age: Math.random() * 80,
            char: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        };
    }

    function recomputeField(t) {
        // 2D simplex noise sampled per cell; output is angle
        const scale = 0.004;
        const drift = t * 0.00008;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const n = noise2D(x * scale + drift, y * scale - drift);
                field[y * cols + x] = n * Math.PI * 2;
            }
        }
    }

    function angleAt(px, py) {
        const cx = Math.max(0, Math.min(cols - 1, (px / cellW) | 0));
        const cy = Math.max(0, Math.min(rows - 1, (py / cellH) | 0));
        return field[cy * cols + cx];
    }

    function readAccent() {
        const cs = getComputedStyle(document.body);
        return cs.getPropertyValue("--accent").trim() || "#4ca1af";
    }

    let lastFieldUpdate = 0;
    let running = true;
    let lastT = performance.now();

    function frame(t) {
        if (!running) return;
        const dt = Math.min(48, t - lastT);
        lastT = t;

        // recompute field 6x/sec rather than 60x — saves a lot of CPU
        if (t - lastFieldUpdate > 160) {
            recomputeField(t);
            lastFieldUpdate = t;
        }

        // fade trail instead of clearing — gives a smoke-like look
        ctx.fillStyle = "rgba(0,0,0,0.13)";
        ctx.fillRect(0, 0, w, h);
        // light mode: invert the trail wash
        if (document.body.classList.contains("light-mode")) {
            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.fillRect(0, 0, w, h);
        }

        ctx.font = "12px JetBrains Mono, ui-monospace, monospace";
        ctx.fillStyle = readAccent();
        ctx.globalAlpha = 1;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const a = angleAt(p.x, p.y);
            const speed = 0.55;
            p.x += Math.cos(a) * speed * (dt / 16);
            p.y += Math.sin(a) * speed * (dt / 16);
            p.age += dt / 16;

            // respawn off-screen or aged out
            if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10 || p.age > 220) {
                particles[i] = spawnParticle();
                continue;
            }

            ctx.fillText(p.char, p.x, p.y);
        }

        requestAnimationFrame(frame);
    }

    function start() {
        resize();
        recomputeField(performance.now());
        if (reducedMotion) {
            // draw a single static frame
            for (let i = 0; i < particles.length; i++) {
                ctx.fillText(particles[i].char, particles[i].x, particles[i].y);
            }
            return;
        }
        requestAnimationFrame(frame);
    }

    const onResize = debounce(resize, 150);
    window.addEventListener("resize", onResize, { passive: true });
    start();

    return {
        stop() {
            running = false;
            window.removeEventListener("resize", onResize);
        },
    };
}

function debounce(fn, ms) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}
