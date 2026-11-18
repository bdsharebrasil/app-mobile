import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { EASING_POINTS } from "@/engine/tokens";

/**
 * Pagination: numbered controls for moving through pages of content, paged in place.
 *
 * Custom (no primitive library): a <nav> landmark with a name, a list of native buttons with
 * page names ("Page 4"), aria-current="page" on the current one, Previous/Next that are genuinely
 * disabled at the ends, and ellipses that are plain text hidden from assistive tech. Focus stays on
 * the control that was used; when that control becomes disabled (Next on the last page) focus moves
 * to the current page button. Narrow containers show fewer neighbours (1 ... 4 ... 12).
 * Motion: the filled marker slides to the chosen page in 220 ms ease-out (a shared layout
 * animation); the content list swaps with the outgoing page fading in 150 ms ease-in and the
 * incoming page arriving 12 px from the navigation direction in 220 ms ease-out.
 * Reduced motion: marker and content change in 0 ms.
 */

export const ENTER_MS = 220;
export const EXIT_MS = 150;
const OUT = [...EASING_POINTS.out] as [number, number, number, number];
const IN = [...EASING_POINTS.in] as [number, number, number, number];

type Item = number | "start-ellipsis" | "end-ellipsis";

/** Page items: first, last, the current page with `siblings` neighbours, and ellipses for gaps. */
export function pageItems(page: number, count: number, siblings = 1): Item[] {
  const all = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (count <= 2 * siblings + 5) return all(1, count);
  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, count);
  const showLeft = left > 3;
  const showRight = right < count - 2;
  const edge = 3 + 2 * siblings;
  if (!showLeft) return [...all(1, edge), "end-ellipsis", count];
  if (!showRight) return [1, "start-ellipsis", ...all(count - edge + 1, count)];
  return [1, "start-ellipsis", ...all(left, right), "end-ellipsis", count];
}

/**
 * One neighbour each side when the nav's container has room for nine controls, none below that.
 * The container must not size itself from the pager (give flex or grid parents min-width: 0).
 */
function useSiblings(ref: React.RefObject<HTMLElement | null>) {
  const [siblings, setSiblings] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const measure = () => setSiblings(el.clientWidth >= 9 * 36 + 8 * 4 ? 1 : 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return siblings;
}

const ITEM = "relative grid size-9 shrink-0 place-items-center rounded-control text-[14px] font-medium tabular-nums";

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "prev" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

export function Pagination({
  page,
  count,
  onPageChange,
  label = "Pagination",
}: {
  page: number;
  count: number;
  onPageChange(page: number): void;
  label?: string;
}) {
  const nav = useRef<HTMLElement>(null);
  const siblings = useSiblings(nav);
  const reduced = useReducedMotion() ?? false;
  const group = useId();
  const items = pageItems(page, count, siblings);

  // A control that became disabled under focus hands focus to the current page.
  useEffect(() => {
    const active = document.activeElement as HTMLButtonElement | null;
    if (active && nav.current?.contains(active) && active.disabled) nav.current.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
  }, [page]);

  const step = "grid size-9 shrink-0 place-items-center rounded-control border border-control-line text-ink hover:bg-sunken disabled:border-line disabled:text-muted disabled:opacity-60 disabled:hover:bg-transparent";
  return (
    <nav ref={nav} aria-label={label}>
      <LayoutGroup id={group}>
        <ul className="m-0 flex list-none items-center gap-1 p-0">
          <li>
            <button type="button" className={step} aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <Arrow dir="prev" />
            </button>
          </li>
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                <button
                  type="button"
                  className={`${ITEM} ${item === page ? "text-accent-fg" : "text-ink hover:bg-sunken"}`}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => item !== page && onPageChange(item)}
                >
                  {item === page ? (
                    <motion.span
                      layoutId="marker"
                      data-testid="page-marker"
                      className="absolute inset-0 rounded-control bg-accent"
                      transition={{ duration: reduced ? 0 : ENTER_MS / 1000, ease: OUT }}
                    />
                  ) : null}
                  <span className="relative">{item}</span>
                </button>
              </li>
            ) : (
              <li key={item} aria-hidden="true" className="grid size-9 shrink-0 place-items-center text-[14px] text-muted select-none">
                …
              </li>
            ),
          )}
          <li>
            <button type="button" className={step} aria-label="Next page" disabled={page >= count} onClick={() => onPageChange(page + 1)}>
              <Arrow dir="next" />
            </button>
          </li>
        </ul>
      </LayoutGroup>
    </nav>
  );
}

const ORDERS = Array.from({ length: 48 }, (_, i) => ({
  id: 1001 + i,
  total: ((i * 37) % 180) + 24 + ((i * 13) % 100) / 100,
}));
const PER_PAGE = 4;

export function Playground() {
  const [page, setPage] = useState(3);
  const [dir, setDir] = useState(1);
  const reduced = useReducedMotion() ?? false;
  const count = Math.ceil(ORDERS.length / PER_PAGE);
  const rows = ORDERS.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const first = (page - 1) * PER_PAGE + 1;
  const go = (next: number) => {
    setDir(next > page ? 1 : -1);
    setPage(next);
  };
  return (
    <div data-testid="pagination-playground" className="flex w-full max-w-[420px] min-w-0 flex-col gap-4">
      <div className="min-h-[184px] overflow-hidden rounded-panel border border-line bg-surface">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={page}
            aria-label={`Orders, page ${page} of ${count}`}
            className="m-0 list-none divide-y divide-line p-0"
            initial={reduced ? false : { opacity: 0, x: 12 * dir }}
            animate={{ opacity: 1, x: 0, transition: { duration: reduced ? 0 : ENTER_MS / 1000, ease: OUT } }}
            exit={{ opacity: 0, transition: { duration: reduced ? 0 : EXIT_MS / 1000, ease: IN } }}
          >
            {rows.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                <span className="font-medium text-ink">Order #{o.id}</span>
                <span className="text-muted tabular-nums">${o.total.toFixed(2)}</span>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
      <Pagination page={page} count={count} onPageChange={go} label="Orders pages" />
      <p role="status" className="m-0 text-[13px] text-muted">
        Page {page} of {count}, orders {first} to {first + rows.length - 1}
      </p>
    </div>
  );
}
