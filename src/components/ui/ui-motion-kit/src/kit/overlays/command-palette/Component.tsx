import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Combobox } from "@/primitives/combobox";
import { DialogDescription, DialogPopup, DialogPortal, DialogRoot, DialogTitle, DialogBackdrop } from "@/primitives/dialog";
import { EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";
import { PALETTE_MS, PALETTE_TRAVEL } from "./timing";

/**
 * Command palette: a modal search box that finds and runs commands, toggled with Cmd+K / Ctrl+K.
 *
 * Behavior is split between two primitives. The dialog (src/primitives/dialog.tsx, Base UI) gives
 * the named role="dialog" with aria-modal, the focus trap, Esc and backdrop dismiss, scroll lock
 * and focus return. Inside it, an inline combobox (src/primitives/combobox.ts, Base UI) gives the
 * labeled role="combobox" input and the grouped role="listbox": DOM focus stays on the input,
 * aria-activedescendant follows the highlighted result, arrow keys move it, Enter runs it. Group
 * headings are labels, not options. Result counts and the empty state are announced politely.
 * Filtering is this file's fuzzy match: every typed character must appear in order, and matches
 * at word starts rank first.
 * Motion: fade + 12 px travel from above, 220 ms ease-out; exit 150 ms
 * ease-in; no bounce, no stagger. Reduced motion: it opens, closes and updates in place.
 */

export interface Command {
  id: string;
  label: string;
  group: string;
  /** Extra words that should find this command. */
  keywords?: string;
  run(): void;
}

interface CommandGroup {
  value: string;
  items: Command[];
}

/** Fuzzy score: -1 when `query` is not a subsequence of `text`; higher is better. */
export function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return 0;
  let score = 0;
  let from = 0;
  let previous = -2;
  for (const ch of q) {
    const at = t.indexOf(ch, from);
    if (at < 0) return -1;
    if (at === 0 || t[at - 1] === " ") score += 3;
    if (at === previous + 1) score += 2;
    score += 1;
    previous = at;
    from = at + 1;
  }
  return score - t.length / 100;
}

function filterCommands(commands: Command[], query: string): CommandGroup[] {
  const scored = commands
    .map((c) => ({ c, s: Math.max(fuzzyScore(c.label, query), c.keywords ? fuzzyScore(c.keywords, query) - 1 : -1) }))
    .filter(({ s }) => s >= 0);
  if (query.trim()) scored.sort((a, b) => b.s - a.s);
  const groups = new Map<string, Command[]>();
  for (const { c } of scored) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
  return [...groups].map(([value, items]) => ({ value, items }));
}

function bezier(points: readonly [number, number, number, number]): [number, number, number, number] {
  return [points[0], points[1], points[2], points[3]];
}

export function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

export function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-[6px] border border-line bg-sunken px-1.5 font-sans text-xs font-medium text-muted">
      {children}
    </kbd>
  );
}

export interface CommandPaletteProps {
  commands: Command[];
  open: boolean;
  onOpenChange(open: boolean): void;
  placeholder?: string;
}

