# Mermaid Sky Exporter

Mermaid Sky Exporter is a Next.js app for rendering Mermaid diagrams in the browser and exporting them as SVG, PNG, or JPG. It supports Monaco and CodeMirror editor switching, URL-based sharing, a mobile-safe toolbar layout, installable PWA behavior, and a lightweight offline app shell for core assets.

![Mermaid Sky Exporter homepage](public/homepage.png)

## Features

- Real-time Mermaid rendering with auto-fit preview
- Monaco / CodeMirror editor switching
- SVG / PNG / JPG export with aspect presets
- URL-encoded share links
- Native share on supported mobile browsers with copy-link fallback elsewhere
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
- Caching is limited to the core same-origin app shell and static assets to minimize impact on normal web deployment.
- Android/Chromium browsers show an Install button only when the browser exposes an install prompt.
- iOS/iPadOS Safari falls back to guidance for using Safari's "Add to Home Screen" action.
- Offline support is limited to revisiting the already loaded app shell; user diagram state is not persisted separately for offline recovery.
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
