import { useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DURATION, EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";

export interface InlineBannerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  urgent?: boolean;
  onDismiss?(): void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}
/** Advisory severity is not urgency. The persistent live region is outside the animated layout. */
export function InlineBanner({ open, title, children, variant = "info", urgent = false, onDismiss, returnFocusRef }: InlineBannerProps) {
  const reduced = useReducedMotion();
  return <>
    <div className="sr-only" role={urgent ? "alert" : "status"}>{open ? <>{title}. {children}</> : null}</div>
    <AnimatePresence initial={false}>
      {open && <motion.div data-testid="inline-banner-panel" data-variant={variant} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0, transition: { duration: reduced ? 0 : DURATION.exit / 1000, ease: [...EASING_POINTS.in] } }} transition={{ duration: reduced ? 0 : DURATION.enter / 1000, ease: [...EASING_POINTS.out] }} style={{ overflow: "hidden" }}>
        <div className="mb-4 flex items-start gap-3 rounded-control border border-control-line bg-surface p-4 text-ink">
          <span aria-hidden="true" className="mt-1 font-semibold">{({ info: "i", success: "✓", warning: "!", error: "×" })[variant]}</span>
          <div className="min-w-0 flex-1"><h3 className="m-0 text-base font-semibold">{title}</h3><div className="mt-1 text-sm leading-relaxed text-muted">{children}</div></div>
          {onDismiss && <Button size="icon" variant="ghost" aria-label="Dismiss message" onClick={(event) => { if (event.currentTarget.contains(document.activeElement)) returnFocusRef?.current?.focus(); onDismiss(); }}><span aria-hidden="true">×</span></Button>}
        </div>
      </motion.div>}
    </AnimatePresence>
  </>;
}
export function Playground() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div data-testid="inline-banner-playground" className="w-full max-w-lg text-ink">
    <InlineBanner open={open} title="Review your notification settings" variant="warning" onDismiss={() => setOpen(false)} returnFocusRef={trigger}>Weekly summaries are paused. Turn them back on when you are ready.</InlineBanner>
    <div data-testid="inline-banner-content" className="space-y-3"><p className="m-0 text-sm text-muted">Notification preferences stay available below the message.</p><Button ref={trigger} data-testid="inline-banner-trigger" onClick={() => setOpen(true)}>Show reminder</Button></div>
  </div>;
}
