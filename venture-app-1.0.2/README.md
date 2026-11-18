# Venture Travel Booking App

A Figma travel app concept grouped in a dedicated Venture section with a cover and three presentation layouts.

Made by HorizonX · Version 1.0.2 · October 2026

## Start here

1. Open Figma in your browser or in the desktop app. A free Figma account is enough.
2. Go to **Drafts**, click **Import** and choose `Venture App.fig` from this folder. You can also drag the file onto the Figma window.
3. Sort out the fonts before you edit any text (see **Fonts**), so Figma does not swap them for a default.

## What's inside

- `Venture App.fig`: one Figma file with a single page, `Venture App`, that holds only this product.
- The page holds the `Venture App` section: `Cover` at 1504 × 1128 px, three presentation boards (`Slide`, `Slide` and `Slide 2`) at 1504 × 1128 px, and the phone screens `Venture Splash`, `Venture Registration`, `Venture Dashboard`, `Venture Feature` and `Venture Settings` at 402 × 874 px (the last two are 875 px high).
- Everything on the page is editable: frames, live text and vector layers.

## Fonts

Fonts are not included with this file and are not covered by the HorizonX license. Use fonts you own or have a license for: install the ones the design uses, or replace them with your own. Figma lists any font you do not have under **Missing fonts** in the top toolbar, and you can swap it there in one step.

## Make it yours

- **Text:** double-click any text layer and type.
- **Colors:** select a layer and change its fill in the right panel. To change one color everywhere at once, select a layer that uses it and choose **Edit → Select all with same fill**.
- **Images:** select an image layer, open the **Fill** section and click the image to replace it with your own.
- **Layouts:** edit the phone screens inside `Venture App`; the cover and wide boards only present them.

## Turn it into code with AI

You can turn this design into a working app or website with an AI coding agent such as Claude Code or Codex. The full step-by-step guide lives here: https://horizonx.so/docs#guide-figma-to-code

This folder also includes `AGENTS.md` and `CLAUDE.md`. If you start your project in this folder, Codex, Claude Code, Cursor and other agents read them automatically and follow the notes about this design.

### Option A: let the agent read Figma directly (recommended)

1. Import the file into your Figma account (see **Start here**).
2. Connect the official Figma MCP server to your agent once:
   - Claude Code: `claude mcp add --transport http figma https://mcp.figma.com/mcp`, then type `/mcp` inside Claude Code and log in to Figma.
   - Codex CLI: `codex mcp add figma --url https://mcp.figma.com/mcp`, then log in to Figma when it asks.
3. In Figma, right-click the frame you want to build and choose **Copy/Paste as → Copy link to selection**.
4. Paste that link into your agent together with the prompt below.

Figma limits how many times an agent can read your files per day, depending on your Figma plan and seat. Current limits: https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/

### Option B: work from images

1. Select a frame, open **Export** in the right panel, choose **PNG** at **2x** and export it.
2. Give the image to your agent together with the prompt below.

This route is less precise, because the agent has to guess exact sizes and colors from pixels.

### Prompt you can copy

```text
Build this design as a mobile app UI (or a responsive web app).
Design: <paste the Figma link or attach the exported images>

1. Read the design first: layout, colors, typography, spacing, corner radii
   and a screenshot. Do not write code yet. If a value does not come from the
   design, ask me instead of guessing. If a font from the design is not
   available, ask me which font to use.
2. Put the colors, fonts and spacing in one place (CSS variables or the
   Tailwind theme) with clear names.
3. Build one screen at a time, as reusable components. Stack: React with Tailwind CSS (or tell the agent your own stack, for example React Native or SwiftUI).
4. After each screen, compare your result with the design and list the
   differences before you continue.

About this file: Build the phone screens `Venture Splash`, `Venture Registration`, `Venture Dashboard`, `Venture Feature` and `Venture Settings` at 402 × 874 px (the last two are 875 px high); do not build the cover or presentation boards. `Cover` and the wide boards are presentation layouts; do not build their backgrounds or captions as app screens. The design shows static sample content only; confirm accounts, payments, live data or any extra screens with the user before building them.
```

## License

Your HorizonX membership gives you a commercial license for this file: use it and adapt it in personal, client and commercial projects. You may not resell, redistribute, sublicense or publicly share the original file.
Fonts are not included (see **Fonts**).
Full terms: https://horizonx.so/terms

## Need help?

Write to support@horizonx.so and mention **Venture Travel Booking App**.
