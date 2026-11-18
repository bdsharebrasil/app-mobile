import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASING_POINTS } from "@/engine/tokens";

/**
 * Shrinking header: a sticky page header that becomes compact once the page scrolls past a
 * threshold, and can optionally hide while scrolling down and come back on the way up.
 *
 * Custom semantic markup: a <header> holding the brand link and a named <nav> of ordinary links,
 * preceded by a "Skip to content" link that appears in the flow on focus. The header's full height stays
 * reserved in the layout, so crossing the threshold never moves the content under it, and section
 * headings carry a scroll margin so they land below the header. Crossing the threshold moves no
 * focus and announces nothing. The header never hides while it contains focus, and focusing
 * anything inside it brings it back first.
 * Motion: compact (smaller logo box, 16 px shorter, hairline and shadow in) in 220 ms ease-out, back to
 * full size in 160 ms ease-in; the optional hide lifts it away in 160 ms ease-in and the reveal
 * returns it in 220 ms ease-out. Reduced motion: size and shadow switch in 0 ms and the header
 * never hides.
 */

export const COMPACT_MS = 220;
export const EXPAND_MS = 160;
export const HIDE_MS = 160;
export const REVEAL_MS = 220;
/** Header height in px, expanded and compact; the expanded height is what the layout reserves. */
export const HEIGHT = { tall: 64, compact: 48 } as const;
/** Brand mark size in px, expanded and compact. */
const LOGO = { tall: 28, compact: 22 } as const;
const OUT = [...EASING_POINTS.out] as [number, number, number, number];
const IN = [...EASING_POINTS.in] as [number, number, number, number];
/** Scroll movement (px) ignored when deciding the direction, so small jitters do not hide it. */
const JITTER = 4;

export interface HeaderLink {
  id: string;
  label: string;
}

