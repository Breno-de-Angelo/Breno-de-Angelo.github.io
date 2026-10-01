// Media slots: <figure class="slot" data-media="media/name"> picks up
// media/name.{mp4,webm,jpg,jpeg,png,webp} if present, else shows a placeholder.
// Videos autoplay muted on loop; an optional media/name-poster.jpg is used as poster.
// Needs to be served over HTTP (python3 -m http.server, GitHub Pages, ...) for video detection.
const VIDEO_EXT = ["mp4", "webm"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];

async function exists(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return null; // fetch unavailable (e.g. opened via file://)
  }
}

function imageLoads(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Play/pause button plus a seekable progress bar. `toggle` loads and
// plays/pauses the video; returns { sync } to refresh the button state.
function addVideoControls(slot, v, toggle) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "vc-toggle";
  const bar = document.createElement("div");
  bar.className = "vc-bar";
  bar.setAttribute("role", "slider");
  bar.setAttribute("aria-label", "Video position");
  bar.tabIndex = 0;
  const fill = document.createElement("div");
  fill.className = "vc-fill";
  bar.appendChild(fill);
  slot.append(btn, bar);

  const sync = () => {
    const playing = !v.paused;
    btn.textContent = playing ? "❚❚" : "▶";
    btn.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    slot.classList.toggle("is-paused", !playing);
  };
  let raf = 0;
  const tick = () => {
    if (v.duration) {
      const p = v.currentTime / v.duration;
      fill.style.transform = `scaleX(${p})`;
      bar.setAttribute("aria-valuenow", Math.round(p * 100));
    }
    raf = v.paused ? 0 : requestAnimationFrame(tick);
  };
  v.addEventListener("play", () => { sync(); if (!raf) raf = requestAnimationFrame(tick); });
  v.addEventListener("pause", () => { sync(); tick(); });
  v.addEventListener("seeked", tick);

  btn.addEventListener("click", toggle);
  v.addEventListener("click", toggle);

  const seekTo = async p => {
    if (!v.duration) {
      if (!v.currentSrc) toggle();
      await new Promise(r => v.addEventListener("loadedmetadata", r, { once: true }));
    }
    v.currentTime = Math.min(Math.max(p, 0), 0.999) * v.duration;
  };
  const fromEvent = e => {
    const r = bar.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  };
  bar.addEventListener("pointerdown", e => {
    bar.setPointerCapture(e.pointerId);
    seekTo(fromEvent(e));
    const move = ev => seekTo(fromEvent(ev));
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", () => bar.removeEventListener("pointermove", move), { once: true });
  });
  bar.addEventListener("keydown", e => {
    if (!v.duration) return;
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step) { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime + step); }
  });

  sync();
  return { sync };
}

async function fillSlot(slot) {
  const base = slot.dataset.media;
  const alt = slot.dataset.label || "";
  for (const ext of VIDEO_EXT) {
    if (await exists(`${base}.${ext}`)) {
      const v = document.createElement("video");
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: "none" });
      v.setAttribute("aria-label", alt);
      if (await exists(`${base}-poster.jpg`)) v.poster = `${base}-poster.jpg`;
      slot.appendChild(v);
      const src = `${base}.${ext}`;
      // Autoplay unless the visitor paused it or prefers reduced motion.
      let userPaused = REDUCED_MOTION;
      const ui = addVideoControls(slot, v, () => {
        if (!v.src) v.src = src;
        userPaused = !v.paused;
        userPaused ? v.pause() : v.play().catch(() => {});
      });
      // Only fetch and play while on screen.
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          if (!v.src && !userPaused) v.src = src;
          if (!userPaused) v.play().catch(() => {});
        } else {
          v.pause();
        }
        ui.sync();
      }, { rootMargin: "200px" }).observe(slot);
      return;
    }
  }
  for (const ext of IMAGE_EXT) {
    const url = `${base}.${ext}`;
    const ok = await exists(url);
    if (ok || (ok === null && await imageLoads(url))) {
      const img = new Image();
      Object.assign(img, { src: url, alt, loading: "lazy" });
      slot.appendChild(img);
      return;
    }
  }
  slot.classList.add("empty");
}

// Slots with data-youtube get a button that swaps the preview for the full
// video. The player is only loaded on click (privacy-enhanced domain).
function addYouTube(slot) {
  const id = slot.dataset.youtube;
  if (!id) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "yt-play";
  btn.textContent = `▶ ${slot.dataset.youtubeLabel || "Watch on YouTube"}`;
  btn.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    f.title = slot.dataset.label || "YouTube video";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    slot.replaceChildren(f);
    slot.classList.remove("empty");
  });
  slot.appendChild(btn);
}

// Show placeholders for missing media only in local previews; hide them live.
if (["localhost", "127.0.0.1", ""].includes(location.hostname)) {
  document.documentElement.classList.add("dev");
}

document.querySelectorAll(".slot[data-media]").forEach(s => fillSlot(s).then(() => addYouTube(s)));

// Theme toggle (remembered per browser).
const root = document.documentElement;
try {
  const saved = localStorage.getItem("theme");
  if (saved) root.dataset.theme = saved;
} catch {}
document.querySelector(".theme-toggle").addEventListener("click", () => {
  const dark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});
