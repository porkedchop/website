// reaction-diffusion.js — Gray-Scott reaction-diffusion rendered as an ASCII grid.
//
// Real generative art (the kind TouchDesigner people pull up). Two-channel chemical
// system; B is the "ink." Each frame we apply:
//   dA = D_A·∇²A − A·B² + f·(1 − A)
//   dB = D_B·∇²B + A·B² − (k + f)·B
// The B field is quantized into an ASCII ramp and rendered as glyphs.
//
// Parameters (f and k) chosen to produce slow-moving "coral" patterns —
// organic, biological, intricate, clearly *designed* rather than noisy.

const RAMP = " ·∙•:*+#%@█";

export function startReactionDiffusion(canvas, { reducedMotion = false } = {}) {
    if (!canvas) return { stop: () => {} };
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return { stop: () => {} };

    // ── grid ────────────────────────────────────────────────────────────────
    const CELL_W = 9;   // px per cell horizontally
    const CELL_H = 14;  // px per cell vertically
    let cols = 0, rows = 0;
    let A, B, A2, B2;   // grids; A2/B2 are the swap buffers

    // ── parameters ──────────────────────────────────────────────────────────
    // Coral-like pattern. Other named regimes if we want to expose more variety:
    //   spots:    f=0.035  k=0.065
    //   stripes:  f=0.022  k=0.051
    //   maze:     f=0.029  k=0.057
    //   coral:    f=0.062  k=0.062
    //   chaos:    f=0.026  k=0.051
    const Da = 1.0;
    const Db = 0.5;
    const f  = 0.0545;
    const k  = 0.062;
    const dt = 1.0;

    let dpr = 1, w = 0, h = 0;

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

        cols = Math.max(20, Math.ceil(w / CELL_W));
        rows = Math.max(10, Math.ceil(h / CELL_H));
        seed();
    }

    function seed() {
        const N = cols * rows;
        A = new Float32Array(N);
        B = new Float32Array(N);
        A2 = new Float32Array(N);
        B2 = new Float32Array(N);
        // Start with A=1 everywhere, B=0 except a few seed patches.
        for (let i = 0; i < N; i++) { A[i] = 1; B[i] = 0; }
        const seeds = 6 + ((cols * rows) / 1200) | 0;
        for (let s = 0; s < seeds; s++) {
            const cx = (Math.random() * cols) | 0;
            const cy = (Math.random() * rows) | 0;
            const r  = 2 + ((Math.random() * 3) | 0);
            for (let y = -r; y <= r; y++) {
                for (let x = -r; x <= r; x++) {
                    const xi = cx + x, yi = cy + y;
                    if (xi < 0 || xi >= cols || yi < 0 || yi >= rows) continue;
                    if (x * x + y * y > r * r) continue;
                    B[yi * cols + xi] = 1;
                }
            }
        }
    }

    // 9-point laplacian with diagonal weights for smoother diffusion
    function laplacian(grid, x, y) {
        // toroidal wrap so the pattern is seamless at the edges
        const xm = (x - 1 + cols) % cols;
        const xp = (x + 1) % cols;
        const ym = (y - 1 + rows) % rows;
        const yp = (y + 1) % rows;
        const c  = grid[y * cols + x];
        const n  = grid[ym * cols + x];
        const s  = grid[yp * cols + x];
        const e  = grid[y * cols + xp];
        const we = grid[y * cols + xm];
        const ne = grid[ym * cols + xp];
        const nw = grid[ym * cols + xm];
        const se = grid[yp * cols + xp];
        const sw = grid[yp * cols + xm];
        return -c
            + (n + s + e + we) * 0.2
            + (ne + nw + se + sw) * 0.05;
    }

    function update() {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = y * cols + x;
                const a = A[i], b = B[i];
                const lapA = laplacian(A, x, y);
                const lapB = laplacian(B, x, y);
                const reaction = a * b * b;
                A2[i] = a + (Da * lapA - reaction + f * (1 - a)) * dt;
                B2[i] = b + (Db * lapB + reaction - (k + f) * b) * dt;
            }
        }
        // swap
        const tA = A; A = A2; A2 = tA;
        const tB = B; B = B2; B2 = tB;
    }

    function readVar(name, fallback) {
        const cs = getComputedStyle(document.body);
        return (cs.getPropertyValue(name) || fallback).trim();
    }

    function render() {
        const accent = readVar("--accent", "#4afa90");
        const accent2 = readVar("--accent-2", "#ffb000");
        const bg = readVar("--bg", "#0a0a0a");

        // clear (gives crisp ASCII rather than ghosting)
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        ctx.font = `${CELL_H - 2}px JetBrains Mono, ui-monospace, monospace`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const b = B[y * cols + x];
                if (b <= 0.05) continue;
                const t = Math.min(1, Math.max(0, (b - 0.05) / 0.6));
                const rampIdx = Math.min(RAMP.length - 1, Math.floor(t * (RAMP.length - 1)));
                const ch = RAMP[rampIdx];
                // hot spots tint amber, cool spots green
                ctx.fillStyle = t > 0.78 ? accent2 : accent;
                ctx.globalAlpha = 0.35 + t * 0.55;
                ctx.fillText(ch, x * CELL_W + CELL_W / 2, y * CELL_H + CELL_H / 2);
            }
        }
        ctx.globalAlpha = 1;
    }

    let running = true;
    let acc = 0;
    let last = performance.now();
    const STEPS_PER_FRAME = 3;     // tiny RK boost per visible frame
    const FRAME_MS = 50;           // ~20fps render cadence

    function loop(now) {
        if (!running) return;
        acc += now - last;
        last = now;
        if (acc >= FRAME_MS) {
            acc = 0;
            for (let s = 0; s < STEPS_PER_FRAME; s++) update();
            render();
        }
        requestAnimationFrame(loop);
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
        // converge to a near-stable frame, then render once
        for (let s = 0; s < 1200; s++) update();
        render();
        return { stop() {
            window.removeEventListener("resize", onResize);
            ro && ro.disconnect();
        }};
    }

    requestAnimationFrame(loop);

    return {
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
