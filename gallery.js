/*
  DAYTON / GALLERY: a grid-step, first-person night museum.
  Art and text live in gallery-data.js; this file builds the hall from that list.
*/
import * as THREE from "three";

/* ───────────────────────── config ───────────────────────── */
const DATA = window.GALLERY ?? {};
const PIECES = (Array.isArray(DATA.pieces) ? DATA.pieces : []).filter(p => p && typeof p === "object");
const ARTIST = String(DATA.artist || "Dayton Conwell").trim();

const S = 3;          // size of one grid cell (metres)
const H = 3.2;        // wall height
const EYE = 1.55;     // camera height
const BACK = 0.85;    // camera sits behind the cell centre so the wall ahead is framed
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DUR = { step: REDUCED ? 70 : 270, turn: REDUCED ? 70 : 240, bump: REDUCED ? 60 : 190 };
const BG = 0x030914;
const DIRS = [
  { n: "N", word: "north", x: 0, y: 1 },
  { n: "E", word: "east", x: 1, y: 0 },
  { n: "S", word: "south", x: 0, y: -1 },
  { n: "W", word: "west", x: -1, y: 0 },
];
const DISPLAY = '"Space Grotesk", system-ui, sans-serif';
const MONO = '"DM Mono", ui-monospace, monospace';

const $ = (s, r = document) => r.querySelector(s);
const pad2 = n => String(n).padStart(2, "0");
const cellKey = (x, y) => `${x},${y}`;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode etc. */ } },
};
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────────────────── 1. the hall ─────────────────────────
   One winding corridor: a short lobby north to the title wall, then one
   corridor per piece. Corridors alternate east / north / west / north, so the
   path snakes upward without ever touching itself, and every corridor ends
   facing a piece. */
function buildHall(count) {
  const cells = new Map();
  const features = new Map();
  const plan = [{ dir: 0, len: 3, kind: "title" }];
  for (let i = 0; i < count; i++) {
    const horizontal = i % 2 === 0;
    plan.push({ dir: horizontal ? ((i / 2) % 2 === 0 ? 1 : 3) : 0, len: horizontal ? (i % 4 === 0 ? 4 : 3) : 3, kind: "art", index: i });
  }
  const n = count;
  plan.push({ dir: n % 2 === 0 ? ((n / 2) % 2 === 0 ? 1 : 3) : 0, len: 2, kind: "end" });

  let x = 0, y = 0;
  const addCell = (cx, cy, seg) => { if (!cells.has(cellKey(cx, cy))) cells.set(cellKey(cx, cy), { x: cx, y: cy, seg }); };
  const addFeature = f => features.set(`${f.x},${f.y},${f.dir}`, f);
  addCell(0, 0, 0);
  plan.forEach((seg, s) => {
    const d = DIRS[seg.dir];
    for (let k = 0; k < seg.len; k++) { x += d.x; y += d.y; addCell(x, y, s); }
    seg.end = { x, y };
    addFeature({ x, y, dir: seg.dir, kind: seg.kind, index: seg.index, seg: s });
  });
  addFeature({ x: 0, y: 0, dir: 2, kind: "exit" });
  addFeature({ x: 0, y: 1, dir: 3, kind: "about" });
  addFeature({ x: 0, y: 1, dir: 1, kind: "controls" });
  return { cells, features, plan, start: { x: 0, y: 0, dir: 0 } };
}

const hall = buildHall(PIECES.length);
const walkable = (x, y) => hall.cells.has(cellKey(x, y));
const featureAt = (x, y, d) => hall.features.get(`${x},${y},${d}`);
const artFeature = i => [...hall.features.values()].find(f => f.kind === "art" && f.index === i);

/* ───────────────────────── state ───────────────────────── */
const player = { x: hall.start.x, y: hall.start.y, dir: hall.start.dir, yaw: 0 };
let view = { cx: 0, cz: 0, yaw: 0 };
let anim = null, queued = null, held = null;
let started = false, dirty = true, glReady = false;
let ARTS = [];
const revealed = new Set();
const pieceId = (p, i) => p.id || p.image || `piece-${i}`;
const viewed = new Set(store.get("dc-gallery-viewed", []));
const viewedCount = () => PIECES.filter((p, i) => viewed.has(pieceId(p, i))).length;

/* ───────────────────────── DOM ───────────────────────── */
const canvas = $("#hall");
const hud = $("#hud");
const intro = $("#intro");
const enterBtn = $("#enter");
const enterLabel = $("#enter-label");
const promptBtn = $("#prompt");
const mapCanvas = $("#minimap");
const mapCtx = mapCanvas.getContext("2d");
const inspectDlg = $("#inspect");
const panelDlg = $("#panel");
const indexDlg = $("#index");
const announcer = $("#announce");
const anyDialogOpen = () => !!document.querySelector("dialog[open]");

