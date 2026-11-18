import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Tooltip } from "@/primitives/tooltip";
import { EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";

/**
 * Collapsible sidebar: a persistent navigation panel that narrows to an icon rail.
 *
 * Custom layout plus Base UI Tooltip. A named <nav> with real links (aria-current="page" on the
 * current one); the visible labels fade out when collapsed but stay in each link's accessible
 * name. The toggle keeps one name ("Sidebar") and reports its state with aria-expanded, pointing at
 * the nav with aria-controls. Ctrl+B (Cmd+B on Mac, configurable) toggles it, except while typing
 * in a field. The choice is saved and restored on load without moving focus.
 * Collapsed rail links show their name in a tooltip on hover or keyboard focus after 300 ms; the
 * tooltip is visual only and never the link's name.
 * Motion: the width expands in 240 ms ease-out and collapses in 180 ms ease-in, labels fading with
 * the same curves; the tooltip fades in 180 ms ease-out with 4 px travel and out in 120 ms ease-in.
 * Reduced motion: width and labels change in 0 ms; the tooltip keeps its delay and appears without
 * travel.
 */

export const ENTER_MS = 240;
export const EXIT_MS = 180;
const TIP_IN_MS = 180;
const TIP_OUT_MS = 120;
const TIP_DELAY_MS = 300;
const OUT = [...EASING_POINTS.out] as [number, number, number, number];
const IN = [...EASING_POINTS.in] as [number, number, number, number];

export interface SidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
}

/** Restores the saved state on first render (no animation, no focus change) and saves every change. */
function useStoredFlag(key: string | undefined, fallback: boolean) {
  const [value, setValue] = useState(() => {
    if (!key) return fallback;
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : saved === "1";
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Storage unavailable (private mode): the state simply is not remembered.
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** True while focus or the event target is somewhere people type. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || !!el.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])"));
}

/** Name of the hovered or focused rail link, shown only while the rail is collapsed. */
function RailTip({ text, enabled, children }: { text: string; enabled: boolean; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduced = useReducedMotion() ?? false;
  const clear = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!enabled) {
      clear();
      setOpen(false);
    }
  }, [enabled]);
  const shown = enabled && open;
  return (
    <Tooltip.Root
      disabled={!enabled}
      open={shown}
      onOpenChange={(next, details) => {
        clear();
        // Keyboard focus waits for the same delay as hover.
        if (next && details.reason === "trigger-focus") timer.current = setTimeout(() => setOpen(true), TIP_DELAY_MS);
        else setOpen(next);
      }}
    >
      <Tooltip.Trigger
        delay={TIP_DELAY_MS}
        closeDelay={0}
        onBlur={() => {
          clear();
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            clear();
            setOpen(false);
          }
        }}
        render={children}
      />
      <AnimatePresence>
        {shown ? (
          <Tooltip.Portal keepMounted>
            <Tooltip.Positioner side="right" sideOffset={16} collisionPadding={12} className="z-50">
              <Tooltip.Popup
                role="tooltip"
                data-testid="rail-tooltip"
                render={
                  <motion.div
                    className="rounded-control bg-accent px-3 py-1.5 text-sm leading-normal whitespace-nowrap text-accent-fg shadow-[var(--mk-shadow-overlay)]"
                    initial={{ opacity: 0, x: reduced ? 0 : -4 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: reduced ? 0 : TIP_IN_MS / 1000, ease: OUT } }}
                    exit={{ opacity: 0, x: reduced ? 0 : -4, transition: { duration: reduced ? 0 : TIP_OUT_MS / 1000, ease: IN } }}
                  />
                }
              >
                {text}
                <Tooltip.Arrow className="absolute size-2 rotate-45 bg-accent data-[side=right]:-left-1" />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        ) : null}
      </AnimatePresence>
    </Tooltip.Root>
  );
}

function ToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.25" />
      <path d="M7.25 4v12" />
      <path
        d="M13 7.5 10.75 10 13 12.5"
        className={`origin-[11.9px_10px] transition-transform motion-reduce:transition-none ${collapsed ? "rotate-180 duration-180 ease-kit-in" : "duration-240 ease-kit-out"}`}
      />
    </svg>
  );
}

