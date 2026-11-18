# UI Motion Kit

50 animated UI patterns as accessible React components: overlays, navigation, forms, feedback, content, buttons and page transitions, each with keyboard support, a reduced-motion path and a looping demo in one gallery app.

Made by HorizonX · Version 1.0.0 · October 2026

## Start here

1. Unzip this folder.
2. Start a local web server inside it:
   - Install the libraries: `npm install` (or `pnpm install`)
   - Start the gallery: `npm run dev`
3. Open the address Vite prints, usually `http://localhost:5173` in your browser.

You need Node.js 22 or newer. `npm run build` writes a static copy of the gallery to `dist/`, and `npm run typecheck` checks the TypeScript types.

## What's inside

- `src/kit/<family>/<slug>/`: one folder per animation. `Component.tsx` is the component to copy, `Demo.tsx` is its looping demo, `meta.ts` holds its notes (use cases, timing, accessibility, libraries) and a few keep their own `timing.ts` or CSS file.
- `src/kit/registry.ts` and `src/kit/types.ts`: pick up every animation folder automatically, so a new folder with the same three files appears in the gallery.
- `src/primitives/`: thin adapters over Base UI and React Aria that give the components their focus, keyboard and dismiss behavior.
- `src/engine/`: the demo timeline and the shared motion tokens (`tokens.ts`: durations and easing curves).
- `src/styles/tokens.css` and `src/styles/index.css`: colors, corners, font and easing as CSS variables for the light and dark themes, mapped to Tailwind classes such as `bg-surface` and `text-muted`.
- `src/wireframe/`: the wireframe pages, browser chrome and cursor the demos are drawn with.
- `src/gallery/`, `src/main.tsx` and `index.html`: the gallery app. `src/ui/Button.tsx` is the shared button.
- `package.json`, `vite.config.ts`, `tsconfig.json`: the project setup.
- `README.md` (this guide), `CREDITS.md` (libraries and their licenses), and `AGENTS.md` plus `CLAUDE.md` (instructions for AI coding agents).

## Page sections

- The gallery at `/` lists all 50 animations by family, each with its looping demo. Add `?theme=dark` to any address for the dark theme.
- Each animation has its own page at `/kit/<slug>` (for example `/kit/modal`): the looping demo, the live component you can try with the mouse and the keyboard, and its notes on when to use it, timing, accessibility and a prompt for AI agents.
- `/templates` shows the wireframe pages (dashboard, feed, landing, mobile, settings) the demos are drawn on.
- **The 50 animations, by folder in `src/kit/`:**
   - Overlays (10): alert-dialog, command-palette, context-menu, drawer, dropdown-menu, hover-card, modal, popover, sheet, tooltip.
   - Navigation (8): accordion, collapsible-sidebar, hamburger-menu, pagination, segmented-control, shrinking-header, sliding-tabs, stepper.
   - Inputs (forms) (8): checkbox-radio, combobox, date-picker, dropzone-upload, floating-label, otp-input, slider, toggle-switch.
   - Feedback (8): empty-state, inline-banner, progress-bar, skeleton, spinner, success-check, toast, validation-shake.
   - Content (8): card-expand, carousel, drag-reorder, filter-shuffle, image-lightbox, infinite-scroll, sortable-table, swipe-delete.
   - Micro-interactions (buttons) (4): button-press, copy-confirm, like-burst, loading-button.
   - Transitions (motion) (4): number-ticker, pull-to-refresh, scroll-reveal, shared-element.

## Make it yours

- **Put one animation in your app:** copy its folder from `src/kit/<family>/<slug>/`, the adapter it imports from `src/primitives/` (if any), `src/ui/Button.tsx` when it uses it, `src/engine/tokens.ts` when it imports it, and the two files in `src/styles/`. Keep the `@/` path alias pointing at your source folder and install the libraries its imports name (`motion`, `@base-ui/react` or `react-aria-components`). The `Playground` function at the end of each `Component.tsx` is a complete usage example; `Demo.tsx` and `meta.ts` are only for the gallery.
- **Colors, corners and font:** edit the variables in `src/styles/tokens.css`; there is a light block and a dark block. Every color in the kit reads from them.
- **Text and content:** change the labels and items inside each `Playground`, or pass your own when you use the component.
- **Ask an AI agent for a pattern by name:** each animation page shows a ready prompt, and the folder names (for example "animated command palette" or "animated toast") work as plain requests.

## Motion

- Shared durations and easing curves live in `src/engine/tokens.ts`, and the easing curves are repeated as `--mk-ease-*` variables in `src/styles/tokens.css`; keep both in sync.
- A value that only one animation uses (including the springs some of them use for dragging) sits in that animation's own `timing.ts` or next to its transition, and its page lists every phase with its duration and easing.
- Enter transitions run 180 to 260 ms with an ease-out curve and exits 120 to 180 ms with an ease-in curve.
- With reduced motion turned on in the operating system, every component changes state without movement and stays fully usable.

## Deploy

- This folder is a library of components with a gallery app. To ship an animation, add it to your own app (see "Make it yours").
- To put the gallery itself online, run `npm run build` and upload the `dist/` folder to any static host that serves `index.html` for unknown paths (the gallery uses client-side routes), such as Cloudflare Pages, Netlify or Vercel.

## Keep building with AI

Open this folder in an AI coding agent such as Claude Code or Codex and ask in plain words. The folder includes `AGENTS.md` (and a `CLAUDE.md` that points to it), so Codex, Claude Code, Cursor and other agents learn how the project is built and how to check their work before they change anything. Some examples:

- "Read README.md and index.html, then change the brand colors to my palette: …"
- "Replace the copy with content for my studio. Keep the layout and the animations."
- "Port this page to Vue 3 or Svelte 5 without changing how it looks or moves."

To add more HorizonX components to the page from your agent, connect the HorizonX MCP server (included in your membership): https://horizonx.so/mcp

## License

Your HorizonX membership gives you a commercial license for this template: use it and adapt it in personal, client and commercial projects. You may not resell, redistribute, sublicense or publicly share the original source files. Full terms: https://horizonx.so/terms.
Libraries and images are listed with their own licenses in `CREDITS.md`. Fonts are not covered by the HorizonX license: if you change them, use fonts you own or have a license for.

## Need help?

Write to support@horizonx.so and mention **UI Motion Kit**.