/* ───────────────────────── 2. canvas drawing helpers ───────────────────────── */
function makeCanvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}
function setFont(g, weight, size, family = DISPLAY, spacing = 0) {
  g.font = `${weight} ${size}px ${family}`;
  if ("letterSpacing" in g) g.letterSpacing = `${spacing}px`;
}
function wrapLines(g, text, maxW) {
  const lines = [];
  for (const para of String(text).split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}
function clampLines(g, lines, max, maxW) {
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  out[max - 1] = ellipsize(g, `${out[max - 1]}…`, maxW);
  return out;
}
function ellipsize(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text.replace(/…$/, "");
  while (t.length > 1 && g.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}
function fitSize(g, text, weight, size, maxW, family = DISPLAY, spacingRatio = 0) {
  let s = size;
  setFont(g, weight, s, family, s * spacingRatio);
  while (s > 20 && g.measureText(text).width > maxW) { s -= 4; setFont(g, weight, s, family, s * spacingRatio); }
  return s;
}
function eyebrow(g, x, y, lead, rest, size = 30) {
  setFont(g, 400, size, MONO, size * .17);
  g.fillStyle = "#8cecff"; g.fillText(lead, x, y);
  const w = g.measureText(lead).width;
  g.fillStyle = "#8ba3ba"; g.fillText(rest, x + w, y);
}
function glow(g, color, blur, fn) { g.save(); g.shadowColor = color; g.shadowBlur = blur; fn(); g.restore(); }
function panelBg(g, w, h, accent = "#8cecff") {
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, "#10284c"); gr.addColorStop(1, "#030a1a");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(116,180,224,.055)"; g.lineWidth = 1;
  for (let x = 48; x < w; x += 48) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
  for (let y = 48; y < h; y += 48) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
  g.strokeStyle = "rgba(142,209,255,.32)"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  glow(g, "#53b8ff", 22, () => { g.fillStyle = accent; g.fillRect(0, 0, Math.round(w * .16), 6); });
}
function signalLine(g, x, y, w) {
  g.fillStyle = "rgba(131,198,235,.18)"; g.fillRect(x, y, w, 2);
  glow(g, "#53b8ff", 14, () => { g.fillStyle = "#8cecff"; g.fillRect(x, y - 1, w * .26, 4); });
}

/* surfaces: walls, floor, ceiling (colour map + glow map each) */
function surfaceCanvases() {
  const noise = (g, w, h, seed, n, light = .018, dark = .05) => {
    const r = rng(seed);
    for (let i = 0; i < n; i++) { g.fillStyle = r() > .5 ? `rgba(255,255,255,${light})` : `rgba(0,0,0,${dark})`; g.fillRect(r() * w, r() * h, 2, 2); }
  };
  const glowLine = (g, y, w, color, width, blur, alpha = 1) => {
    g.save(); g.globalAlpha = alpha; g.shadowColor = color; g.shadowBlur = blur; g.fillStyle = color;
    g.fillRect(0, y - width / 2, w, width); g.fillRect(0, y - width / 2, w, width); g.restore();
  };
  const wall = makeCanvas(512, 544, (g, w, h) => {
    g.fillStyle = "#0f1f3d"; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(2,6,18,.6)"); gr.addColorStop(.22, "rgba(2,6,18,0)"); gr.addColorStop(.7, "rgba(2,6,18,0)"); gr.addColorStop(1, "rgba(2,6,18,.55)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    noise(g, w, h, 11, 5000);
    g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(0, h * .69, w, h);          // darker wainscot
    g.fillStyle = "rgba(1,4,12,.7)"; g.fillRect(0, h * .69 - 2, w, 4);       // dado rail
    g.fillStyle = "rgba(140,200,255,.09)"; g.fillRect(0, h * .69 + 2, w, 2);
    g.fillStyle = "rgba(1,4,12,.7)"; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h); // panel seams
  });
  const wallGlow = makeCanvas(512, 544, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    glowLine(g, h - h * .035, w, "#3cc8ff", 4, 18);        // baseboard light
    glowLine(g, h * .03, w, "#7466ff", 2.5, 12, .75);      // crown light
    glowLine(g, h * .69 + 3, w, "#3cc8ff", 1, 6, .25);     // faint rail
  });
  const floor = makeCanvas(512, 512, (g, w, h) => {
    g.fillStyle = "#091530"; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * .7);
    gr.addColorStop(0, "rgba(40,90,160,.16)"); gr.addColorStop(1, "rgba(0,0,0,.25)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    noise(g, w, h, 23, 6000, .02, .06);
    g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  });
  const floorGlow = makeCanvas(512, 512, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    glow(g, "#2a9fe6", 12, () => { g.strokeStyle = "rgba(42,159,230,.65)"; g.lineWidth = 3; g.strokeRect(0, 0, w, h); });
    g.strokeStyle = "rgba(83,184,255,.16)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w / 2, h / 2 - 22); g.lineTo(w / 2 + 22, h / 2); g.lineTo(w / 2, h / 2 + 22); g.lineTo(w / 2 - 22, h / 2); g.closePath(); g.stroke();
  });
  const ceil = makeCanvas(512, 512, (g, w, h) => {
    g.fillStyle = "#081227"; g.fillRect(0, 0, w, h);
    noise(g, w, h, 37, 3000, .015, .05);
    g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  });
  const ceilGlow = makeCanvas(512, 512, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    const r = w * .15;
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4);
    glow(g, "#53b8ff", 50, () => { g.fillStyle = "#9fdcff"; g.fillRect(-r, -r, r * 2, r * 2); });
    g.fillStyle = "#e8f7ff"; g.fillRect(-r * .7, -r * .7, r * 1.4, r * 1.4);
    g.strokeStyle = "rgba(140,236,255,.5)"; g.lineWidth = 3; g.strokeRect(-r * 1.35, -r * 1.35, r * 2.7, r * 2.7);
    g.restore();
    g.strokeStyle = "rgba(116,99,255,.2)"; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
  return { wall, wallGlow, floor, floorGlow, ceil, ceilGlow };
}

