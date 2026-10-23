/*
  NOW PLAYING

  Shows the song you're listening to right now, using Last.fm.
  1. Connect your music app to Last.fm so it "scrobbles" what you play.
  2. Get a free API key at https://www.last.fm/api/account/create
     (it can only read public data, so it's safe for it to be public here).
  3. Fill in your username and key below.

  To hide your listening at any time, turn on Last.fm Settings > Privacy >
  "Hide recent listening information". The site then shows "offline".
  Preview with a fake song: conwelld.github.io/?demo#music
*/

const musicConfig = {
  lastfmUser: "bighoss1224",
  lastfmApiKey: "376ccdf655b8a71deb2b0e69c4f9d711",
  enabled: true // false switches the feature off entirely
};

const musicScreen = document.querySelector("#music");
const musicCanvas = musicScreen.querySelector(".music-canvas");
const musicContext = musicCanvas.getContext("2d");
const miniPlayer = document.querySelector(".now-playing");
const modeButtons = [...musicScreen.querySelectorAll("[data-mode]")];
const trackArt = musicScreen.querySelector(".track-art img");
const trackDisc = musicScreen.querySelector(".track-disc");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const demoMode = new URLSearchParams(location.search).has("demo");
const placeholderArt = "2a96cbd8b46e442fc41c2b86b821562f"; // Last.fm's grey star image

let track = null;
let mode = "wave";
let level = 0, time = 0, seed = .5, tempo = 1.8, hue = 200;
let width = 0, height = 0, frame = 0, lastFrame = 0, peaks = [];
const particles = Array.from({length: 46}, () => ({x: Math.random(), y: Math.random(), size: Math.random() * 1.6 + .4, speed: Math.random() * .02 + .006, phase: Math.random() * 6.28}));

const trackKey = song => song ? `${song.artist}\u0000${song.title}` : "";
const hashText = text => ([...text].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0) / 4294967296;
const tint = (shift, alpha, light = 72) => `hsla(${hue + shift}, 92%, ${light}%, ${alpha})`;

async function fetchNowPlaying() {
  if (demoMode) return {title: "Demo Track", artist: "Visualizer Test", album: "Preview mode", art: "", url: ""};
  if (!musicConfig.enabled || !musicConfig.lastfmUser || !musicConfig.lastfmApiKey) return null;
  const params = new URLSearchParams({method: "user.getrecenttracks", user: musicConfig.lastfmUser, api_key: musicConfig.lastfmApiKey, format: "json", limit: "1"});
  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
  if (!response.ok) return null;
  const data = await response.json();
  const latest = [].concat(data.recenttracks?.track ?? [])[0];
  if (latest?.["@attr"]?.nowplaying !== "true") return null;
  const art = [].concat(latest.image ?? []).pop()?.["#text"] ?? "";
  return {
    title: latest.name, artist: latest.artist?.["#text"] ?? latest.artist?.name ?? "", album: latest.album?.["#text"] ?? "",
    art: art.includes(placeholderArt) ? "" : art, url: latest.url ?? ""
  };
}

function showArt(src) {
  trackArt.hidden = !src; trackDisc.hidden = Boolean(src);
  if (src) trackArt.src = src; else trackArt.removeAttribute("src");
}
trackArt.addEventListener("error", () => showArt(""));

function renderTrack(next) {
  if (trackKey(next) === trackKey(track)) return;
  track = next;
  if (track) { seed = hashText(trackKey(track)); tempo = 1.4 + seed * .9; hue = 185 + seed * 85; }
  musicScreen.classList.toggle("is-live", Boolean(track));
  musicScreen.querySelector(".music-state").textContent = track ? "LIVE" : "OFFLINE";
  musicScreen.querySelector(".track-title").textContent = track?.title ?? "Nothing playing right now";
  musicScreen.querySelector(".track-artist").textContent = track?.artist ?? "Signal idle";
  const album = musicScreen.querySelector(".track-album");
  album.textContent = track?.album ?? ""; album.hidden = !track?.album;
  const source = musicScreen.querySelector(".track-source");
  source.hidden = !track?.url; if (track?.url) source.href = track.url;
  showArt(track?.art ?? "");
  miniPlayer.hidden = !track;
  miniPlayer.querySelector("strong").textContent = track ? `${track.title} — ${track.artist}` : "";
  if (track) miniPlayer.setAttribute("aria-label", `Now playing: ${track.title} by ${track.artist}`);
  if (reducedMotion) syncLoop();
}

