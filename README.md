# Personal site

Static site (no build step): `index.html`, `style.css`, `main.js`.

## Preview

```bash
python3 -m http.server 8765
```

## Media

Drop files into `media/` using these names. Any of `.mp4 .webm .jpg .jpeg .png .webp` works.
Videos autoplay muted and loop, so keep them short (about 5–20 s, ideally under 10 MB). An optional `<name>-poster.jpg` sets the video's poster frame.
Slots with no file show a dashed placeholder in local previews (localhost) and are hidden on the live site.

| File name    | Where it appears                     |
| ------------ | ------------------------------------ |
| `profile`    | Hero portrait (4:5)                  |
| `genomics`   | AlphaGenome project (ICANN talk, figure) |
| `hercules`   | Hercules forklift                    |
| `prometheus` | Prometheus humanoid / VR teleop      |
| `argos`      | Argos quadruped                      |
| `aumo`       | AUMO                                 |
| `gallery-1..2` | Gallery under About (4:3)         |

All slots except the portrait are 16:10.

## Deploy

Push this folder to a repo named `Breno-de-Angelo.github.io` and GitHub Pages serves it at
https://breno-de-angelo.github.io.