/* text walls */
function titleCanvas() {
  return makeCanvas(1280, 1040, (g, w, h) => {
    panelBg(g, w, h);
    const [first, ...restParts] = ARTIST.split(/\s+/);
    const last = restParts.join(" ");
    eyebrow(g, 96, 150, "GALLERY", ` / ${String(DATA.eyebrow || "Works on paper & screen").toUpperCase()}`, 32);
    const size = Math.min(fitSize(g, first, 300, 232, w - 180, DISPLAY, -.075), fitSize(g, last, 300, 232, w - 180, DISPLAY, -.075));
    setFont(g, 300, size, DISPLAY, size * -.075);
    g.fillStyle = "#f5fbff"; g.fillText(first, 84, 410);
    glow(g, "rgba(83,184,255,.6)", 50, () => { g.fillStyle = "#8cecff"; g.fillText(last, 84, 410 + size * .92); });
    setFont(g, 300, 44); g.fillStyle = "#adbdcb";
    clampLines(g, wrapLines(g, DATA.subtitle || "", w - 190), 2, w - 190).forEach((l, i) => g.fillText(l, 92, 740 + i * 62));
    signalLine(g, 92, 880, w - 184);
    setFont(g, 400, 30, MONO, 5);
    g.fillStyle = "#8ba3ba"; g.fillText(`${pad2(PIECES.length)} PIECES`, 92, 962);
    g.textAlign = "right"; g.fillStyle = "#8cecff"; g.fillText("THE COLLECTION  →", w - 92, 962);
  });
}
function aboutCanvas() {
  return makeCanvas(1024, 1100, (g, w, h) => {
    panelBg(g, w, h, "#ff8eb8");
    eyebrow(g, 80, 130, "ABOUT", " / THE ARTIST", 30);
    const size = fitSize(g, ARTIST, 400, 92, w - 160, DISPLAY, -.045);
    setFont(g, 400, size, DISPLAY, size * -.045); g.fillStyle = "#f5fbff"; g.fillText(ARTIST, 76, 260);
    setFont(g, 300, 38); g.fillStyle = "#a8b9c8";
    clampLines(g, wrapLines(g, DATA.statement || "", w - 160), 11, w - 160).forEach((l, i) => g.fillText(l, 80, 360 + i * 56));
    signalLine(g, 80, 990, w - 160);
    setFont(g, 400, 28, MONO, 4); g.fillStyle = "#8cecff"; g.fillText("✕  READ MORE", 80, 1050);
  });
}
function controlsCanvas() {
  return makeCanvas(1024, 1100, (g, w, h) => {
    panelBg(g, w, h, "#7dffd6");
    eyebrow(g, 80, 130, "HOW TO", " / WALK THE HALL", 30);
    setFont(g, 400, 84, DISPLAY, -3.5); g.fillStyle = "#f5fbff"; g.fillText("Controls", 76, 255);
    const rows = [["↑  W", "Step forward"], ["↓  S", "Step back"], ["←  →", "Turn"], ["Q  E", "Sidestep"], ["ENTER", "Inspect a piece"], ["L", "Index of every piece"], ["ESC", "Close / back"]];
    rows.forEach(([k, label], i) => {
      const y = 360 + i * 92;
      g.strokeStyle = "rgba(142,209,255,.16)"; g.lineWidth = 2; g.beginPath(); g.moveTo(80, y - 58); g.lineTo(w - 80, y - 58); g.stroke();
      setFont(g, 400, 34, MONO, 2);
      const kw = g.measureText(k).width + 36;
      g.strokeStyle = "rgba(129,197,236,.4)"; g.strokeRect(80, y - 40, kw, 54);
      g.fillStyle = "#f5fbff"; g.fillText(k, 98, y);
      setFont(g, 300, 36); g.fillStyle = "#a8b9c8"; g.textAlign = "right"; g.fillText(label, w - 80, y); g.textAlign = "left";
    });
    setFont(g, 400, 26, MONO, 3); g.fillStyle = "#8ba3ba"; g.fillText("EVERY CORRIDOR ENDS AT A PIECE.", 80, 1040);
  });
}
function endCanvas() {
  return makeCanvas(1200, 860, (g, w, h) => {
    panelBg(g, w, h, "#8d7dff");
    eyebrow(g, 88, 140, "END", " / OF THE HALL", 30);
    setFont(g, 300, 104, DISPLAY, -6); g.fillStyle = "#f5fbff";
    wrapLines(g, "Thanks for walking through.", w - 176).forEach((l, i) => g.fillText(l, 82, 300 + i * 110));
    setFont(g, 300, 38); g.fillStyle = "#a8b9c8";
    g.fillText("Turn around to walk back, or open the options.", 88, 600);
    signalLine(g, 88, 700, w - 176);
    setFont(g, 400, 28, MONO, 4); g.fillStyle = "#8cecff"; g.fillText("✕  OPTIONS", 88, 775);
  });
}
function exitCanvas() {
  return makeCanvas(720, 1180, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#071733"); gr.addColorStop(1, "#02060f");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const ix = 70, iy = 230, iw = w - 140, ih = h - 230;
    const inner = g.createLinearGradient(0, iy, 0, h);
    inner.addColorStop(0, "#0c2a4f"); inner.addColorStop(1, "#040d1f");
    g.fillStyle = inner; g.fillRect(ix, iy, iw, ih);
    glow(g, "#53b8ff", 26, () => { g.strokeStyle = "#8cecff"; g.lineWidth = 6; g.strokeRect(ix, iy, iw, ih + 10); });
    g.fillStyle = "rgba(140,236,255,.35)"; g.fillRect(w / 2 - 1.5, iy, 3, ih);
    g.fillStyle = "#8cecff"; g.fillRect(w / 2 - 34, iy + ih * .52, 12, 70); g.fillRect(w / 2 + 22, iy + ih * .52, 12, 70);
    glow(g, "#7dffd6", 24, () => { setFont(g, 500, 92, MONO, 18); g.fillStyle = "#7dffd6"; g.textAlign = "center"; g.fillText("EXIT", w / 2 + 9, 150); });
    setFont(g, 400, 26, MONO, 4); g.fillStyle = "#8ba3ba"; g.textAlign = "center"; g.fillText("BACK TO DASHBOARD", w / 2, 198);
    setFont(g, 400, 28, MONO, 4); g.fillStyle = "#8cecff"; g.fillText("✕  LEAVE", w / 2, iy + 160);
  });
}
function placardCanvas(i) {
  const p = PIECES[i];
  return makeCanvas(640, 300, (g, w, h) => {
    g.fillStyle = "#0a1730"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(142,209,255,.35)"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    glow(g, "#53b8ff", 12, () => { g.fillStyle = "#8cecff"; g.fillRect(0, 0, 90, 5); });
    setFont(g, 400, 54, MONO); g.fillStyle = "#8cecff"; g.fillText(pad2(i + 1), 36, 92);
    setFont(g, 500, 44); g.fillStyle = "#f5fbff"; g.fillText(ellipsize(g, p.title || "Untitled", w - 72), 36, 172);
    setFont(g, 400, 26, MONO, 2); g.fillStyle = "#8ba3ba";
    g.fillText(ellipsize(g, [p.year, p.medium].filter(Boolean).join(" · ").toUpperCase(), w - 72), 36, 236);
  });
}
function haloCanvas() {
  return makeCanvas(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(170,225,255,.9)"); gr.addColorStop(.4, "rgba(83,184,255,.35)"); gr.addColorStop(1, "rgba(83,184,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

/* placeholder art, so the hall looks right before real scans arrive */
function placeholderCanvas(i) {
  const r = rng(7919 * (i + 1));
  const [w, h] = [[1200, 1500], [1500, 1100], [1200, 1200]][i % 3];
  return makeCanvas(w, h, g => {
    const sketch = i % 2 === 0;
    if (sketch) {
      g.fillStyle = "#e9e4d7"; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(90,78,55,${r() * .05})`; g.fillRect(r() * w, r() * h, 1.6, 1.6); }
      g.lineCap = "round";
      const cx = w * (.42 + r() * .16), cy = h * (.42 + r() * .1);
      for (let s = 0; s < 80; s++) {
        g.strokeStyle = `rgba(28,30,36,${.06 + r() * .3})`; g.lineWidth = .8 + r() * 2.4;
        let x = cx + (r() - .5) * w * .5, y = cy + (r() - .5) * h * .55;
        g.beginPath(); g.moveTo(x, y);
        for (let p = 0; p < 3; p++) {
          const nx = cx + (r() - .5) * w * .52, ny = cy + (r() - .5) * h * .56;
          g.quadraticCurveTo(x + (r() - .5) * w * .4, y + (r() - .5) * h * .3, nx, ny); x = nx; y = ny;
        }
        g.stroke();
      }
      g.strokeStyle = "rgba(28,30,36,.22)"; g.lineWidth = 1.2;
      const hx = w * (.15 + r() * .5), hy = h * (.55 + r() * .2);
      for (let k = 0; k < 26; k++) { g.beginPath(); g.moveTo(hx + k * 9, hy); g.lineTo(hx + k * 9 + 60, hy + 120); g.stroke(); }
      g.fillStyle = "rgba(40,40,46,.5)";
    } else {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, "#0b1736"); gr.addColorStop(1, "#2a1d5e");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "screen";
      ["#53b8ff", "#ff8eb8", "#8d7dff", "#7dffd6"].forEach(c => {
        const x = r() * w, y = r() * h, rad = (.25 + r() * .35) * Math.min(w, h);
        const rg = g.createRadialGradient(x, y, 0, x, y, rad);
        rg.addColorStop(0, c); rg.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = .55; g.fillStyle = rg; g.fillRect(0, 0, w, h);
      });
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      g.strokeStyle = "rgba(220,240,255,.5)"; g.lineWidth = 2;
      for (let k = 0; k < 7; k++) {
        g.beginPath(); g.arc(w * (.3 + r() * .4), h * (.3 + r() * .4), 40 + r() * Math.min(w, h) * .3, r() * 6, r() * 6 + 1 + r() * 3); g.stroke();
      }
      g.fillStyle = "rgba(220,235,255,.6)";
    }
    setFont(g, 400, Math.round(w * .022), MONO, 3);
    g.fillText(`PLACEHOLDER ${pad2(i + 1)}  ·  YOUR ${sketch ? "DRAWING" : "DIGITAL PIECE"} HERE`, w * .06, h - h * .05);
  });
}

/* ───────────────────────── 3. loading art ───────────────────────── */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}
async function loadArt(onProgress) {
  let done = 0;
  return Promise.all(PIECES.map(async (p, i) => {
    let source = null, url = null;
    if (p.image) {
      try { source = await loadImage(p.image); url = p.image; }
      catch { console.warn(`Gallery: couldn't load "${p.image}", showing a placeholder instead.`); }
    }
    const placeholder = !source;
    if (placeholder) { source = placeholderCanvas(i); url = source.toDataURL("image/jpeg", .88); }
    onProgress(++done);
    const w = source.naturalWidth || source.width, h = source.naturalHeight || source.height;
    return { source, url, placeholder, aspect: w / h };
  }));
}
function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  const loads = ["300 100px", "400 100px", "500 100px"].map(f => document.fonts.load(`${f} "Space Grotesk"`))
    .concat(["300 40px", "400 40px", "500 40px"].map(f => document.fonts.load(`${f} "DM Mono"`)));
  return Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
}

/* ───────────────────────── 4. three.js scene ───────────────────────── */
let renderer, scene, camera, lamp, maxAniso = 1;
const clickable = [];

function initRenderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  maxAniso = renderer.capabilities.getMaxAnisotropy();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 4, 26);
  camera = new THREE.PerspectiveCamera(62, 1, .05, 80);
  scene.add(new THREE.HemisphereLight(0x6a80d0, 0x080c1c, .55));
  lamp = new THREE.PointLight(0xd6ecff, 18, 18, 1.35);
  scene.add(lamp);
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); glReady = false; });
}