async function refreshTrack() {
  let next = null;
  try { next = await fetchNowPlaying(); } catch { next = null; }
  renderTrack(next);
}

// Fake spectrum: visitors never receive the audio, so the motion is generated per song.
function bands(count) {
  const beat = Math.pow(1 - ((time * tempo) % 1), 3);
  return Array.from({length: count}, (_, index) => {
    const x = index / count;
    const shape = .18 + .7 * Math.pow(1 - x, .8);
    const wobble = .5 + .5 * Math.sin(index * 1.7 + time * 2.4 + seed * 40) * Math.sin(index * .43 - time * 1.2 + seed * 13);
    return .04 + level * shape * (.2 + .8 * wobble * wobble) * (.7 + .4 * beat * (1 - x));
  });
}

function drawParticles(beat) {
  particles.forEach(particle => {
    const x = (particle.x + time * particle.speed) % 1;
    const y = particle.y + Math.sin(time * .7 + particle.phase) * .02;
    musicContext.fillStyle = tint(30, (.12 + .45 * level) * (.5 + .5 * Math.sin(time * 2 + particle.phase)) * (1 + beat * .6), 85);
    musicContext.fillRect(x * width, y * height, particle.size, particle.size);
  });
}

// PS3/PSP-style flowing ribbons.
function drawWave() {
  const ctx = musicContext;
  ctx.clearRect(0, 0, width, height);
  const beat = Math.pow(1 - ((time * tempo) % 1), 3) * level;
  const mid = height * .5;
  for (let ribbon = 0; ribbon < 5; ribbon++) {
    const amp = height * (.045 + .09 * level) * (1 + .18 * beat) * (1 - ribbon * .12);
    const offset = ribbon * .9 + seed * 9;
    const edge = u => mid + (Math.sin(u * 4.2 + time * .55 + offset) + .55 * Math.sin(u * 9.1 - time * .9 + offset * 1.7)) * amp * Math.sin(Math.PI * (.15 + .7 * u)) + (ribbon - 2) * height * .018;
    const thickness = height * (.03 + .05 * level);
    ctx.beginPath();
    for (let x = 0; x <= width + 8; x += 8) ctx.lineTo(x, edge(x / width));
    for (let x = width + 8; x >= 0; x -= 8) ctx.lineTo(x, edge(x / width) + thickness * (.6 + .4 * Math.sin(x / width * 3 + time + ribbon)));
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, mid - amp * 2, 0, mid + amp * 2);
    fill.addColorStop(0, tint(ribbon * 10, 0)); fill.addColorStop(.5, tint(ribbon * 10, .07 + .09 * level)); fill.addColorStop(1, tint(ribbon * 10, 0));
    ctx.fillStyle = fill; ctx.fill();
    ctx.beginPath();
    for (let x = 0; x <= width + 8; x += 8) ctx.lineTo(x, edge(x / width));
    ctx.strokeStyle = tint(ribbon * 10, .16 + .42 * level - ribbon * .03); ctx.lineWidth = 1; ctx.stroke();
  }
  drawParticles(beat);
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, 0, width, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(.15, "#000"); fade.addColorStop(.85, "#000"); fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade; ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
}