export function CommandPalette({ commands, open, onOpenChange, placeholder = "Type a command or search" }: CommandPaletteProps) {
  const reduced = useReducedMotion() ?? false;
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(() => filterCommands(commands, query), [commands, query]);
  const count = results.reduce((n, g) => n + g.items.length, 0);
  const enter = { duration: reduced ? 0 : PALETTE_MS.enter / 1000, ease: bezier(EASING_POINTS.out) };
  const exit = { duration: reduced ? 0 : PALETTE_MS.exit / 1000, ease: bezier(EASING_POINTS.in) };
  const hidden = { opacity: reduced ? 1 : 0, y: reduced ? 0 : -PALETTE_TRAVEL };

  // Cmd+K / Ctrl+K toggles from anywhere on the page, including from inside the open palette.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const setOpen = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open ? (
          <DialogPortal keepMounted>
            <DialogBackdrop
              render={
                <motion.div
                  data-palette-overlay
                  className="fixed inset-0 z-50 bg-[var(--mk-scrim)]"
                  initial={{ opacity: reduced ? 1 : 0 }}
                  animate={{ opacity: 1, transition: enter }}
                  exit={{ opacity: reduced ? 1 : 0, transition: exit }}
                />
              }
            />
            <DialogPopup
              aria-modal="true"
              initialFocus={input}
              render={
                <motion.div
                  data-palette
                  className="fixed top-[min(12vh,96px)] left-1/2 z-50 flex max-h-[min(480px,calc(100dvh-32px))] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-overlay bg-surface text-ink shadow-[var(--mk-shadow-overlay)] outline-none"
                  initial={hidden}
                  animate={{ opacity: 1, y: 0, transition: enter }}
                  exit={{ ...hidden, transition: exit }}
                />
              }
            >
              <DialogTitle className="sr-only">Command palette</DialogTitle>
              <DialogDescription className="sr-only">Type to filter, use the arrow keys to choose and Enter to run.</DialogDescription>
              <Combobox.Root
                inline
                open={open}
                onOpenChange={(next) => {
                  if (!next) setOpen(false);
                }}
                items={results}
                filteredItems={results}
                filter={null}
                inputValue={query}
                onInputValueChange={setQuery}
                autoHighlight
                itemToStringLabel={(c: Command) => c.label}
                value={null}
                onValueChange={(c: Command | null) => {
                  if (!c) return;
                  setOpen(false);
                  c.run();
                }}
              >
                <div className="flex items-center gap-3 border-b border-line px-4">
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <circle cx="9" cy="9" r="5" />
                    <path d="M13 13l3.5 3.5" />
                  </svg>
                  <Combobox.Input
                    ref={input}
                    aria-label="Search commands"
                    data-testid="palette-input"
                    placeholder={placeholder}
                    className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
                  />
                  <Keycap>Esc</Keycap>
                </div>
                <Combobox.List data-testid="palette-list" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 empty:hidden">
                  {(group: CommandGroup) => (
                    <Combobox.Group key={group.value} items={group.items} className="pb-1">
                      <Combobox.GroupLabel className="px-3 pt-2 pb-1 text-xs font-medium tracking-[0.02em] text-muted">{group.value}</Combobox.GroupLabel>
                      <Combobox.Collection>
                        {(c: Command) => (
                          <Combobox.Item
                            key={c.id}
                            value={c}
                            data-testid={`palette-item-${c.id}`}
                            className="flex h-10 cursor-default items-center gap-3 rounded-control px-3 text-[15px] select-none data-highlighted:bg-sunken pointer-coarse:h-11"
                          >
                            <span className="min-w-0 flex-1 truncate">{c.label}</span>
                          </Combobox.Item>
                        )}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )}
                </Combobox.List>
                <Combobox.Empty data-testid="palette-empty" className="px-4 py-8 text-center text-[15px] text-muted empty:hidden">
                  {query.trim() ? `No commands match “${query.trim()}”.` : null}
                </Combobox.Empty>
                <Combobox.Status className="sr-only">{count > 0 ? `${count} result${count === 1 ? "" : "s"}` : ""}</Combobox.Status>
              </Combobox.Root>
              <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Keycap>↑</Keycap>
                  <Keycap>↓</Keycap>
                  to choose
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Keycap>Enter</Keycap>
                  to run
                </span>
              </div>
            </DialogPopup>
          </DialogPortal>
        ) : null}
      </AnimatePresence>
    </DialogRoot>
  );
}

/**
 * Live example for /kit/command-palette: a "Search commands" button and the Cmd+K / Ctrl+K
 * shortcut open the palette; running a command reports it below. Try typing "inv".
 */
export function Playground() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const mac = isMac();
  const commands = useMemo<Command[]>(() => {
    const ran = (what: string) => () => setResult(`Ran: ${what}`);
    return [
      { id: "inbox", group: "Go to", label: "Inbox", keywords: "messages mail", run: ran("Go to Inbox") },
      { id: "invoices", group: "Go to", label: "Invoices", keywords: "billing payments", run: ran("Go to Invoices") },
      { id: "reports", group: "Go to", label: "Reports", keywords: "analytics charts", run: ran("Go to Reports") },
      { id: "settings", group: "Go to", label: "Settings", keywords: "preferences account", run: ran("Go to Settings") },
      { id: "new-invoice", group: "Actions", label: "New invoice", keywords: "create bill", run: ran("New invoice") },
      { id: "invite", group: "Actions", label: "Invite teammate", keywords: "add member people", run: ran("Invite teammate") },
      { id: "export", group: "Actions", label: "Export as CSV", keywords: "download spreadsheet", run: ran("Export as CSV") },
    ];
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <Button variant="secondary" data-testid="palette-trigger" aria-keyshortcuts={mac ? "Meta+K" : "Control+K"} onClick={() => setOpen(true)} className="min-w-64 justify-between">
        <span className="inline-flex items-center gap-2 text-muted">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="9" cy="9" r="5" />
            <path d="M13 13l3.5 3.5" />
          </svg>
          Search commands
        </span>
        <span className="inline-flex gap-1" aria-hidden="true">
          <Keycap>{mac ? "⌘" : "Ctrl"}</Keycap>
          <Keycap>K</Keycap>
        </span>
      </Button>
      <CommandPalette commands={commands} open={open} onOpenChange={setOpen} />
      <p role="status" className="m-0 min-h-6 text-sm text-muted">
        {result ?? ""}
      </p>
    </div>
  );
}