function texture(source) {
  const t = source instanceof HTMLCanvasElement ? new THREE.CanvasTexture(source) : new THREE.Texture(source);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.needsUpdate = true;
  return t;
}

class Quads {
  constructor() { this.p = []; this.n = []; this.uv = []; }
  add(a, b, c, d, n) {
    this.p.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) this.n.push(...n);
    this.uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  mesh(material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    return new THREE.Mesh(geo, material);
  }
}

function buildScene() {
  const c = surfaceCanvases();
  const walls = new Quads(), floors = new Quads(), ceils = new Quads();
  const h = S / 2;
  for (const cell of hall.cells.values()) {
    const cx = cell.x * S, cz = -cell.y * S;
    const A = [cx - h, 0, cz - h], B = [cx - h, 0, cz + h], C = [cx + h, 0, cz + h], D = [cx + h, 0, cz - h];
    floors.add(A, B, C, D, [0, 1, 0]);
    const up = p => [p[0], H, p[2]];
    ceils.add(up(A), up(D), up(C), up(B), [0, -1, 0]);
    DIRS.forEach(d => {
      if (walkable(cell.x + d.x, cell.y + d.y)) return;
      const dx = d.x, dz = -d.y;           // world direction of this wall
      const wx = cx + dx * h, wz = cz + dz * h;
      const rx = -dz, rz = dx;             // "right" as seen from inside the cell
      const BL = [wx - rx * h, 0, wz - rz * h], BR = [wx + rx * h, 0, wz + rz * h];
      walls.add(BL, BR, [BR[0], H, BR[2]], [BL[0], H, BL[2]], [-dx, 0, -dz]);
    });
  }
  scene.add(walls.mesh(new THREE.MeshStandardMaterial({ map: texture(c.wall), emissiveMap: texture(c.wallGlow), emissive: 0xffffff, roughness: .82, metalness: .05 })));
  scene.add(floors.mesh(new THREE.MeshStandardMaterial({ map: texture(c.floor), emissiveMap: texture(c.floorGlow), emissive: 0xffffff, roughness: .38, metalness: .3 })));
  scene.add(ceils.mesh(new THREE.MeshStandardMaterial({ map: texture(c.ceil), emissiveMap: texture(c.ceilGlow), emissive: 0xffffff, roughness: .9 })));

  const halo = texture(haloCanvas());
  const haloMat = opacity => new THREE.MeshBasicMaterial({ map: halo, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x050a16, roughness: .35, metalness: .6 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x53b8ff, transparent: true, opacity: .75 });
  const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xd8f3ff, toneMapped: false });

  const wallGroup = f => {
    const d = DIRS[f.dir];
    const g = new THREE.Group();
    g.position.set(f.x * S + d.x * h, 0, -f.y * S - d.y * h);
    g.rotation.y = -f.dir * Math.PI / 2;   // local +z now points back into the cell, local +x is the viewer's right
    scene.add(g);
    return g;
  };
  const flat = (g, map, w, ht, x, y, z, f) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ht), new THREE.MeshBasicMaterial({ map, toneMapped: false }));
    m.position.set(x, y, z);
    if (f) { m.userData.feature = f; clickable.push(m); }
    g.add(m);
    return m;
  };
  const glowBehind = (g, w, ht, y, opacity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ht), haloMat(opacity));
    m.position.set(0, y, .012);
    g.add(m);
  };

  for (const f of hall.features.values()) {
    const g = wallGroup(f);
    if (f.kind === "art") {
      const art = ARTS[f.index];
      const maxW = 1.7, maxH = 1.75, cy = 1.62, border = .07;
      const w = Math.min(maxW, maxH * art.aspect), ht = w / art.aspect;
      glowBehind(g, w + 1.6, ht + 1.8, cy + .12, .42);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + border * 2, ht + border * 2, .06), frameMat);
      frame.position.set(0, cy, .03);
      g.add(frame);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w + border * 2 + .03, ht + border * 2 + .03)), edgeMat);
      edge.position.set(0, cy, .062);
      g.add(edge);
      flat(g, texture(art.source), w, ht, 0, cy, .063, f);
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * .55, .8), .045, .14), fixtureMat);
      fixture.position.set(0, cy + ht / 2 + border + .3, .12);
      g.add(fixture);
      glowBehind(g, Math.min(w * .55, .8) + .9, .5, cy + ht / 2 + border + .3, .35);
      flat(g, texture(placardCanvas(f.index)), .5, .234, w / 2 + border + .3, 1.02, .03);
    } else if (f.kind === "title") {
      glowBehind(g, 3.4, 3, 1.66, .18);
      flat(g, texture(titleCanvas()), 2.5, 2.03, 0, 1.66, .02, f);
    } else if (f.kind === "about") {
      glowBehind(g, 2.4, 2.6, 1.62, .16);
      flat(g, texture(aboutCanvas()), 1.5, 1.61, 0, 1.62, .02, f);
    } else if (f.kind === "controls") {
      glowBehind(g, 2.4, 2.6, 1.62, .16);
      flat(g, texture(controlsCanvas()), 1.5, 1.61, 0, 1.62, .02, f);
    } else if (f.kind === "end") {
      glowBehind(g, 3.2, 2.6, 1.66, .18);
      flat(g, texture(endCanvas()), 2.3, 1.65, 0, 1.66, .02, f);
    } else if (f.kind === "exit") {
      glowBehind(g, 2.6, 3.2, 1.3, .22);
      flat(g, texture(exitCanvas()), 1.46, 2.4, 0, 1.2, .02, f);
    }
  }
}

function resize() {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < .8 ? 80 : w / h < 1.2 ? 70 : 62;
  camera.updateProjectionMatrix();
  dirty = true;
}

function applyCamera(cx, cz, yaw, bob = 0) {
  view = { cx, cz, yaw };
  if (!camera) return;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  camera.position.set(cx - fx * BACK, EYE + bob, cz - fz * BACK);
  camera.rotation.set(0, yaw, 0);
  lamp.position.set(cx - fx * (BACK + .3), EYE + .45, cz - fz * (BACK + .3));
  dirty = true;
}

