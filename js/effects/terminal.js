// terminal.js — Konami-code unlocked overlay shell. Implements a tiny command set.

const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

const HELP = `available commands:
  help                 show this message
  ls                   list site sections
  cat <section>        print a section's text (e.g. cat experience)
  whoami               who is this guy
  links                show all my links
  theme [dark|light]   toggle or set theme
  donut                spawn a rotating ASCII donut in the footer
  art <0..1>           set atmosphere opacity (e.g. art 0.6)
  clear                clear the screen
  exit                 close the shell`;

const SECTIONS = {
    now: () => textOf("#now"),
    experience: () => textOf("#experience"),
    projects: () => textOf("#projects"),
    skills: () => textOf("#skills"),
    education: () => textOf("#education"),
    press: () => textOf("#press"),
    activities: () => textOf("#activities"),
};

function textOf(sel) {
    const el = document.querySelector(sel);
    if (!el) return "(empty)";
    return el.innerText
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function startTerminal({ donutEl } = {}) {
    const overlay = document.getElementById("terminal-overlay");
    const out = document.getElementById("terminal-output");
    const input = document.getElementById("terminal-input");
    const closeBtn = document.getElementById("terminal-close");
    if (!overlay || !out || !input) return { stop: () => {} };

    const history = [];
    let histIdx = -1;
    let donutTimer = null;

    let buf = [];
    const KEYS = KONAMI;

    function open() {
        overlay.hidden = false;
        setTimeout(() => input.focus(), 0);
    }
    function close() {
        overlay.hidden = true;
    }

    function print(s = "") {
        out.textContent += s + "\n";
        out.scrollTop = out.scrollHeight;
    }

    function run(line) {
        const [cmd, ...rest] = line.trim().split(/\s+/);
        const arg = rest.join(" ");
        if (!cmd) return;
        print(`$ ${line}`);
        switch (cmd) {
            case "help":     print(HELP); break;
            case "ls":       print(Object.keys(SECTIONS).join("  ")); break;
            case "whoami":   print("bishop kammeraad — gtm engineer @ revivn · co-founder @ student section · operator @ bishop's bricks"); break;
            case "links":    print(
                "linkedin: https://www.linkedin.com/in/bishop-kammeraad-80593b204/\n" +
                "github:   https://github.com/porkedchop\n" +
                "ss:       https://studentsection.app/\n" +
                "email:    kammeraa@umich.edu"
            ); break;
            case "cat": {
                const fn = SECTIONS[arg];
                print(fn ? fn() : `no such section: ${arg}. try \`ls\`.`);
                break;
            }
            case "theme": {
                if (arg === "dark") document.body.classList.remove("light-mode");
                else if (arg === "light") document.body.classList.add("light-mode");
                else document.body.classList.toggle("light-mode");
                print("theme: " + (document.body.classList.contains("light-mode") ? "light" : "dark"));
                break;
            }
            case "donut": {
                if (donutTimer) { clearInterval(donutTimer); donutTimer = null; if (donutEl) donutEl.textContent = ""; print("donut: off"); }
                else { donutTimer = spawnDonut(donutEl); print("donut: spinning in the footer."); }
                break;
            }
            case "art": {
                const v = Math.max(0, Math.min(1, parseFloat(arg)));
                if (Number.isNaN(v)) { print("usage: art <0..1>"); break; }
                document.documentElement.style.setProperty("--atmosphere-opacity", String(v));
                print(`atmosphere opacity = ${v}`);
                break;
            }
            case "clear":    out.textContent = ""; break;
            case "exit":     close(); break;
            case "sudo":     print("nice try."); break;
            default:         print(`command not found: ${cmd}. try \`help\`.`);
        }
    }

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const v = input.value;
            if (v.trim()) { history.unshift(v); histIdx = -1; }
            input.value = "";
            run(v);
        } else if (e.key === "ArrowUp") {
            if (history.length === 0) return;
            histIdx = Math.min(history.length - 1, histIdx + 1);
            input.value = history[histIdx] || "";
            e.preventDefault();
        } else if (e.key === "ArrowDown") {
            histIdx = Math.max(-1, histIdx - 1);
            input.value = histIdx === -1 ? "" : history[histIdx];
            e.preventDefault();
        } else if (e.key === "Escape") {
            close();
        }
    });

    closeBtn.addEventListener("click", close);

    // global konami listener
    window.addEventListener("keydown", (e) => {
        // ignore when typing in the terminal input itself
        if (document.activeElement === input) return;
        buf.push(e.key);
        if (buf.length > KEYS.length) buf.shift();
        if (buf.length === KEYS.length && buf.every((k, i) => k === KEYS[i])) {
            buf = [];
            open();
        }
        if (e.key === "`" || (e.key === "/" && e.ctrlKey)) open(); // shortcuts
    });

    return {
        open,
        close,
        stop() {
            if (donutTimer) clearInterval(donutTimer);
        },
    };
}

/* ----- The donut ----- */
// Adapted from a1k0n's classic spinning donut, rendered into a <pre>.
function spawnDonut(el) {
    if (!el) return null;
    let A = 1, B = 1;
    const W = 50, H = 22;
    return setInterval(() => {
        const b = new Array(W * H).fill(" ");
        const z = new Array(W * H).fill(0);
        for (let j = 0; j < 6.28; j += 0.07) {
            for (let i = 0; i < 6.28; i += 0.02) {
                const c = Math.sin(i), d = Math.cos(j),
                      e = Math.sin(A), f = Math.sin(j),
                      g = Math.cos(A), h = d + 2,
                      D = 1 / (c * h * e + f * g + 5),
                      l = Math.cos(i), m = Math.cos(B),
                      n = Math.sin(B),
                      t = c * h * g - f * e;
                const x = (W / 2 + 15 * D * (l * h * m - t * n)) | 0;
                const y = (H / 2 + 7 * D * (l * h * n + t * m)) | 0;
                const o = x + W * y;
                const N = (8 * ((f * e - c * d * g) * m - c * d * e - f * g - l * d * n)) | 0;
                if (y < H && y >= 0 && x >= 0 && x < W && D > z[o]) {
                    z[o] = D;
                    b[o] = ".,-~:;=!*#$@"[N > 0 ? N : 0];
                }
            }
        }
        let out = "";
        for (let k = 0; k < W * H; k++) {
            out += k % W ? b[k] : "\n";
        }
        el.textContent = out;
        A += 0.05;
        B += 0.025;
    }, 50);
}
