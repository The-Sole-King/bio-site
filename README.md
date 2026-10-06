# bio-site

Personal bio website for **Rushd AlAshqar** — Honors Computer Science student at Western University.

Built with [Next.js](https://nextjs.org) (App Router, static export) and [Tailwind CSS](https://tailwindcss.com) v4. Clean, modern dark theme.

## Sections

- **Hero** — name, role, and short intro
- **About** — background and skills
- **Projects** — card grid of featured work
- **Links & Contact** — ways to get in touch

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

## Sign Reader

[`sign-reader/`](sign-reader/) is a separate desktop program (Python, OpenCV + MediaPipe) that reads ASL fingerspelling from the webcam. See its [README](sign-reader/README.md).