/* ───────────────────────── 5. movement ───────────────────────── */
function tryAction(act, fromHold = false) {
  if (!started || anyDialogOpen()) return;
  if (anim) { if (!fromHold) queued = act; return; }
  begin(act, fromHold);
}

function begin(act, fromHold) {
  if (act === "use") { interact(); if (!anim) announce(); return; }
  const cx = player.x * S, cz = -player.y * S;
  promptBtn.hidden = true;
  if (act === "left" || act === "right") {
    const delta = act === "left" ? -1 : 1;
    const fromYaw = player.yaw;
    player.dir = (player.dir + delta + 4) % 4;
    player.yaw -= delta * Math.PI / 2;
    anim = { kind: "turn", t0: performance.now(), dur: DUR.turn, cx, cz, fromYaw, toYaw: player.yaw };
    sfx.turn();
    return;
  }
  const rel = { forward: 0, strafeR: 1, back: 2, strafeL: 3 }[act];
  if (rel === undefined) return;
  const d = DIRS[(player.dir + rel) % 4];
  const nx = player.x + d.x, ny = player.y + d.y;
  if (walkable(nx, ny)) {
    player.x = nx; player.y = ny;
    anim = { kind: "step", t0: performance.now(), dur: DUR.step, fx: cx, fz: cz, tx: nx * S, tz: -ny * S };
    sfx.step();
  } else if (!fromHold) {
    anim = { kind: "bump", t0: performance.now(), dur: DUR.bump, cx, cz, vx: d.x, vz: -d.y };
    sfx.bump();
  } else {
    held = null;
    arrive();
  }
}

function tick(now) {
  const t = Math.min(1, (now - anim.t0) / Math.max(1, anim.dur));
  if (anim.kind === "turn") {
    applyCamera(anim.cx, anim.cz, lerp(anim.fromYaw, anim.toYaw, easeInOut(t)));
  } else if (anim.kind === "step") {
    const e = easeOut(t);
    applyCamera(lerp(anim.fx, anim.tx, e), lerp(anim.fz, anim.tz, e), player.yaw, REDUCED ? 0 : -Math.sin(Math.PI * t) * .045);
  } else {
    const k = Math.sin(Math.PI * t) * .16;
    applyCamera(anim.cx + anim.vx * k, anim.cz + anim.vz * k, player.yaw);
  }
  if (t >= 1) { anim = null; arrive(); }
}

function arrive() {
  reveal();
  updateHud();
  const next = queued ?? held?.act;
  const fromHold = !queued && !!held;
  queued = null;
  if (next) begin(next, fromHold);
  else announce();
}

function teleport(x, y, dir) {
  player.x = x; player.y = y; player.dir = dir;
  const target = -dir * Math.PI / 2;
  player.yaw = target + Math.round((player.yaw - target) / (Math.PI * 2)) * Math.PI * 2;
  anim = null; queued = null; held = null;
  applyCamera(x * S, -y * S, player.yaw);
  reveal();
  updateHud();
}

function interact() {
  if (!started || anyDialogOpen()) return;
  if (anim) { queued = "use"; return; }   // pressed Enter mid-step: inspect as soon as we arrive
  const f = featureAt(player.x, player.y, player.dir);
  if (f) activate(f);
}
function activate(f) {
  if (f.kind === "art") openInspect(f.index);
  else if (f.kind === "title" || f.kind === "about") openPanel("about");
  else if (f.kind === "controls") openPanel("controls");
  else if (f.kind === "end") openPanel("end");
  else if (f.kind === "exit") location.href = "index.html";
}

function reveal() {
  const mark = (x, y) => { if (walkable(x, y)) revealed.add(cellKey(x, y)); };
  mark(player.x, player.y);
  DIRS.forEach(d => mark(player.x + d.x, player.y + d.y));
  const d = DIRS[player.dir];
  let x = player.x, y = player.y;
  for (let i = 0; i < 5 && walkable(x + d.x, y + d.y); i++) { x += d.x; y += d.y; mark(x, y); }
  dirty = true;
}

/* ───────────────────────── 6. HUD, minimap, announcements ───────────────────────── */
const FEATURE_LABEL = {
  art: f => ["Inspect", PIECES[f.index].title || "Untitled"],
  title: () => ["Read", "About the artist"],
  about: () => ["Read", "Artist statement"],
  controls: () => ["View", "Controls"],
  end: () => ["Options", "End of the hall"],
  exit: () => ["Leave", "Back to dashboard"],
};
let lastLoc = "";
function updateHud() {
  const cell = hall.cells.get(cellKey(player.x, player.y));
  const seg = hall.plan[cell?.seg ?? 0];
  let name = "Entrance", sub = `${pad2(PIECES.length)} pieces ahead`;
  if (seg.kind === "art") { name = `Corridor ${pad2(seg.index + 1)}`; sub = PIECES[seg.index].title || "Untitled"; }
  else if (seg.kind === "end") { name = "End of the hall"; sub = "Turn around to walk back"; }
  if (name !== lastLoc) {
    lastLoc = name;
    $("#loc-name").textContent = name;
    $("#loc-sub").textContent = sub;
    const loc = $(".g-loc");
    loc.classList.remove("is-changing"); void loc.offsetWidth; loc.classList.add("is-changing");
  }
  $("#compass").textContent = DIRS[player.dir].n;
  $("#viewed").textContent = `${viewedCount()}/${PIECES.length}`;
  const f = featureAt(player.x, player.y, player.dir);
  if (f && !anim && started) {
    const [action, title] = FEATURE_LABEL[f.kind](f);
    $("#prompt-action").textContent = action;
    $("#prompt-title").textContent = title;
    promptBtn.hidden = false;
  } else promptBtn.hidden = true;
}

function describe(f) {
  if (f.kind === "art") { const p = PIECES[f.index]; return `Piece ${f.index + 1}, ${p.title || "Untitled"}`; }
  return { title: "The gallery title wall", about: "The artist statement", controls: "The controls panel", end: "The end of the hall", exit: "The exit door" }[f.kind];
}
function announce() {
  if (!started) return;
  const d = DIRS[player.dir];
  const f = featureAt(player.x, player.y, player.dir);
  let msg = `Facing ${d.word}.`;
  if (f) msg += ` ${describe(f)} is in front of you. Press Enter.`;
  else {
    let x = player.x, y = player.y, n = 0;
    while (walkable(x + d.x, y + d.y) && n < 20) { x += d.x; y += d.y; n++; }
    const ahead = featureAt(x, y, player.dir);
    const steps = `${n} step${n === 1 ? "" : "s"}`;
    msg += n === 0 ? " Wall ahead." : ahead ? ` ${describe(ahead)}, ${steps} ahead.` : ` The corridor continues ${steps}.`;
  }
  announcer.textContent = msg;
}

