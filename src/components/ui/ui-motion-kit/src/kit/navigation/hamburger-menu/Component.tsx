import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DialogBackdrop, DialogClose, DialogPopup, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from "@/primitives/dialog";
import { EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";

/**
 * Hamburger menu: a compact trigger that opens a temporary, modal navigation panel.
 *
 * Behavior comes from the dialog primitive (src/primitives/dialog.tsx, Base UI): a named dialog
 * (aria-modal) holding a named nav landmark with ordinary links, never role="menu". Focus moves
 * into the panel, Tab is trapped, the rest of the page is inert and does not scroll. Escape or the
 * close button returns focus to the trigger; choosing a destination focuses the new page heading.
 * The trigger is named "Open navigation" and the close button, drawn in the same spot, "Close
 * navigation"; both expose aria-expanded and point at the panel with aria-controls.
 * Motion: the panel drops 12 px from under the header in 240 ms ease-out, the three link groups
 * start 20 ms apart, the icon strokes turn into an X in 200 ms; it lifts away in 180 ms ease-in.
 * No spring. Reduced motion: everything changes in 0 ms and the groups appear together.
 */

export const ENTER_MS = 240;
export const EXIT_MS = 180;
export const STAGGER_MS = 20;
export const ICON_MS = 200;
const OUT = [...EASING_POINTS.out] as [number, number, number, number];
const IN = [...EASING_POINTS.in] as [number, number, number, number];

export interface NavLink {
  id: string;
  label: string;
}

export interface NavGroups {
  /** Primary destinations. */
  main: readonly NavLink[];
  /** Secondary destinations, after a divider. */
  more: readonly NavLink[];
  /** One call-to-action destination, drawn as a filled button. */
  action: NavLink;
}

/** Three strokes; with `x` the outer two rotate onto the centre and the middle one fades. */
function MenuIcon({ x, animate, reduced }: { x: boolean; animate: boolean; reduced: boolean }) {
  const t = { duration: reduced || !animate ? 0 : ICON_MS / 1000, ease: x ? OUT : IN };
  const stroke = "absolute left-[3px] h-[2px] w-[14px] rounded-[1px] bg-current";
  return (
    <span aria-hidden="true" className="relative block size-5">
      <motion.span className={`${stroke} top-[4px]`} initial={false} animate={{ y: x ? 5 : 0, rotate: x ? 45 : 0, transition: t }} />
      <motion.span className={`${stroke} top-[9px]`} initial={false} animate={{ opacity: x ? 0 : 1, transition: t }} />
      <motion.span className={`${stroke} top-[14px]`} initial={false} animate={{ y: x ? -5 : 0, rotate: x ? -45 : 0, transition: t }} />
    </span>
  );
}

/** Close button whose icon starts as three strokes and turns into an X once mounted. */
function CloseIcon({ reduced }: { reduced: boolean }) {
  const [x, setX] = useState(false);
  useEffect(() => setX(true), []);
  return <MenuIcon x={x} animate reduced={reduced} />;
}

export function HamburgerMenu({
  groups,
  current,
  onNavigate,
  container,
  heading,
  brand,
}: {
  groups: NavGroups;
  current: string;
  onNavigate(id: string): void;
  /** Element the panel is portaled into; it should be `relative` and clip its content. */
  container: RefObject<HTMLElement | null>;
  /** The page heading that receives focus after a destination is chosen. */
  heading: RefObject<HTMLElement | null>;
  brand: string;
}) {
  const [open, setOpen] = useState(false);
  const navigated = useRef(false);
  const reduced = useReducedMotion() ?? false;
  const panelId = useId();
  const enter = { duration: reduced ? 0 : ENTER_MS / 1000, ease: OUT };
  const exit = { duration: reduced ? 0 : EXIT_MS / 1000, ease: IN };
  const group = (i: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : -8 },
    animate: { opacity: 1, y: 0, transition: { ...enter, delay: reduced ? 0 : (i * STAGGER_MS) / 1000 } },
    exit: { opacity: 0, transition: exit },
  });
  const go = (id: string) => {
    navigated.current = true;
    onNavigate(id);
    setOpen(false);
  };
  const link = "flex min-h-11 items-center rounded-control px-3 text-[16px] font-medium text-ink no-underline hover:bg-sunken aria-[current=page]:bg-sunken aria-[current=page]:font-semibold";

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (next) navigated.current = false;
        setOpen(next);
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <span className="text-[15px] font-semibold text-ink">{brand}</span>
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Open navigation" aria-expanded={open} aria-controls={open ? panelId : undefined} className="-mr-2" data-testid="menu-open">
              <MenuIcon x={false} animate={false} reduced={reduced} />
            </Button>
          }
        />
      </div>
      <AnimatePresence>
        {open ? (
          <DialogPortal keepMounted container={container}>
            <DialogBackdrop
              render={
                <motion.div
                  data-menu-backdrop
                  className="absolute inset-0 z-40 bg-[var(--mk-scrim)]"
                  initial={{ opacity: reduced ? 1 : 0 }}
                  animate={{ opacity: 1, transition: enter }}
                  exit={{ opacity: reduced ? 1 : 0, transition: exit }}
                />
              }
            />
            <DialogPopup
              id={panelId}
              aria-modal="true"
              data-testid="menu-panel"
              finalFocus={() => (navigated.current ? heading.current : true)}
              render={
                <motion.div
                  className="absolute inset-x-0 top-0 z-50 flex max-h-full flex-col overflow-hidden rounded-b-overlay bg-surface text-ink shadow-[var(--mk-shadow-overlay)] outline-none"
                  initial={{ opacity: 0, y: reduced ? 0 : -12 }}
                  animate={{ opacity: 1, y: 0, transition: enter }}
                  exit={{ opacity: 0, y: reduced ? 0 : -12, transition: exit }}
                />
              }
            >
              <DialogTitle className="sr-only-kit">Navigation</DialogTitle>
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
                <span className="text-[15px] font-semibold text-ink">{brand}</span>
                <DialogClose
                  render={
                    <Button variant="ghost" size="icon" aria-label="Close navigation" aria-expanded="true" aria-controls={panelId} className="-mr-2" data-testid="menu-close">
                      <CloseIcon reduced={reduced} />
                    </Button>
                  }
                />
              </div>
              <nav aria-label="Primary" className="min-h-0 overflow-y-auto p-3">
                <motion.ul className="m-0 flex list-none flex-col gap-0.5 p-0" {...group(0)}>
                  {groups.main.map((l) => (
                    <li key={l.id}>
                      <a
                        href={`#${l.id}`}
                        aria-current={l.id === current ? "page" : undefined}
                        className={link}
                        onClick={(e) => {
                          e.preventDefault();
                          go(l.id);
                        }}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </motion.ul>
                <motion.ul className="m-0 mt-2 flex list-none flex-col gap-0.5 border-t border-line p-0 pt-2" {...group(1)}>
                  {groups.more.map((l) => (
                    <li key={l.id}>
                      <a
                        href={`#${l.id}`}
                        aria-current={l.id === current ? "page" : undefined}
                        className={`${link} text-[15px] font-normal`}
                        onClick={(e) => {
                          e.preventDefault();
                          go(l.id);
                        }}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </motion.ul>
                <motion.div className="mt-3" {...group(2)}>
                  <a
                    href={`#${groups.action.id}`}
                    aria-current={groups.action.id === current ? "page" : undefined}
                    className="flex h-11 items-center justify-center rounded-control bg-accent px-4 text-[15px] font-medium text-accent-fg no-underline"
                    onClick={(e) => {
                      e.preventDefault();
                      go(groups.action.id);
                    }}
                  >
                    {groups.action.label}
                  </a>
                </motion.div>
              </nav>
            </DialogPopup>
          </DialogPortal>
        ) : null}
      </AnimatePresence>
    </DialogRoot>
  );
}

const GROUPS: NavGroups = {
  main: [
    { id: "home", label: "Home" },
    { id: "products", label: "Products" },
    { id: "pricing", label: "Pricing" },
  ],
  more: [
    { id: "docs", label: "Docs" },
    { id: "changelog", label: "Changelog" },
  ],
  action: { id: "sign-in", label: "Sign in" },
};
const ALL = [...GROUPS.main, ...GROUPS.more, GROUPS.action];
const COPY: Record<string, string> = {
  home: "Everything new this week, in one place.",
  products: "Four tools that share one account.",
  pricing: "Plans for one person or the whole team.",
  docs: "Guides, references and examples.",
  changelog: "What shipped, newest first.",
  "sign-in": "Use your work email to continue.",
};

/**
 * Live example for /kit/hamburger-menu: a phone-width page with the menu in its header. The panel
 * is portaled into the frame so it covers the frame, not the whole kit page.
 */
export function Playground() {
  const [current, setCurrent] = useState("home");
  const frame = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const page = ALL.find((l) => l.id === current)!;
  return (
    <div
      ref={frame}
      data-testid="hamburger-menu-playground"
      className="relative flex h-[420px] w-full max-w-[320px] min-w-0 flex-col overflow-hidden rounded-overlay border border-line bg-surface"
    >
      <HamburgerMenu groups={GROUPS} current={current} onNavigate={setCurrent} container={frame} heading={heading} brand="Northwind" />
      <div data-page className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <h3 ref={heading} tabIndex={-1} className="m-0 text-[20px] font-semibold text-ink outline-offset-2">
          {page.label}
        </h3>
        <p className="m-0 text-[15px] text-muted">{COPY[current]}</p>
      </div>
    </div>
  );
}
