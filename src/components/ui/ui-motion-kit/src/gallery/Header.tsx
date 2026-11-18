import { useEffect, useState } from "react";
import { usePlayback } from "@/engine/playhead";
import { Button } from "@/ui/Button";
import { Link } from "./router";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <Button
      variant="ghost"
      aria-pressed={theme === "dark"}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        try {
          localStorage.setItem("mk-theme", next);
        } catch {
          // Storage can be blocked; the toggle still works for this visit.
        }
        setTheme(next);
      }}
    >
      Dark theme
    </Button>
  );
}

export function PauseAll() {
  const { paused, setPaused } = usePlayback();
  return (
    <Button variant="secondary" onClick={() => setPaused(!paused)} data-testid="pause-all">
      {paused ? "Play animations" : "Pause animations"}
    </Button>
  );
}

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-6 sm:px-8 sm:pt-8">
      <nav aria-label="Site" className="flex items-center gap-5">
        <Link href="/" className="rounded-control text-[17px] font-semibold tracking-[-0.01em] whitespace-nowrap text-ink no-underline">
          UI Motion Kit
        </Link>
        <Link href="/templates" className="rounded-control text-[15px] font-medium whitespace-nowrap text-muted no-underline hover:text-ink">
          Templates
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <PauseAll />
        <ThemeToggle />
      </div>
    </header>
  );
}