function drawMap() {
  const size = mapCanvas.clientWidth;
  if (!size) { dirty = started; return; }
  const dpr = Math.min(devicePixelRatio, 2);
  if (mapCanvas.width !== Math.round(size * dpr)) { mapCanvas.width = mapCanvas.height = Math.round(size * dpr); }
  const g = mapCtx;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, size, size);
  const cs = size / 6.5;
  const px = view.cx / S, py = -view.cz / S;
  const hc = cs / 2;
  g.save();
  g.translate(size / 2, size / 2 + cs * .55);
  g.rotate(view.yaw);
  const cells = [...revealed].map(k => hall.cells.get(k));
  const pos = c => [(c.x - px) * cs, -(c.y - py) * cs];
  // floor tiles
  for (const c of cells) {
    const [x, y] = pos(c);
    if (Math.abs(x) > size || Math.abs(y) > size) continue;
    g.fillStyle = "rgba(38,92,168,.34)"; g.fillRect(x - hc, y - hc, cs, cs);
    g.strokeStyle = "rgba(83,184,255,.12)"; g.lineWidth = 1; g.strokeRect(x - hc + .5, y - hc + .5, cs - 1, cs - 1);
  }
  // walls
  g.save();
  g.strokeStyle = "#8cecff"; g.lineWidth = 2; g.lineCap = "square"; g.shadowColor = "#53b8ff"; g.shadowBlur = 6;
  g.beginPath();
  for (const c of cells) {
    const [x, y] = pos(c);
    if (Math.abs(x) > size || Math.abs(y) > size) continue;
    if (!walkable(c.x, c.y + 1)) { g.moveTo(x - hc, y - hc); g.lineTo(x + hc, y - hc); }
    if (!walkable(c.x + 1, c.y)) { g.moveTo(x + hc, y - hc); g.lineTo(x + hc, y + hc); }
    if (!walkable(c.x, c.y - 1)) { g.moveTo(x - hc, y + hc); g.lineTo(x + hc, y + hc); }
    if (!walkable(c.x - 1, c.y)) { g.moveTo(x - hc, y - hc); g.lineTo(x - hc, y + hc); }
  }
  g.stroke();
  g.restore();
  // features on walls
  for (const f of hall.features.values()) {
    if (!revealed.has(cellKey(f.x, f.y))) continue;
    const [x, y] = pos(f);
    const d = DIRS[f.dir];
    const fx = x + d.x * hc * .72, fy = y - d.y * hc * .72;
    const r = f.kind === "art" ? cs * .17 : cs * .11;
    g.save(); g.translate(fx, fy); g.rotate(Math.PI / 4);
    if (f.kind === "art") {
      const seen = viewed.has(pieceId(PIECES[f.index], f.index));
      g.shadowColor = seen ? "#8d7dff" : "#ff8eb8"; g.shadowBlur = 8;
      g.fillStyle = seen ? "#8d7dff" : "#ff8eb8"; g.fillRect(-r, -r, r * 2, r * 2);
    } else {
      g.fillStyle = f.kind === "exit" ? "#7dffd6" : "#8cecff"; g.fillRect(-r, -r, r * 2, r * 2);
    }
    g.restore();
  }
  g.restore();
  // player marker + view cone (always pointing up)
  g.save();
  g.translate(size / 2, size / 2 + cs * .55);
  const cone = g.createLinearGradient(0, 0, 0, -cs * 1.6);
  cone.addColorStop(0, "rgba(140,236,255,.32)"); cone.addColorStop(1, "rgba(140,236,255,0)");
  g.fillStyle = cone; g.beginPath(); g.moveTo(0, 0); g.lineTo(-cs * .9, -cs * 1.6); g.lineTo(cs * .9, -cs * 1.6); g.closePath(); g.fill();
  g.shadowColor = "#8cecff"; g.shadowBlur = 10; g.fillStyle = "#f5fbff";
  g.beginPath(); g.moveTo(0, -cs * .32); g.lineTo(cs * .24, cs * .22); g.lineTo(0, cs * .1); g.lineTo(-cs * .24, cs * .22); g.closePath(); g.fill();
  g.restore();
  // north marker on the rim
  const nx = Math.sin(view.yaw), ny = -Math.cos(view.yaw);
  const rad = size / 2 - 10;
  g.save();
  g.font = `500 ${Math.max(9, size * .075)}px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(3,10,26,.9)"; g.beginPath(); g.arc(size / 2 + nx * rad, size / 2 + ny * rad, size * .065, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ff8eb8"; g.fillText("N", size / 2 + nx * rad, size / 2 + ny * rad + .5);
  g.restore();
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!glReady) return;
  if (anim) tick(now);
  if (!dirty) return;
  dirty = false;
  renderer.render(scene, camera);
  drawMap();
}

/* ───────────────────────── 7. sound (synthesised, off by default) ───────────────────────── */
const sfx = {
  on: store.get("dc-gallery-sound", false) === true,
  ctx: null, out: null, noiseBuf: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain(); this.out.gain.value = 0; this.out.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // room hum: two low sines and a whisper of filtered noise
    [[55, .022], [110.4, .008]].forEach(([f, v]) => {
      const o = this.ctx.createOscillator(), gn = this.ctx.createGain();
      o.frequency.value = f; gn.gain.value = v; o.connect(gn).connect(this.out); o.start();
    });
    const n = this.ctx.createBufferSource(), lp = this.ctx.createBiquadFilter(), gn = this.ctx.createGain();
    n.buffer = this.noiseBuf; n.loop = true; lp.type = "lowpass"; lp.frequency.value = 260; gn.gain.value = .02;
    n.connect(lp).connect(gn).connect(this.out); n.start();
  },
  set(on) {           // only call from a click / key press: browsers block audio before a gesture
    this.on = on;
    store.set("dc-gallery-sound", on);
    if (on) { this.init(); this.ctx?.resume(); }
    if (this.ctx) this.out.gain.setTargetAtTime(on ? .7 : 0, this.ctx.currentTime, .08);
    this.ui();
  },
  ui() {
    $("#btn-sound").setAttribute("aria-pressed", String(this.on));
    $("#sound-label").textContent = this.on ? "Sound on" : "Sound off";
  },
  live() { return this.on && this.ctx && this.ctx.state === "running"; },
  noise(dur, type, f0, f1, q, vol) {
    if (!this.live()) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(), flt = this.ctx.createBiquadFilter(), gn = this.ctx.createGain();
    src.buffer = this.noiseBuf; flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + .008); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(flt).connect(gn).connect(this.out);
    src.start(t, Math.random()); src.stop(t + dur + .05);
  },
  tone(f0, f1, dur, vol, type = "sine", delay = 0) {
    if (!this.live()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), gn = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + .01); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(gn).connect(this.out); o.start(t); o.stop(t + dur + .05);
  },
  step() { this.noise(.11, "lowpass", 900 + Math.random() * 200, 250, .8, .5); this.tone(95, 55, .09, .18); },
  turn() { this.noise(.2, "bandpass", 1800, 500, 1.2, .14); },
  bump() { this.tone(110, 42, .2, .45); this.noise(.08, "lowpass", 500, 120, .7, .3); },
  open() { this.tone(660, 660, .35, .07, "triangle"); this.tone(990, 990, .45, .05, "triangle", .07); },
  close() { this.tone(990, 990, .25, .05, "triangle"); this.tone(660, 660, .3, .05, "triangle", .06); },
};

/* ───────────────────────── 8. dialogs ───────────────────────── */
const insp = { i: 0, s: 1, tx: 0, ty: 0, pointers: new Map(), last: null, lastTap: 0 };
const stage = $("#stage");
const inspImg = $("#insp-img");

function metaRows(p) {
  return [["Year", p.year], ["Medium", p.medium], ["Size", p.size]].filter(([, v]) => v);
}
function fillParagraphs(el, text) {
  el.replaceChildren(...String(text || "").split(/\n\s*\n/).map(t => t.trim()).filter(Boolean).map(t => {
    const p = document.createElement("p"); p.textContent = t; return p;
  }));
}
function markViewed(i) {
  viewed.add(pieceId(PIECES[i], i));
  store.set("dc-gallery-viewed", [...viewed]);
  dirty = true;
}

function openInspect(i) {
  if (!PIECES.length) return;
  i = (i + PIECES.length) % PIECES.length;   // wrap before the lookup so Previous on #1 / Next on the last piece work
  if (!ARTS[i]) return;
  insp.i = i;
  const p = PIECES[insp.i], art = ARTS[insp.i];
  const count = $("#insp-count");
  count.replaceChildren();
  const lead = document.createElement("span"); lead.textContent = `PIECE ${pad2(insp.i + 1)}`;
  count.append(lead, ` / ${pad2(PIECES.length)}`);
  $("#insp-title").textContent = p.title || "Untitled";
  $("#insp-meta").replaceChildren(...metaRows(p).map(([k, v]) => {
    const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k; dd.textContent = v; row.append(dt, dd); return row;
  }));
  fillParagraphs($("#insp-story"), p.story);
  inspImg.src = art.url;
  inspImg.alt = p.alt || [p.title || "Untitled", p.medium].filter(Boolean).join(", ");
  setZoom(1, 0, 0, false);
  const f = artFeature(insp.i);
  if (f && glReady && started) teleport(f.x, f.y, f.dir);   // closing the viewer leaves you standing at this piece
  markViewed(insp.i);
  if (!inspectDlg.open) { closeOtherDialogs(inspectDlg); inspectDlg.showModal(); }
  sfx.open();
}
function closeOtherDialogs(keep) {
  document.querySelectorAll("dialog[open]").forEach(d => { if (d !== keep) d.close(); });
}

function clampPan(s, tx, ty) {
  const w = inspImg.offsetWidth * s, h = inspImg.offsetHeight * s;
  const mx = Math.max(0, (w - stage.clientWidth) / 2 + 40), my = Math.max(0, (h - stage.clientHeight) / 2 + 40);
  return [Math.max(-mx, Math.min(mx, tx)), Math.max(-my, Math.min(my, ty))];
}
function setZoom(s, tx, ty, animate = true) {
  insp.s = Math.max(1, Math.min(6, s));
  if (insp.s === 1) { tx = 0; ty = 0; }
  [insp.tx, insp.ty] = clampPan(insp.s, tx, ty);
  inspImg.classList.toggle("is-animating", animate);
  inspImg.style.transform = `translate(${insp.tx}px, ${insp.ty}px) scale(${insp.s})`;
  $("#zoom-level").textContent = `${Math.round(insp.s * 100)}%`;
}
function zoomAt(clientX, clientY, s, animate = false) {
  const r = stage.getBoundingClientRect();
  const px = clientX - (r.left + r.width / 2), py = clientY - (r.top + r.height / 2);
  const ns = Math.max(1, Math.min(6, s));
  const qx = (px - insp.tx) / insp.s, qy = (py - insp.ty) / insp.s;
  setZoom(ns, px - qx * ns, py - qy * ns, animate);
}
function zoomCentre(factor) {
  const r = stage.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, insp.s * factor, true);
}

stage.addEventListener("wheel", e => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, insp.s * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)));
}, { passive: false });
stage.addEventListener("pointerdown", e => {
  if (e.target.closest("button")) return;
  stage.setPointerCapture(e.pointerId);
  insp.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  insp.last = null;
  stage.classList.add("is-dragging");
});
stage.addEventListener("pointermove", e => {
  const pt = insp.pointers.get(e.pointerId);
  if (!pt) return;
  const prevX = pt.x, prevY = pt.y;
  pt.x = e.clientX; pt.y = e.clientY;
  if (insp.pointers.size === 1) {
    if (insp.s > 1) setZoom(insp.s, insp.tx + (pt.x - prevX), insp.ty + (pt.y - prevY), false);
  } else if (insp.pointers.size === 2) {
    const [a, b] = [...insp.pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (insp.last) {
      zoomAt(mx, my, insp.s * dist / insp.last.dist);
      setZoom(insp.s, insp.tx + (mx - insp.last.mx), insp.ty + (my - insp.last.my), false);
    }
    insp.last = { dist, mx, my };
  }
});
const endPointer = e => {
  const pt = insp.pointers.get(e.pointerId);
  if (!pt) return;
  insp.pointers.delete(e.pointerId);
  insp.last = null;
  if (!insp.pointers.size) stage.classList.remove("is-dragging");
  if (e.type !== "pointerup" || Math.hypot(pt.x - pt.x0, pt.y - pt.y0) > 8) return;
  const now = performance.now();
  if (now - insp.lastTap < 320) { insp.s > 1.05 ? setZoom(1, 0, 0) : zoomAt(e.clientX, e.clientY, 2.5, true); insp.lastTap = 0; }
  else insp.lastTap = now;
};
["pointerup", "pointercancel", "lostpointercapture"].forEach(t => stage.addEventListener(t, endPointer));
inspImg.addEventListener("load", () => setZoom(1, 0, 0, false));
$("#inspect .g-zoom").addEventListener("click", e => {
  const b = e.target.closest("[data-zoom]");
  if (!b) return;
  if (b.dataset.zoom === "in") zoomCentre(1.5);
  else if (b.dataset.zoom === "out") zoomCentre(1 / 1.5);
  else setZoom(1, 0, 0);
});
inspectDlg.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => openInspect(insp.i + Number(b.dataset.step))));
inspectDlg.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") { e.preventDefault(); openInspect(insp.i - 1); }
  else if (e.key === "ArrowRight") { e.preventDefault(); openInspect(insp.i + 1); }
  else if (e.key === "+" || e.key === "=") zoomCentre(1.5);
  else if (e.key === "-" || e.key === "_") zoomCentre(1 / 1.5);
  else if (e.key === "0") setZoom(1, 0, 0);
  else if (e.key === "Backspace") { e.preventDefault(); inspectDlg.close(); }
});

function openPanel(kind) {
  const eyebrowEl = $("#panel-eyebrow"), body = $("#panel-body");
  const lead = document.createElement("span");
  body.replaceChildren();
  if (kind === "about") {
    lead.textContent = "ABOUT"; eyebrowEl.replaceChildren(lead, " / THE ARTIST");
    $("#panel-title").textContent = ARTIST;
    fillParagraphs(body, DATA.statement);
    const link = document.createElement("a");
    link.className = "g-link"; link.href = "index.html#projects"; link.textContent = "See my software work on the dashboard →";
    body.append(link);
  } else if (kind === "controls") {
    lead.textContent = "HOW TO"; eyebrowEl.replaceChildren(lead, " / WALK THE HALL");
    $("#panel-title").textContent = "Controls";
    const list = document.createElement("ul");
    [["↑ / W", "Step forward"], ["↓ / S", "Step back"], ["← → / A D", "Turn left / right"], ["Q / E", "Sidestep"], ["Enter / X", "Inspect what's in front of you"], ["L", "Index of every piece"], ["Esc", "Close / back"], ["Touch", "Swipe to move and turn, tap to inspect"]]
      .forEach(([k, v]) => { const li = document.createElement("li"), kb = document.createElement("kbd"), sp = document.createElement("span"); kb.textContent = k; sp.textContent = v; li.append(kb, sp); list.append(li); });
    body.append(list);
  } else if (kind === "end") {
    lead.textContent = "END"; eyebrowEl.replaceChildren(lead, " / OF THE HALL");
    $("#panel-title").textContent = "Thanks for walking through.";
    fillParagraphs(body, `You've reached the end of the collection${PIECES.length ? `: ${viewedCount()} of ${PIECES.length} pieces viewed up close` : ""}.`);
    const actions = document.createElement("div");
    actions.className = "g-sheet-actions";
    const btn = (label, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "g-btn"; b.textContent = label; b.addEventListener("click", fn); return b; };
    actions.append(
      btn("↺  Walk back to the entrance", () => { panelDlg.close(); teleport(hall.start.x, hall.start.y, hall.start.dir); }),
      btn("△  Browse every piece as a list", () => openIndex()),
    );
    const home = document.createElement("a");
    home.className = "g-btn"; home.href = "index.html"; home.textContent = "○  Back to the dashboard";
    actions.append(home);
    body.append(actions);
  }
  if (!panelDlg.open) { closeOtherDialogs(panelDlg); panelDlg.showModal(); }
  sfx.open();
}