// PS1 CD-player-style shapes that leave fading trails.
function drawScope() {
  const ctx = musicContext;
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0,0,0,.16)"; ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  const values = bands(48);
  const cx = width / 2, cy = height * .46, radius = Math.min(width, height) * .2;
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const angle = i / 96 * Math.PI * 2 + time * (.25 + layer * .12) * (layer % 2 ? -1 : 1);
      const r = radius * (.55 + layer * .25) * (1 + .55 * values[Math.min(47, i < 48 ? i : 96 - i)]);
      ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.strokeStyle = tint(layer * 25, .25 + .45 * level); ctx.lineWidth = 1; ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2 - time * .2, reach = radius * (.9 + 1.4 * values[i * 3]);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * radius * .3, cy + Math.sin(angle) * radius * .3);
    ctx.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
    ctx.strokeStyle = tint(60, .12 + .3 * level); ctx.stroke();
  }
}

// Mirrored bars with falling peak caps and a reflection.
function drawSpectrum() {
  const ctx = musicContext;
  ctx.clearRect(0, 0, width, height);
  const half = width < 600 ? 14 : 24;
  const values = bands(half);
  const bars = [...values.slice().reverse(), ...values];
  if (peaks.length !== bars.length) peaks = bars.slice();
  const span = Math.min(width * .86, 1100), gap = span / bars.length, bar = gap * .62;
  const left = (width - span) / 2 + (gap - bar) / 2, base = height * .52, maxHeight = height * .36;
  const body = ctx.createLinearGradient(0, base - maxHeight, 0, base);
  body.addColorStop(0, tint(45, .95, 78)); body.addColorStop(1, tint(0, .35));
  const mirror = ctx.createLinearGradient(0, base, 0, base + maxHeight * .45);
  mirror.addColorStop(0, tint(0, .16)); mirror.addColorStop(1, tint(0, 0));
  bars.forEach((value, i) => {
    const x = left + i * gap, h = value * maxHeight;
    peaks[i] = Math.max(value, peaks[i] - .006);
    ctx.fillStyle = body; ctx.fillRect(x, base - h, bar, h);
    ctx.fillStyle = mirror; ctx.fillRect(x, base + 4, bar, h * .45);
    ctx.fillStyle = tint(60, .55 + .35 * level, 85); ctx.fillRect(x, base - peaks[i] * maxHeight - 4, bar, 1.5);
  });
  ctx.fillStyle = tint(0, .25); ctx.fillRect(left, base + 1, span - (gap - bar), 1);
}

function drawFrame() {
  if (width && height) ({wave: drawWave, scope: drawScope, spectrum: drawSpectrum})[mode]();
}

function loop(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  level += ((track ? 1 : 0) - level) * Math.min(1, dt * 1.5);
  time += dt * (.35 + .65 * level);
  drawFrame();
  frame = requestAnimationFrame(loop);
}

// Animates only while the Music screen is on screen; reduced-motion visitors get a still frame.
function syncLoop() {
  const visible = !musicScreen.hidden && document.visibilityState === "visible";
  if (reducedMotion) { level = track ? 1 : 0; if (visible) drawFrame(); return; }
  if (visible && !frame) { lastFrame = performance.now(); frame = requestAnimationFrame(loop); }
  if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = musicCanvas.clientWidth; height = musicCanvas.clientHeight;
  musicCanvas.width = Math.round(width * ratio); musicCanvas.height = Math.round(height * ratio);
  musicContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (reducedMotion) drawFrame();
}

function setMode(next) {
  mode = next; peaks = [];
  modeButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
  musicContext.clearRect(0, 0, width, height);
  try { localStorage.setItem("visualizer-mode", mode); } catch {}
  if (reducedMotion) drawFrame();
}

modeButtons.forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
let savedMode = null;
try { savedMode = localStorage.getItem("visualizer-mode"); } catch {}
setMode(modeButtons.some(button => button.dataset.mode === savedMode) ? savedMode : "wave");

new ResizeObserver(resizeCanvas).observe(musicCanvas);
new MutationObserver(syncLoop).observe(musicScreen, {attributes: true, attributeFilter: ["hidden"]});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshTrack();
  syncLoop();
});
window.setInterval(() => { if (document.visibilityState === "visible") refreshTrack(); }, 20000);
refreshTrack();
syncLoop();
