import { useEffect, useRef, useState, type Ref } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DURATION, EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";
export interface EmptyStateProps { title: string; description: string; actionLabel: string; onAction(): void; actionRef?: Ref<HTMLButtonElement> }
export function EmptyState({ title, description, actionLabel, onAction, actionRef }: EmptyStateProps) {
  const reduced = useReducedMotion();
  const enter = (i: number) => ({ initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduced ? 0 : DURATION.enter / 1000, delay: reduced ? 0 : i * .025, ease: [...EASING_POINTS.out] as [number, number, number, number] } });
  return <div data-testid="empty-state-panel" className="flex flex-col items-center gap-3 py-6 text-center text-ink">
    <motion.svg {...enter(0)} aria-hidden="true" width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M10 19h36v28H10zM7 11h42v8H7zM21 29h14" /></motion.svg>
    <motion.h3 {...enter(1)} className="m-0 text-lg font-semibold">{title}</motion.h3>
    <motion.p {...enter(2)} className="m-0 max-w-xs text-sm leading-relaxed text-muted">{description}</motion.p>
    <motion.div {...enter(3)}><Button ref={actionRef} onClick={onAction}>{actionLabel}</Button></motion.div>
  </div>;
}
export function Playground() {
  const [empty, setEmpty] = useState(false); const action = useRef<HTMLButtonElement>(null); const remove = useRef<HTMLButtonElement>(null); const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } (empty ? action.current : remove.current)?.focus(); }, [empty]);
  return <div data-testid="empty-state-playground" className="w-full max-w-md text-ink"><p role="status" className="sr-only">{empty ? "Your saved list is now empty." : "1 item in your saved list."}</p>
    {empty ? <EmptyState title="All cleared" description="Your saved list is empty. Add a note whenever you need a place to start." actionLabel="Add a note" actionRef={action} onAction={() => setEmpty(false)} /> : <div className="flex flex-wrap items-center justify-between gap-4 rounded-control border border-line bg-surface p-4"><div><h3 className="m-0 text-base font-semibold">Review checklist</h3><p className="m-0 text-sm text-muted">Saved note</p></div><Button ref={remove} variant="secondary" data-testid="empty-state-trigger" onClick={() => setEmpty(true)}>Delete note</Button></div>}
  </div>;
}
