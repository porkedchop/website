// ascii-shader.js — hero canvas: rotating signed-distance-field shape converted to ASCII glyphs.
// Uses Three.js via ESM CDN. Falls back to a Canvas-2D rendering if WebGL is unavailable.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const FRAG = /* glsl */`
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // 0..1
uniform vec3  uAccent;  // bg accent
uniform vec3  uFg;
uniform vec3  uBg;
uniform float uLightMode;

// rotation helpers
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

// signed distance to a torus (donut)
float sdTorus(vec3 p, vec2 t){
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// scene SDF
float map(vec3 p){
    p.xy *= rot(uTime * 0.35);
    p.xz *= rot(uTime * 0.22 + uMouse.x * 1.2);
    return sdTorus(p, vec2(1.0, 0.36));
}

// soft normal via gradient
vec3 calcNormal(vec3 p){
    const float e = 0.0008;
    vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * map(p + k.xyy * e) +
        k.yyx * map(p + k.yyx * e) +
        k.yxy * map(p + k.yxy * e) +
        k.xxx * map(p + k.xxx * e)
    );
}

// march
float march(vec3 ro, vec3 rd, out vec3 hitPos){
    float t = 0.0;
    for(int i=0;i<72;i++){
        vec3 p = ro + rd * t;
        float d = map(p);
        if(d < 0.001 || t > 6.0) { hitPos = p; return t; }
        t += d;
    }
    hitPos = ro + rd * t;
    return -1.0;
}

// hash for grain
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

