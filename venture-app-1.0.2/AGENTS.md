# AGENTS.md — Venture Travel Booking App

Instructions for AI coding agents (Codex, Claude Code, Cursor and others) helping the owner of this file turn the design into code. The person you are working with always has the final say: when their request and these notes disagree, follow them.

## What this folder holds

- `Venture App.fig`: a HorizonX design file for Figma. It is a binary Figma file, not code, and you cannot read it directly. Do not try to unzip or parse it.
- `README.md`: the buyer guide, including how to import the file and connect Figma to an agent.

A Figma travel app concept grouped in a dedicated Venture section with a cover and three presentation layouts.

## About this design

- Build the phone screens `Venture Splash`, `Venture Registration`, `Venture Dashboard`, `Venture Feature` and `Venture Settings` at 402 × 874 px (the last two are 875 px high); do not build the cover or presentation boards.
- `Cover` and the wide boards are presentation layouts; do not build their backgrounds or captions as app screens.
- The design shows static sample content only; confirm accounts, payments, live data or any extra screens with the user before building them.

## How to read the design

1. Use the official Figma MCP server (`https://mcp.figma.com/mcp`). If it is not connected, ask the user to connect it with the command for their agent in `README.md`, then to import the file into their Figma account.
2. Ask the user for a link to the frame to build (in Figma: right-click the frame, **Copy/Paste as → Copy link to selection**).
3. Read that frame with the Figma tools before writing code: its design context, a screenshot and its variables. Read one frame at a time; Figma limits how many reads an account gets per day.
4. If the Figma MCP server is not available, ask the user to export the frame as PNG at 2x and work from the image, and say that sizes and colors will be approximate.

## How to build it

- Default target: a mobile app UI (or a responsive web app). Default stack: React with Tailwind CSS (or tell the agent your own stack, for example React Native or SwiftUI). If the user has their own stack or an existing project, use theirs instead.
- Before you write components, put colors, type styles, spacing and corner radii in one place (CSS variables or the Tailwind theme) with clear names taken from the design.
- Build one screen at a time as reusable components. After each screen, compare your result with the Figma screenshot at the same width and list the differences before you continue.
- Never invent a value the design does not give you. Ask instead.
- Fonts are not included with the design. Use fonts the user owns or has a license for. If a font from the design is not available, ask which font to use. Never download or bundle font files the user did not provide.
- Treat photos and illustrations in the design as placeholders unless the user says they will keep them.
- Use semantic HTML, real text (not images of text), alt text for images, visible keyboard focus and enough color contrast. Any animation you add must respect `prefers-reduced-motion`.

## Done means

- Each screen matches its Figma frame at desktop width and still works at a 390 px wide phone screen.
- The browser console shows no errors.
- You told the user what you could not match and why.

## License

The design is licensed to its owner through their HorizonX membership. Do not publish, upload or share `Venture App.fig` or images exported from it as standalone files. Building websites and apps from it is allowed. Terms: https://horizonx.so/terms