export function ShrinkingHeader({
  scroller,
  content,
  brand,
  links,
  label = "Site",
  threshold = 24,
  autoHide = false,
  hideAfter = 160,
}: {
  /** The element that scrolls (the page's own scroll container). */
  scroller: RefObject<HTMLElement | null>;
  /** Id of the main content, the skip link's target. */
  content: string;
  brand: string;
  /** In-page destinations: each id names a heading inside the scroller. */
  links: readonly HeaderLink[];
  label?: string;
  /** Scroll offset in px past which the header is compact. */
  threshold?: number;
  /** Hide while scrolling down (past `hideAfter`) and reveal on any scroll up. */
  autoHide?: boolean;
  hideAfter?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const focusInside = useRef(false);
  const header = useRef<HTMLElement>(null);
  const canHide = autoHide && !reduced;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let last = el.scrollTop;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = el.scrollTop;
      setCompact(y > threshold);
      if (!canHide || y <= hideAfter) {
        setHidden(false);
        last = y;
        return;
      }
      const delta = y - last;
      if (Math.abs(delta) < JITTER) return;
      last = y;
      if (delta < 0) setHidden(false);
      else if (!focusInside.current) setHidden(true);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scroller, threshold, canHide, hideAfter]);

  const size = compact
    ? { duration: reduced ? 0 : COMPACT_MS / 1000, ease: OUT }
    : { duration: reduced ? 0 : EXPAND_MS / 1000, ease: IN };
  const slide = hidden ? { duration: HIDE_MS / 1000, ease: IN } : { duration: reduced ? 0 : REVEAL_MS / 1000, ease: OUT };

  const goTo = (id: string) => {
    const target = scroller.current?.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <>
      {/* In the flow, not floated over the header: once focused it pushes the header down instead of
          covering the brand link, so no target is ever hidden under another. */}
      <a
        href={`#${content}`}
        onClick={(e) => {
          e.preventDefault();
          goTo(content);
        }}
        data-testid="skip-link"
        className="m-2 inline-flex rounded-control bg-accent px-3 py-2 text-[14px] font-medium text-accent-fg no-underline not-focus:sr-only"
      >
        Skip to content
      </a>
      <motion.div
        data-testid="header-slot"
        data-hidden={hidden ? "" : undefined}
        className="pointer-events-none sticky top-0 z-10"
        style={{ height: HEIGHT.tall }}
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%", transition: slide }}
      >
        <motion.header
          ref={header}
          data-compact={compact ? "" : undefined}
          className="pointer-events-auto relative flex items-center gap-2 bg-surface px-3"
          initial={false}
          animate={{ height: compact ? HEIGHT.compact : HEIGHT.tall, transition: size }}
          onFocus={() => {
            focusInside.current = true;
            setHidden(false);
          }}
          onBlur={(e) => {
            if (!header.current?.contains(e.relatedTarget as Node | null)) focusInside.current = false;
          }}
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 border-b border-line shadow-[0_8px_16px_-10px_rgb(20_24_33/0.35)]"
            initial={false}
            animate={{ opacity: compact ? 1 : 0, transition: size }}
          />
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scroller.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
            }}
            className="relative mr-auto flex h-10 min-w-0 items-center gap-2 rounded-control pr-1 text-[16px] font-semibold text-ink no-underline"
          >
            {/* The mark's box shrinks, not the whole mark: a scale would take its letter below 12 px. */}
            <motion.span
              aria-hidden="true"
              className="grid shrink-0 place-items-center rounded-control bg-accent text-[13px] leading-none font-semibold text-accent-fg"
              initial={false}
              animate={{ width: compact ? LOGO.compact : LOGO.tall, height: compact ? LOGO.compact : LOGO.tall, transition: size }}
            >
              {brand.slice(0, 1)}
            </motion.span>
            <span className="truncate @max-[22rem]:sr-only">{brand}</span>
          </a>
          <nav aria-label={label} className="relative">
            <ul className="m-0 flex list-none gap-0.5 p-0">
              {links.map((l) => (
                <li key={l.id}>
                  <a
                    href={`#${l.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(l.id);
                    }}
                    className="flex h-10 items-center rounded-control px-2.5 text-[14px] font-medium whitespace-nowrap text-ink no-underline hover:bg-sunken"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </motion.header>
      </motion.div>
    </>
  );
}

const LINKS: HeaderLink[] = [
  { id: "sh-features", label: "Features" },
  { id: "sh-pricing", label: "Pricing" },
  { id: "sh-faq", label: "FAQ" },
];

const SECTIONS = [
  {
    id: "sh-features",
    title: "Features",
    copy: ["Notes sync the moment you stop typing, on every device you sign in to.", "Tag a note once and it shows up in every project that shares the tag."],
  },
  {
    id: "sh-pricing",
    title: "Pricing",
    copy: ["One plan for a single writer, one for a team that shares notebooks.", "Every plan includes offline mode and full export to plain text."],
  },
  {
    id: "sh-faq",
    title: "FAQ",
    copy: ["You can leave at any time and take every note with you.", "Shared notebooks stay readable for the people you shared them with."],
  },
] as const;

/**
 * Live example for /kit/shrinking-header: a small page that scrolls inside its frame, with the
 * header stuck to the top of that scroll area. Auto-hide is on so both behaviors can be tried.
 */
export function Playground() {
  const scroller = useRef<HTMLDivElement>(null);
  const contentId = useId();
  return (
    <div data-testid="shrinking-header-playground" className="@container relative h-[360px] w-full max-w-[480px] min-w-0 overflow-hidden rounded-overlay border border-line bg-surface">
      <div ref={scroller} data-testid="shrinking-header-scroller" className="relative h-full overflow-y-auto overscroll-contain">
        <ShrinkingHeader scroller={scroller} content={contentId} brand="Fieldnote" links={LINKS} autoHide />
        <div id={contentId} tabIndex={-1} className="flex scroll-mt-16 flex-col gap-8 px-4 pt-2 pb-10 outline-none">
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[20px] font-semibold text-ink">Notes that keep pace</h3>
            <p className="m-0 text-[15px] text-muted">Scroll this page: past the first few pixels the header tightens and casts a shadow. Keep going and it steps out of the way; scroll up and it returns.</p>
          </div>
          {SECTIONS.map((s) => (
            <section key={s.id} aria-labelledby={s.id} className="flex flex-col gap-2">
              <h3 id={s.id} tabIndex={-1} className="m-0 scroll-mt-16 text-[17px] font-semibold text-ink outline-offset-2">
                {s.title}
              </h3>
              {s.copy.map((c) => (
                <p key={c} className="m-0 text-[15px] leading-relaxed text-muted">
                  {c}
                </p>
              ))}
              <div aria-hidden="true" className="mt-1 h-24 rounded-panel bg-sunken" />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
