// boot.js — quick fake terminal boot overlay. Skippable with Enter, click, or button.

const LINES = [
    { delay: 0,   text: "[ OK ] mounting /dev/identity ........ Bishop Kammeraad" },
    { delay: 60,  text: "[ OK ] loading /etc/profile ........... LLM eng, MCP, evals" },
    { delay: 60,  text: "[ OK ] seeding reaction-diffusion ..... gray-scott (f=0.054, k=0.062)" },
    { delay: 60,  text: "[ OK ] mounting typographic spine ..... display.heading[7]" },
    { delay: 60,  text: "[ OK ] starting view-timeline ......... scroll.api" },
    { delay: 60,  text: "[ OK ] registering konami listener .... ↑↑↓↓←→←→ba" },
    { delay: 80,  text: "" },
    { delay: 40,  text: "boot complete in 0.42s — entering ~/whoami" },
];

export function runBoot(root, { onDone, reducedMotion = false } = {}) {
    const log = root.querySelector("#boot-log");
    const skip = root.querySelector("#boot-skip");
    let done = false;

    function finish() {
        if (done) return;
        done = true;
        root.classList.add("boot--done");
        setTimeout(() => {
            root.style.display = "none";
            onDone && onDone();
        }, 620);
    }

    skip.addEventListener("click", finish);
    document.addEventListener("keydown", function onKey(e) {
        if (e.key === "Enter" || e.key === "Escape") {
            document.removeEventListener("keydown", onKey);
            finish();
        }
    });
    root.addEventListener("click", finish);

    if (reducedMotion) {
        log.textContent = LINES.map((l) => l.text).join("\n");
        setTimeout(finish, 250);
        return;
    }

    let acc = 0;
    LINES.forEach((line) => {
        acc += line.delay;
        setTimeout(() => {
            if (done) return;
            log.textContent += line.text + "\n";
            // soft scroll
            log.scrollTop = log.scrollHeight;
        }, acc);
    });

    // auto-finish after the last line + a beat
    setTimeout(finish, acc + 380);
}
