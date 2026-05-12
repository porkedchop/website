// scroll-serpent.js — side-edge matrix cascade that alternates between sections.
//
// Behavior:
// - A fixed-position <pre> strip on the side of the viewport.
// - Content: a slow Matrix-style cascade of 0/1 digits with occasional katakana
//   accents. Refreshes at ~6fps so it reads as ambient, not frantic.
// - IntersectionObserver watches each <section>. Whenever a new section becomes
//   the most-visible one, the strip toggles data-side="left|right" — even/odd
//   index of the section in document order picks the side, so consecutive
//   sections always swap.
// - Hidden under 900px viewport; pauses on prefers-reduced-motion.

const BINARY = "01";
const ACCENT = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ"; // half-width katakana

function pickGlyph() {
    // 88% binary, 12% katakana
    if (Math.random() < 0.88) return BINARY[(Math.random() * BINARY.length) | 0];
    return ACCENT[(Math.random() * ACCENT.length) | 0];
}

export function startScrollSerpent(el, sections, { reducedMotion = false } = {}) {
    if (!el) return { stop: () => {} };
    if (window.matchMedia("(max-width: 900px)").matches) {
        el.style.display = "none";
        return { stop: () => {} };
    }

    let cols = 4;
    let rows = 50;
    let buf = []; // 2D: rows of strings
    function resizeBuffer() {
        const lineH = 14; // px, matches font-size:12 + line-height:1.25
        rows = Math.max(20, Math.ceil(window.innerHeight / lineH));
        // re-seed buffer
        buf = new Array(rows).fill(null).map(() =>
            new Array(cols).fill(null).map(pickGlyph).join("")
        );
        render();
    }

    function step() {
        // shift down by one row and inject a new top row
        buf.pop();
        buf.unshift(
            new Array(cols).fill(null).map(() => {
                // occasional gap to thin density
                if (Math.random() < 0.18) return " ";
                return pickGlyph();
            }).join("")
        );
        // occasional "head" glyph mutation a few rows down to feel alive
        const hi = (Math.random() * Math.min(rows, 8)) | 0;
        const ci = (Math.random() * cols) | 0;
        const line = buf[hi];
        buf[hi] = line.slice(0, ci) + pickGlyph() + line.slice(ci + 1);
        render();
    }

    function render() {
        el.textContent = buf.join("\n");
    }

    // side-switching via IntersectionObserver — most-visible section wins
    const visibility = new Map(); // section -> intersectionRatio
    let currentIdx = -1;
    function updateSide(forceIdx = null) {
        let bestIdx = forceIdx;
        if (bestIdx === null) {
            let bestRatio = -1;
            sections.forEach((s, i) => {
                const r = visibility.get(s) ?? 0;
                if (r > bestRatio) {
                    bestRatio = r;
                    bestIdx = i;
                }
            });
        }
        if (bestIdx === currentIdx || bestIdx < 0) return;
        currentIdx = bestIdx;
        el.setAttribute("data-side", bestIdx % 2 === 0 ? "left" : "right");
    }

    const observer = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                visibility.set(e.target, e.intersectionRatio);
            }
            updateSide();
        },
        {
            // many thresholds so we get continuous updates as sections enter/exit
            threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1],
            rootMargin: "-20% 0px -20% 0px",
        }
    );
    sections.forEach((s) => observer.observe(s));

    // initial side
    updateSide(0);

    // resize
    const onResize = debounce(() => {
        if (window.matchMedia("(max-width: 900px)").matches) {
            el.style.display = "none";
            return;
        }
        el.style.display = "";
        resizeBuffer();
    }, 150);
    window.addEventListener("resize", onResize, { passive: true });

    // start
    resizeBuffer();

    let running = !reducedMotion;
    let timer = null;
    if (running) timer = setInterval(step, 165); // ~6fps

    return {
        stop() {
            running = false;
            if (timer) clearInterval(timer);
            observer.disconnect();
            window.removeEventListener("resize", onResize);
        },
    };
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
