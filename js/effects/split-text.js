// split-text.js — wrap each char of an element in a span, gate the reveal via
// IntersectionObserver. CSS handles the actual animation (revealUp keyframe).

export function initSplitText(selector = ".display", { reducedMotion = false } = {}) {
    const targets = document.querySelectorAll(selector);
    if (targets.length === 0) return;

    targets.forEach((el) => {
        const raw = el.textContent;
        el.textContent = "";
        let visibleIdx = 0;
        for (const ch of raw) {
            if (ch === "\n") {
                el.appendChild(document.createElement("br"));
                continue;
            }
            const span = document.createElement("span");
            span.className = "ch";
            span.textContent = ch === " " ? " " : ch;
            // assign sequential index only to *visible* chars so spaces still
            // hold their place but don't burn animation slots
            if (ch !== " ") {
                span.style.setProperty("--i", String(visibleIdx));
                visibleIdx++;
            } else {
                span.style.setProperty("--i", String(visibleIdx));
            }
            el.appendChild(span);
        }
    });

    if (reducedMotion) {
        targets.forEach((el) => el.classList.add("revealed"));
        return;
    }

    const obs = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    e.target.classList.add("revealed");
                    obs.unobserve(e.target);
                }
            }
        },
        { threshold: 0.18 }
    );
    targets.forEach((el) => obs.observe(el));
}
