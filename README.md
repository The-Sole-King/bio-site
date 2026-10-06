# bio-site

Personal bio website for **Rushd AlAshqar** — Honors Computer Science student at Western University.

Built with [Next.js](https://nextjs.org) (App Router, static export) and [Tailwind CSS](https://tailwindcss.com) v4. Clean, modern dark theme.

## Sections

- **Hero** — name, role, and short intro
- **About** — background and skills
- **Projects** — card grid of featured work
- **Links & Contact** — ways to get in touch
- **Sign Reader** (`/sign`) — reads ASL fingerspelling from the webcam (see below)

## Sign Reader

A sign-language reader that runs entirely in the browser; no video leaves the device.

1. **Hand tracking**: [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) finds 21 3-D landmarks on the hand in each webcam frame.
2. **Features**: landmarks are re-centred on the wrist, scaled by palm size, and mirrored for left hands, so position, distance and handedness don't matter but hand orientation does.
3. **Classifier**: a k-nearest-neighbours model compares the pose against samples *you* record per letter (A–Z, plus optional ␣/⌫ gestures). Samples are saved in `localStorage` and can be exported or imported as JSON.
4. **Debouncing**: a letter is typed once it has been held for 0.6 s. Lowering the hand re-arms it for double letters; keeping it lowered for 1.5 s adds a space. The transcript can be read aloud.

Logic lives in [`app/sign/lib/reader.mjs`](app/sign/lib/reader.mjs) and is unit-tested with `npm test`. The UI is [`app/sign/SignReader.jsx`](app/sign/SignReader.jsx). The MediaPipe WASM runtime is copied from `node_modules` into `public/mediapipe/` automatically before `dev`/`build`; the hand model is fetched from Google's model storage at runtime.

**Limitations:** it recognizes static handshapes only. J and Z (which involve motion) are matched by their final pose, and full ASL vocabulary, which depends on movement, facial expression and two hands, isn't covered.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Building a static site

```bash
npm run build
```

Outputs a fully static site to `out/`, deployable to any static host (GitHub Pages, Netlify, Vercel, etc.).

## Editing content

All content lives in [`app/data.js`](app/data.js) — edit that one file to update the hero, about, projects, and links. Theme colors are defined as tokens in [`app/globals.css`](app/globals.css).
