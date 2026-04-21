# Mermaid Sky Exporter

Mermaid Sky Exporter is a Next.js app for rendering Mermaid diagrams in the browser and exporting them as SVG, PNG, or JPG. It supports Monaco and CodeMirror editor switching, URL-based sharing, a mobile-safe toolbar layout, and installable PWA behavior.

![Mermaid Sky Exporter homepage](public/homepage.png)

## Features

- Real-time Mermaid rendering with auto-fit preview
- Monaco / CodeMirror editor switching
- SVG / PNG / JPG export with aspect presets
- URL-encoded share links
- Mobile-friendly top toolbar and export controls
- Installable PWA flow with a basic offline app shell

## Getting Started

```bash
git clone https://github.com/okorion/mermaid-sky-exporter.git
cd mermaid-sky-exporter
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## PWA and Mobile Notes

- `app/manifest.ts` and `public/sw.js` provide the PWA metadata and service worker.
- The service worker registers only in production on a secure context.
- Caching is limited to the same-origin app shell and static assets to minimize impact on normal web deployment.
- The install button appears only when the browser exposes an install prompt. iOS Safari falls back to home-screen instructions.
- Implementation notes: [docs/mobile-pwa.md](docs/mobile-pwa.md)

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Mermaid.js
- Monaco Editor
- CodeMirror

## License

MIT