void main(){
    vec2 fragCoord = gl_FragCoord.xy;

    // sample per ASCII cell (cellSize px), so the image quantizes
    float cellSize = 9.0;
    vec2 cell = floor(fragCoord / cellSize);
    vec2 cellCenter = (cell + 0.5) * cellSize;

    // normalized device coords with aspect correction, sampled at cell center
    vec2 uv = (cellCenter - 0.5 * uRes) / min(uRes.x, uRes.y);

    // ray
    vec3 ro = vec3(0.0, 0.0, 2.8);
    vec3 rd = normalize(vec3(uv, -1.2));

    vec3 hitPos;
    float t = march(ro, rd, hitPos);

    float lum = 0.0;
    if (t > 0.0) {
        vec3 n = calcNormal(hitPos);
        vec3 lightDir = normalize(vec3(0.6, 0.7, 0.4));
        float diff = clamp(dot(n, lightDir), 0.0, 1.0);
        float spec = pow(clamp(dot(reflect(-lightDir, n), -rd), 0.0, 1.0), 16.0);
        lum = 0.18 + diff * 0.85 + spec * 0.5;
    }

    // light grain so empty areas still have visual life
    lum += (hash(cell + floor(uTime*8.0)) - 0.5) * 0.12;
    lum = clamp(lum, 0.0, 1.0);

    // ASCII ramp from densest (1.0) to lightest (0.0)
    // we draw a single character per cell — we choose which by carving the cell-local UV
    vec2 inCell = (fragCoord - cell * cellSize) / cellSize; // 0..1 within the cell

    // choose a character "level" 0..10 by luminance
    int level = int(floor(lum * 11.0));
    level = clamp(level, 0, 10);

    // procedurally draw each ramp glyph in cell-local space
    // glyphs: 0=' ', 1='.', 2=':', 3='-', 4='=', 5='+', 6='*', 7='#', 8='%', 9='@', 10='█'
    float mask = 0.0;
    vec2 p = inCell - 0.5;

    if (level == 0) {
        mask = 0.0;
    } else if (level == 1) {
        // tiny dot center-low
        mask = smoothstep(0.13, 0.05, length(p + vec2(0.0, 0.20)));
    } else if (level == 2) {
        // two stacked dots
        float a = smoothstep(0.12, 0.04, length(p + vec2(0.0,  0.15)));
        float b = smoothstep(0.12, 0.04, length(p + vec2(0.0, -0.15)));
        mask = max(a,b);
    } else if (level == 3) {
        // horizontal dash
        mask = step(abs(p.y), 0.06) * step(abs(p.x), 0.32);
    } else if (level == 4) {
        // double dash =
        mask = (step(abs(p.y - 0.12), 0.05) + step(abs(p.y + 0.12), 0.05)) * step(abs(p.x), 0.32);
    } else if (level == 5) {
        // plus +
        mask = step(abs(p.y), 0.06) * step(abs(p.x), 0.30) +
               step(abs(p.x), 0.06) * step(abs(p.y), 0.30);
    } else if (level == 6) {
        // asterisk * (crossing lines)
        float a = step(abs(p.x), 0.05) * step(abs(p.y), 0.30);
        vec2 r1 = rot(0.785) * p;
        vec2 r2 = rot(-0.785) * p;
        a += step(abs(r1.x), 0.05) * step(abs(r1.y), 0.30);
        a += step(abs(r2.x), 0.05) * step(abs(r2.y), 0.30);
        mask = clamp(a, 0.0, 1.0);
    } else if (level == 7) {
        // hash # (two horizontals, two verticals)
        float h = (step(abs(p.y - 0.10), 0.04) + step(abs(p.y + 0.10), 0.04)) * step(abs(p.x), 0.36);
        float v = (step(abs(p.x - 0.10), 0.04) + step(abs(p.x + 0.10), 0.04)) * step(abs(p.y), 0.36);
        mask = clamp(h + v, 0.0, 1.0);
    } else if (level == 8) {
        // percent-ish: two dots and a slash
        float a = smoothstep(0.10, 0.04, length(p - vec2(-0.18,  0.18)));
        float b = smoothstep(0.10, 0.04, length(p - vec2( 0.18, -0.18)));
        float s = step(abs(p.x + p.y), 0.05) * step(abs(p.x - p.y), 0.38);
        mask = clamp(a + b + s, 0.0, 1.0);
    } else if (level == 9) {
        // at @-ish: outer ring + inner dot
        float r = length(p);
        float outer = step(0.30, r) * step(r, 0.40);
        float dot1 = smoothstep(0.06, 0.0, r);
        mask = clamp(outer + dot1, 0.0, 1.0);
    } else {
        // full block
        mask = 1.0;
    }

    // color: mix bg toward accent based on glyph mask and lum
    vec3 fg = mix(uAccent, uFg, smoothstep(0.4, 1.0, lum));
    vec3 col = mix(uBg, fg, mask);

    // gentle vignette
    vec2 vuv = (fragCoord / uRes) - 0.5;
    float vig = smoothstep(0.85, 0.25, length(vuv));
    col *= mix(0.75, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */`
void main(){ gl_Position = vec4(position, 1.0); }
`;

function parseColor(s, fallback = [0.5, 0.5, 0.5]) {
    s = s.trim();
    if (s.startsWith("#")) {
        const hex = s.slice(1);
        const f = hex.length === 3
            ? hex.split("").map((c) => parseInt(c + c, 16))
            : [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
        if (f.some(Number.isNaN)) return fallback;
        return f.map((v) => v / 255);
    }
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
        const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
        return parts.slice(0, 3).map((v) => v / 255);
    }
    return fallback;
}

export function startAsciiShader(canvas) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: false,
            powerPreference: "low-power",
        });
    } catch (e) {
        console.warn("[ascii-shader] WebGL unavailable", e);
        return { stop: () => {}, ok: false };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    const uniforms = {
        uRes:       { value: new THREE.Vector2(1, 1) },
        uTime:      { value: 0 },
        uMouse:     { value: new THREE.Vector2(0.5, 0.5) },
        uAccent:    { value: new THREE.Vector3(0.3, 0.63, 0.69) },
        uFg:        { value: new THREE.Vector3(0.91, 0.91, 0.91) },
        uBg:        { value: new THREE.Vector3(0.04, 0.04, 0.04) },
        uLightMode: { value: 0.0 },
    };

    const geom = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms,
        depthTest: false,
        depthWrite: false,
    });
    scene.add(new THREE.Mesh(geom, mat));

    function readThemeColors() {
        const cs = getComputedStyle(document.body);
        const accent = parseColor(cs.getPropertyValue("--accent") || "#4ca1af", [0.3, 0.63, 0.69]);
        const fg = parseColor(cs.getPropertyValue("--fg") || "#e8e8e8", [0.91, 0.91, 0.91]);
        const bg = parseColor(cs.getPropertyValue("--bg") || "#0a0a0a", [0.04, 0.04, 0.04]);
        uniforms.uAccent.value.set(...accent);
        uniforms.uFg.value.set(...fg);
        uniforms.uBg.value.set(...bg);
        uniforms.uLightMode.value = document.body.classList.contains("light-mode") ? 1.0 : 0.0;
    }
    readThemeColors();
    // observe theme class flips
    const themeObserver = new MutationObserver(readThemeColors);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    function resize() {
        const w = canvas.clientWidth || canvas.parentElement.clientWidth;
        const h = canvas.clientHeight || canvas.parentElement.clientHeight;
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    }

    const onResize = debounce(resize, 120);
    window.addEventListener("resize", onResize, { passive: true });
    // ResizeObserver catches the hero's flex-driven size changes too
    let ro;
    try {
        ro = new ResizeObserver(resize);
        ro.observe(canvas.parentElement || canvas);
    } catch (_) {}

    // pointer drives uMouse
    canvas.parentElement.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        uniforms.uMouse.value.set(
            (e.clientX - r.left) / r.width,
            1 - (e.clientY - r.top) / r.height
        );
    });

    let running = true;
    const start = performance.now();

    function frame() {
        if (!running) return;
        uniforms.uTime.value = (performance.now() - start) * 0.001;
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
    }

    resize();
    requestAnimationFrame(frame);

    return {
        ok: true,
        stop() {
            running = false;
            window.removeEventListener("resize", onResize);
            ro && ro.disconnect();
            themeObserver.disconnect();
            renderer.dispose();
        },
    };
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
