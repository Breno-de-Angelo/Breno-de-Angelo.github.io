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
      // Only fetch and play while on screen.
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = `${base}.${ext}`;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
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