export function CollapsibleSidebar({
  items,
  current,
  onNavigate,
  label = "Main",
  shortcut = "b",
  storageKey,
}: {
  items: readonly SidebarItem[];
  current: string;
  onNavigate(id: string): void;
  label?: string;
  /** Letter used with Ctrl (Cmd on Mac) to toggle the sidebar. */
  shortcut?: string;
  /** localStorage key that remembers the collapsed state; omit to not persist. */
  storageKey?: string;
}) {
  const [collapsed, setCollapsed] = useStoredFlag(storageKey, false);
  const [announce, setAnnounce] = useState("");
  const navId = useId();
  const key = shortcut.toLowerCase();

  const toggle = () => {
    setCollapsed(!collapsed);
    setAnnounce(collapsed ? "Sidebar expanded" : "Sidebar collapsed");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.defaultPrevented) return;
      if (isTyping(e.target)) return;
      e.preventDefault();
      setCollapsed(!collapsed);
      setAnnounce(collapsed ? "Sidebar expanded" : "Sidebar collapsed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, collapsed, setCollapsed]);

  const fade = `transition-opacity motion-reduce:transition-none ${collapsed ? "opacity-0 duration-180 ease-kit-in" : "opacity-100 duration-240 ease-kit-out"}`;
  return (
    <aside
      data-testid="sidebar"
      data-collapsed={collapsed ? "" : undefined}
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-raised transition-[width] motion-reduce:transition-none ${
        collapsed ? "w-15 duration-180 ease-kit-in" : "w-42 duration-240 ease-kit-out"
      }`}
    >
      <nav id={navId} aria-label={label} className="min-h-0 flex-1 p-2">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.map((item) => (
            <li key={item.id}>
              <RailTip text={item.label} enabled={collapsed}>
                <a
                  href={`#${item.id}`}
                  aria-current={item.id === current ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.id);
                  }}
                  className="flex h-10 items-center gap-3 rounded-control px-3.5 text-[14px] font-medium text-ink no-underline hover:bg-sunken pointer-coarse:h-11 aria-[current=page]:bg-accent aria-[current=page]:text-accent-fg"
                >
                  <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center">
                    {item.icon}
                  </span>
                  <span className={`whitespace-nowrap ${fade}`}>{item.label}</span>
                </a>
              </RailTip>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-line p-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sidebar"
          aria-expanded={!collapsed}
          aria-controls={navId}
          aria-keyshortcuts={`Control+${key.toUpperCase()} Meta+${key.toUpperCase()}`}
          onClick={toggle}
        >
          <ToggleIcon collapsed={collapsed} />
        </Button>
      </div>
      <p role="status" className="sr-only-kit">
        {announce}
      </p>
    </aside>
  );
}

const icon = (d: string) => (
  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ITEMS: SidebarItem[] = [
  { id: "overview", label: "Overview", icon: icon("M2.75 2.75h4v4h-4zM9.25 2.75h4v4h-4zM2.75 9.25h4v4h-4zM9.25 9.25h4v4h-4z") },
  { id: "projects", label: "Projects", icon: icon("M2.25 4.5c0-.83.67-1.5 1.5-1.5h2.5l1.5 1.5h4.5c.83 0 1.5.67 1.5 1.5v5.5c0 .83-.67 1.5-1.5 1.5h-8.5c-.83 0-1.5-.67-1.5-1.5z") },
  { id: "reports", label: "Reports", icon: icon("M3.25 13.25v-5M8 13.25v-10M12.75 13.25v-7") },
  { id: "team", label: "Team", icon: icon("M8 7.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zM3.5 13.5c.6-2.3 2.3-3.75 4.5-3.75s3.9 1.45 4.5 3.75") },
  { id: "settings", label: "Settings", icon: icon("M2.5 4.75h3M8.5 4.75h5M2.5 11.25h6M11.5 11.25h2M7 6.25a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM10 12.75a1.5 1.5 0 100-3 1.5 1.5 0 000 3z") },
];

export function Playground() {
  const [current, setCurrent] = useState("overview");
  const fieldId = useId();
  const hintId = useId();
  const page = ITEMS.find((i) => i.id === current)!;
  return (
    <div data-testid="collapsible-sidebar-playground" className="flex h-[300px] w-full max-w-[480px] min-w-0 overflow-hidden rounded-panel border border-line bg-surface">
      <CollapsibleSidebar items={ITEMS} current={current} onNavigate={setCurrent} label="Workspace" storageKey="mk-collapsible-sidebar" />
      <section aria-labelledby={`${fieldId}-h`} className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <h3 id={`${fieldId}-h`} className="m-0 text-[16px] font-semibold text-ink">
          {page.label}
        </h3>
        <div className="flex min-w-0 flex-col">
          <label htmlFor={fieldId} className="text-sm font-medium text-ink">
            Notes
          </label>
          <input
            id={fieldId}
            aria-describedby={hintId}
            autoComplete="off"
            className="mt-1.5 h-10 w-full min-w-0 rounded-control border border-control-line bg-surface px-3 text-[15px] text-ink pointer-coarse:h-11"
          />
        </div>
        <p id={hintId} className="m-0 text-[13px] text-muted">
          Ctrl+B or ⌘B toggles the sidebar, except while typing.
        </p>
      </section>
    </div>
  );
}
