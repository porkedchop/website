// snake-path.js — a snake of ASCII characters that travels with the user's scroll.
//
// Behavior:
// - A fixed-position full-viewport canvas behind content.
// - A chain of ~28 segments (head + body + tail).
// - The head's x position is sin(scrollY * freq) * amplitude, centered horizontally.
//   So as the user scrolls, the head sweeps left/right across the viewport,
//   weaving as it goes. The head's y position lerps toward a relative anchor in
//   the viewport, with extra y-velocity added from scroll velocity.
// - Each body segment lerp-follows the segment ahead of it — that's what makes it
//   move like a snake rather than a rigid line.
// - Glyphs change with velocity angle: head uses ◆, body uses ─╲│╱, tail fades.

export function startSnakePath(canvas, { reducedMotion = false } = {}) {
    if (!canvas) return { stop: () => {} };
    if (window.matchMedia("(max-width: 720px)").matches) {
        canvas.style.display = "none";
        return { stop: () => {} };
    }
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return { stop: () => {} };

    const N = 28;
    const segments = new Array(N).fill(null).map(() => ({ x: 0, y: 0 }));

    let dpr = 1, w = 0, h = 0;
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // re-anchor segments to viewport center on resize
        for (let i = 0; i < N; i++) {
            segments[i].x = w / 2;
            segments[i].y = h / 2 + i * 14;
        }
    }

    let lastScrollY = window.scrollY;
    let scrollV = 0;

    // Smoothed pointer position (slight head-attraction adds life)
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let hasPointer = false;
    function onPointer(e) {
        mx = e.clientX;
        my = e.clientY;
        hasPointer = true;
    }
    window.addEventListener("pointermove", onPointer, { passive: true });

    function readAccent() {
        const cs = getComputedStyle(document.body);
        return (cs.getPropertyValue("--accent") || "#4ca1af").trim();
    }
    function readFg() {
        const cs = getComputedStyle(document.body);
        return (cs.getPropertyValue("--fg") || "#e8e8e8").trim();
    }

    function glyphForAngle(theta) {
        let a = theta % (Math.PI * 2);
        if (a < 0) a += Math.PI * 2;
        const idx = Math.floor((a / (Math.PI * 2)) * 8) % 8;
        return ["─", "╲", "│", "╱", "─", "╲", "│", "╱"][idx];
    }

    let running = true;

    function frame() {
        if (!running) return;

        // scroll velocity (smoothed)
        const sy = window.scrollY;
        scrollV = scrollV * 0.85 + (sy - lastScrollY) * 0.15;
        lastScrollY = sy;

        // ---- head target -----------------------------------------------------
        // The head x sweeps across the viewport based on scroll position.
        // amp pinched at edges so it never clips the side of the viewport.
        const amp = Math.min(w * 0.32, 360);
        const freq = 0.0035; // tune for how rapidly the snake oscillates
        const targetX = w / 2 + Math.sin(sy * freq) * amp;

        // The head y sits a little above center, modulated by scroll velocity
        // so the snake "lunges" with fast scrolling.
        const targetY = h * 0.42 + Math.min(120, scrollV * 0.8);

        // If the user has the mouse moving, blend a touch of the pointer position
        // so the snake feels alive even when no scroll is happening.
        const blendX = hasPointer ? targetX * 0.78 + mx * 0.22 : targetX;
        const blendY = hasPointer ? targetY * 0.85 + my * 0.15 : targetY;

        // smooth head toward target
        segments[0].x += (blendX - segments[0].x) * 0.18;
        segments[0].y += (blendY - segments[0].y) * 0.16;

        // body lerp-follow with diminishing strength
        for (let i = 1; i < N; i++) {
            const lerp = 0.32 - i * 0.006;
            segments[i].x += (segments[i - 1].x - segments[i].x) * lerp;
            segments[i].y += (segments[i - 1].y - segments[i].y) * lerp;
        }

        // ---- draw ------------------------------------------------------------
        ctx.clearRect(0, 0, w, h);
        ctx.font = "14px JetBrains Mono, ui-monospace, monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

        const accent = readAccent();
        const fg = readFg();

        for (let i = N - 1; i >= 0; i--) {
            const s = segments[i];
            // angle from previous segment so the glyph picks the right direction
            const prev = segments[Math.max(0, i - 1)];
            const next = segments[Math.min(N - 1, i + 1)];
            const angle = Math.atan2(prev.y - next.y, prev.x - next.x);

            const t = i / (N - 1); // 0 = head, 1 = tail
            const alpha = (1 - t) * 0.95 + 0.05;
            ctx.globalAlpha = alpha;

            // head and shoulder use accent + glow; tail fades to fg
            if (i === 0) {
                ctx.fillStyle = accent;
                ctx.shadowBlur = 14;
                ctx.shadowColor = accent;
                ctx.fillText("◆", s.x, s.y);
                ctx.shadowBlur = 0;
            } else if (i < 4) {
                ctx.fillStyle = accent;
                ctx.shadowBlur = 6;
                ctx.shadowColor = accent;
                ctx.fillText(glyphForAngle(angle), s.x, s.y);
                ctx.shadowBlur = 0;
            } else {
                // mix accent → fg-muted along the body
                ctx.fillStyle = i < 14 ? accent : fg;
                ctx.fillText(glyphForAngle(angle), s.x, s.y);
            }
        }
        ctx.globalAlpha = 1;

        requestAnimationFrame(frame);
    }

    function onResize() {
        if (window.matchMedia("(max-width: 720px)").matches) {
            canvas.style.display = "none";
            running = false;
            return;
        }
        canvas.style.display = "";
        resize();
        if (!running) {
            running = true;
            requestAnimationFrame(frame);
        }
    }
    const resizeDebounced = debounce(onResize, 150);
    window.addEventListener("resize", resizeDebounced, { passive: true });

    resize();

    if (reducedMotion) {
        // draw a single static snake snapshot centered horizontally, no animation
        for (let i = 0; i < N; i++) {
            segments[i].x = w / 2 + Math.sin(i * 0.4) * 80;
            segments[i].y = h * 0.3 + i * 14;
        }
        // draw once
        ctx.clearRect(0, 0, w, h);
        ctx.font = "14px JetBrains Mono, ui-monospace, monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const accent = readAccent();
        for (let i = 0; i < N; i++) {
            ctx.globalAlpha = 1 - (i / N) * 0.8;
            ctx.fillStyle = accent;
            ctx.fillText(i === 0 ? "◆" : "─", segments[i].x, segments[i].y);
        }
        return { stop() {
            window.removeEventListener("resize", resizeDebounced);
            window.removeEventListener("pointermove", onPointer);
        }};
    }

    requestAnimationFrame(frame);

    return {
        stop() {
            running = false;
            window.removeEventListener("resize", resizeDebounced);
            window.removeEventListener("pointermove", onPointer);
        },
    };
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
