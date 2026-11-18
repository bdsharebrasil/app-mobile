# AGENTS.md — UI Motion Kit

Instructions for AI coding agents (Codex, Claude Code, Cursor and others) working in this folder. The person you are working with always has the final say: when their request and these notes disagree, follow them.

## Project

50 animated UI patterns as accessible React components: overlays, navigation, forms, feedback, content, buttons and page transitions, each with keyboard support, a reduced-motion path and a looping demo in one gallery app.

- Stack: React 19 and TypeScript, styled with Tailwind CSS 4, animated with Motion 14 (`motion/react`) and CSS transitions, behavior from Base UI and React Aria, built with Vite 8
- `README.md` is the buyer guide. `CREDITS.md` lists every library and image with its license. `LICENSE.md` (when present) is the HorizonX license.

## Run it

   - Install the libraries: `npm install` (or `pnpm install`)
   - Start the gallery: `npm run dev`

Then open the address Vite prints, usually `http://localhost:5173`.

## Where things are

- `src/kit/<family>/<slug>/`: one folder per animation. `Component.tsx` is the component to copy, `Demo.tsx` is its looping demo, `meta.ts` holds its notes (use cases, timing, accessibility, libraries) and a few keep their own `timing.ts` or CSS file.
- `src/kit/registry.ts` and `src/kit/types.ts`: pick up every animation folder automatically, so a new folder with the same three files appears in the gallery.
- `src/primitives/`: thin adapters over Base UI and React Aria that give the components their focus, keyboard and dismiss behavior.
- `src/engine/`: the demo timeline and the shared motion tokens (`tokens.ts`: durations and easing curves).
- `src/styles/tokens.css` and `src/styles/index.css`: colors, corners, font and easing as CSS variables for the light and dark themes, mapped to Tailwind classes such as `bg-surface` and `text-muted`.
- `src/wireframe/`: the wireframe pages, browser chrome and cursor the demos are drawn with.
- `src/gallery/`, `src/main.tsx` and `index.html`: the gallery app. `src/ui/Button.tsx` is the shared button.
- `package.json`, `vite.config.ts`, `tsconfig.json`: the project setup.
- `README.md` (this guide), `CREDITS.md` (libraries and their licenses), and `AGENTS.md` plus `CLAUDE.md` (instructions for AI coding agents).

## How to change things

- **Put one animation in your app:** copy its folder from `src/kit/<family>/<slug>/`, the adapter it imports from `src/primitives/` (if any), `src/ui/Button.tsx` when it uses it, `src/engine/tokens.ts` when it imports it, and the two files in `src/styles/`. Keep the `@/` path alias pointing at your source folder and install the libraries its imports name (`motion`, `@base-ui/react` or `react-aria-components`). The `Playground` function at the end of each `Component.tsx` is a complete usage example; `Demo.tsx` and `meta.ts` are only for the gallery.
- **Colors, corners and font:** edit the variables in `src/styles/tokens.css`; there is a light block and a dark block. Every color in the kit reads from them.
- **Text and content:** change the labels and items inside each `Playground`, or pass your own when you use the component.
- **Ask an AI agent for a pattern by name:** each animation page shows a ready prompt, and the folder names (for example "animated command palette" or "animated toast") work as plain requests.

## Motion

- Shared durations and easing curves live in `src/engine/tokens.ts`, and the easing curves are repeated as `--mk-ease-*` variables in `src/styles/tokens.css`; keep both in sync.
- A value that only one animation uses (including the springs some of them use for dragging) sits in that animation's own `timing.ts` or next to its transition, and its page lists every phase with its duration and easing.
- Enter transitions run 180 to 260 ms with an ease-out curve and exits 120 to 180 ms with an ease-in curve.
- With reduced motion turned on in the operating system, every component changes state without movement and stays fully usable.

## Rules for this project

- Each animation lives in `src/kit/<family>/<slug>/Component.tsx`. Keep its exported names and props working; `Playground` shows how they fit together.
- Focus handling, keyboard support and dismissal come from the adapters in `src/primitives/`. Build on them instead of rewriting that behavior.
- Colors come from the CSS variables in `src/styles/tokens.css` through Tailwind classes. Use those classes or variables instead of hard-coded colors, and check both the light and the dark theme.
- Shared durations and easing curves come from `src/engine/tokens.ts` and the `--mk-ease-*` variables in `src/styles/tokens.css`. Reuse them, and keep a value that only one animation needs in that animation's folder.
- A new animation is a new folder `src/kit/<family>/<slug>/` with `meta.ts`, `Demo.tsx` and `Component.tsx`; the registry finds it, and `meta.slug` and `meta.family` must match the folder names.
- Before you finish, run `npm run typecheck` and `npm run build`; both must pass.
- Keep the current look and motion unless the user asks to change them. Before a large change, say what you plan to do.
- Every animation you add or change must keep working with `prefers-reduced-motion` and when its script fails to load.
- Fonts are not covered by the HorizonX license. If the user changes the fonts, use ones they own or have a license for, and never download font files they did not provide.
- When you add a library, font or image, add it to `CREDITS.md` with its version and license.
- Do not add analytics, tracking or other third-party scripts unless the user asks for them.

## Check your work

1. Serve the folder and open every section of the page.
2. Make sure the browser console shows no errors and no file returns 404.
3. Check the layout at 390 px and 1440 px wide.
4. Turn on reduced motion in the operating system and check that the content still appears.

## License

The template is licensed to its owner through their HorizonX membership. Building and shipping sites from it is allowed; publishing or reselling the source files as a template is not. Terms: https://horizonx.so/terms
