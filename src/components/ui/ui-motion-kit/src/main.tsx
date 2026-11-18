import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlaybackProvider } from "@/engine/playhead";
import { App } from "@/gallery/App";
// Inter, self-hosted (OFL-1.1, font files only): Latin subset, the three weights the kit uses.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@/styles/index.css";

// Apply a saved theme (or ?theme=) before the first paint.
try {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  const saved = fromUrl ?? localStorage.getItem("mk-theme");
  if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
} catch {
  // Storage can be blocked; fall back to the system theme.
}

const root = document.getElementById("root");
if (!root) throw new Error("#root missing in index.html");

createRoot(root).render(
  <StrictMode>
    <PlaybackProvider>
      <App />
    </PlaybackProvider>
  </StrictMode>,
);
