import { useRef, useState, type ReactElement } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertDialog } from "@/primitives/alert-dialog";
import { DURATION, EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";

/** Cancel-first confirmation. Only explicit confirmation invokes onConfirm; Escape/backdrop never do. */
export function DeleteConfirmation({ trigger, title, description, onConfirm }: {
  trigger: ReactElement; title: string; description: string; onConfirm(): void;
}) {
  const [open, setOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const enter = { duration: reduced ? 0 : DURATION.enter / 1000, ease: [...EASING_POINTS.out] as [number, number, number, number] };
  const exit = { duration: reduced ? 0 : DURATION.exit / 1000, ease: [...EASING_POINTS.in] as [number, number, number, number] };
  return <AlertDialog.Root open={open} onOpenChange={setOpen}>
    <AlertDialog.Trigger render={trigger} />
    <AnimatePresence>{open && <AlertDialog.Portal keepMounted>
      <AlertDialog.Backdrop render={<motion.div className="fixed inset-0 z-50 bg-[var(--mk-scrim)]" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: enter }} exit={{ opacity: 0, transition: exit }} />} />
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
        <AlertDialog.Popup initialFocus={cancel} aria-modal="true" render={<motion.div data-testid="alert-dialog-panel" className="pointer-events-auto w-full max-w-[380px] rounded-overlay bg-surface p-6 text-ink shadow-[var(--mk-shadow-overlay)]" initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }} animate={{ opacity: 1, scale: 1, transition: enter }} exit={{ opacity: 0, scale: reduced ? 1 : 0.98, transition: exit }} />}>
          <AlertDialog.Title className="m-0 text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[15px] leading-relaxed text-muted">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Close render={<Button ref={cancel} variant="secondary">Cancel</Button>} />
            <AlertDialog.Close render={<Button onClick={onConfirm}>Delete draft</Button>} />
          </div>
        </AlertDialog.Popup>
      </div>
    </AlertDialog.Portal>}</AnimatePresence>
  </AlertDialog.Root>;
}
export function Playground() {
  const [deleted, setDeleted] = useState(false);
  return <div className="flex flex-col items-center gap-3">
    <p className="m-0 text-[15px] text-muted">{deleted ? "Draft removed from this example." : "Unpublished draft: Autumn field notes"}</p>
    <DeleteConfirmation trigger={<Button data-testid="alert-dialog-trigger">Delete draft</Button>} title="Delete this draft?" description="Autumn field notes will be permanently removed. Published notes will not change." onConfirm={() => setDeleted(true)} />
    {deleted && <Button variant="secondary" onClick={() => setDeleted(false)}>Reset example</Button>}
    <p role="status" className="m-0 min-h-6 text-sm text-muted">{deleted ? "Draft deleted." : "Your draft is safe."}</p>
  </div>;
}