function openIndex() {
  const grid = $("#index-grid");
  grid.replaceChildren(...PIECES.map((p, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "g-card";
    b.classList.toggle("is-viewed", viewed.has(pieceId(p, i)));
    const img = document.createElement("img");
    img.src = ARTS[i]?.url || ""; img.alt = ""; img.loading = "lazy";
    const num = document.createElement("small"); num.textContent = `PIECE ${pad2(i + 1)}`;
    const title = document.createElement("strong"); title.textContent = p.title || "Untitled";
    const meta = document.createElement("span"); meta.textContent = [p.year, p.medium].filter(Boolean).join(" · ");
    b.append(img, num, title, meta);
    b.addEventListener("click", () => openInspect(i));
    return b;
  }));
  if (!indexDlg.open) { closeOtherDialogs(indexDlg); indexDlg.showModal(); }
  sfx.open();
}

document.querySelectorAll("dialog").forEach(d => {
  d.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => d.close()));
  d.addEventListener("click", e => { if (e.target === d && d !== inspectDlg) d.close(); });
  d.addEventListener("close", () => {
    sfx.close();
    if (!anyDialogOpen()) { updateHud(); dirty = true; if (started) canvas.focus({ preventScroll: true }); announce(); }
  });
});

/* ───────────────────────── 9. input ───────────────────────── */
const KEYMAP = {
  ArrowUp: "forward", KeyW: "forward", ArrowDown: "back", KeyS: "back",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  KeyQ: "strafeL", KeyE: "strafeR",
};
document.addEventListener("keydown", e => {
  if (anyDialogOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!started) {
    if ((e.key === "Enter" || e.key === " ") && !enterBtn.disabled && !e.target.closest("button, a")) { e.preventDefault(); enter(); }
    return;
  }
  const onControl = e.target.closest?.("button, a");
  const act = KEYMAP[e.code];
  if (act) {
    e.preventDefault();
    if (!e.repeat) { held = { code: e.code, act }; tryAction(act); }
    return;
  }
  if ((e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space" || e.code === "KeyX") && !onControl) { e.preventDefault(); interact(); }
  else if (e.code === "KeyL" || e.code === "KeyI") { e.preventDefault(); openIndex(); }
});
document.addEventListener("keyup", e => { if (held && held.code === e.code) held = null; });
addEventListener("blur", () => { held = null; });

// on-screen pad
document.querySelectorAll(".g-pad [data-act]").forEach(b => {
  const act = b.dataset.act;
  b.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (act === "use") { interact(); return; }
    b.setPointerCapture(e.pointerId);
    held = { code: "pad", act };
    tryAction(act);
  });
  const release = () => { if (held?.code === "pad") held = null; };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => b.addEventListener(t, release));
  b.addEventListener("click", e => { if (e.detail === 0) act === "use" ? interact() : tryAction(act); }); // keyboard activation
  b.addEventListener("contextmenu", e => e.preventDefault());
});

