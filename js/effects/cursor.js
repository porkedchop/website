// cursor.js — subtle cursor trail: glyphs flicker briefly under the pointer.
// Deliberately understated — easy to disable.

const GLYPHS = "▌▍▎▏░▒▓█·*+×".split("");

export function startCursor({ disabled = false } = {}) {
    if (disabled) return { stop: () => {} };
    if (window.matchMedia("(hover: none)").matches) return { stop: () => {} };

    const container = document.createElement("div");
    container.style.cssText = `
        position: fixed; inset: 0; pointer-events: none; z-index: 25;
        font-family: var(--font-mono); font-size: 12px;
        mix-blend-mode: difference;
    `;
    document.body.appendChild(container);

    let lastSpawn = 0;
    function onMove(e) {
        const now = performance.now();
        if (now - lastSpawn < 24) return; // throttle
        lastSpawn = now;

        const el = document.createElement("span");
        el.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.style.cssText = `
            position: absolute;
            left: ${e.clientX + (Math.random() - 0.5) * 14}px;
            top:  ${e.clientY + (Math.random() - 0.5) * 14}px;
            color: var(--accent);
            opacity: 0.85;
            transform: translate(-50%, -50%);
            transition: opacity 0.6s ease, transform 0.6s ease;
        `;
        container.appendChild(el);
        requestAnimationFrame(() => {
            el.style.opacity = "0";
            el.style.transform = `translate(-50%, -50%) translateY(-12px)`;
        });
        setTimeout(() => el.remove(), 700);
    }

    window.addEventListener("pointermove", onMove, { passive: true });

    return {
        stop() {
            window.removeEventListener("pointermove", onMove);
            container.remove();
        },
    };
}