// swipe / tap / click on the 3D view
let gesture = null;
canvas.addEventListener("pointerdown", e => { gesture = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener("pointerup", e => {
  if (!gesture || !started || anyDialogOpen()) { gesture = null; return; }
  const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
  gesture = null;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (Math.max(ax, ay) < 24) { interact(); return; }
  if (ax > ay) tryAction(dx < 0 ? "right" : "left");
  else tryAction(dy < 0 ? "forward" : "back");
});
canvas.addEventListener("pointermove", e => {
  if (!started || !glReady || anyDialogOpen()) return;
  const f = featureAt(player.x, player.y, player.dir);
  canvas.style.cursor = f ? "pointer" : "default";
});

promptBtn.addEventListener("click", interact);
$("#btn-sound").addEventListener("click", e => { sfx.set(!sfx.on); if (e.detail) e.currentTarget.blur(); });
$("#btn-index").addEventListener("click", e => { openIndex(); if (e.detail) e.currentTarget.blur(); });
$("#intro-index").addEventListener("click", openIndex);
enterBtn.addEventListener("click", enter);
addEventListener("resize", () => { resize(); dirty = true; });

function enter() {
  if (started || enterBtn.disabled) return;
  started = true;
  intro.classList.add("is-hidden");
  intro.setAttribute("aria-hidden", "true");
  intro.inert = true;
  hud.hidden = false;
  requestAnimationFrame(() => hud.classList.add("is-on"));
  if (sfx.on) sfx.set(true);
  canvas.focus({ preventScroll: true });
  updateHud();
  announce();
  dirty = true;   // the minimap couldn't draw while the HUD was hidden
}

/* ───────────────────────── 10. boot ───────────────────────── */
async function boot() {
  const [first, ...rest] = ARTIST.split(/\s+/);
  $("#intro-first").textContent = first;
  $("#intro-last").textContent = rest.join(" ");
  if (DATA.eyebrow) $("#intro-eyebrow").textContent = String(DATA.eyebrow).toUpperCase();
  if (DATA.subtitle) $("#intro-sub").textContent = DATA.subtitle;
  $("#viewed").textContent = `${viewedCount()}/${PIECES.length}`;
  sfx.ui();

  let glError = null;
  try { initRenderer(); } catch (err) { glError = err; console.error(err); }
  await fontsReady();
  ARTS = await loadArt(n => { enterLabel.textContent = `Hanging pieces ${n}/${PIECES.length}`; });
  $("#intro-index").disabled = !PIECES.length;

  if (glError) {
    enterLabel.textContent = "3D view unavailable";
    $("#intro-note").textContent = "This browser couldn't start the 3D hallway, but every piece is in the list view.";
    return;
  }
  buildScene();
  resize();
  teleport(hall.start.x, hall.start.y, hall.start.dir);
  glReady = true;
  requestAnimationFrame(frame);
  enterBtn.disabled = false;
  enterLabel.textContent = "Enter the gallery";
  enterBtn.focus({ preventScroll: true });
}
boot();
