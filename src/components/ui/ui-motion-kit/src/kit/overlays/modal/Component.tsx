import { createContext, useContext, useId, useRef, useState, type FormEvent, type ReactElement, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/primitives/dialog";
import { DURATION, EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";

/**
 * Modal: a centered form dialog over a dimmed page (title, one labeled field, primary action,
 * close) that blocks the page until the user submits or dismisses it. Confirm-only dialogs are a
 * separate piece (alert-dialog).
 *
 * Behavior comes from the dialog primitive (src/primitives/dialog.tsx, Base UI): role="dialog"
 * with aria-modal, aria-labelledby (ModalTitle) and aria-describedby (ModalDescription), focus
 * trap, focus on `initialFocus` (the field) when it opens, Esc and outside press to close, focus
 * returns to the trigger, background scroll lock.
 * Motion: enter 220 ms fade + scale 0.96 -> 1 ease-out; exit 160 ms ease-in; reduced motion = no
 * transform and no duration (state change only). The open state is controlled here so
 * AnimatePresence can play the exit before Base UI unmounts the popup.
 */

function bezier(points: readonly [number, number, number, number]): [number, number, number, number] {
  return [points[0], points[1], points[2], points[3]];
}

interface ModalState {
  open: boolean;
}

const ModalContext = createContext<ModalState>({ open: false });

export interface ModalProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
}

export function Modal({ children, open: controlled, defaultOpen = false, onOpenChange }: ModalProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };
  return (
    <ModalContext.Provider value={{ open }}>
      <DialogRoot open={open} onOpenChange={setOpen}>
        {children}
      </DialogRoot>
    </ModalContext.Provider>
  );
}

/** Renders the single element it wraps (usually a Button) as the opener. */
export function ModalTrigger({ children }: { children: ReactElement }) {
  return <DialogTrigger render={children} />;
}

/** Renders the single element it wraps as a closer. */
export function ModalClose({ children }: { children: ReactElement }) {
  return <DialogClose render={children} />;
}

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
  /** Element that receives focus when the dialog opens; Base UI's default (first control) otherwise. */
  initialFocus?: RefObject<HTMLElement | null>;
}

export function ModalContent({ children, className = "", initialFocus }: ModalContentProps) {
  const { open } = useContext(ModalContext);
  const reduced = useReducedMotion() ?? false;
  const enter = { duration: reduced ? 0 : DURATION.enter / 1000, ease: bezier(EASING_POINTS.out) };
  const exit = { duration: reduced ? 0 : DURATION.exit / 1000, ease: bezier(EASING_POINTS.in) };
  const hiddenScale = reduced ? 1 : 0.96;
  return (
    <AnimatePresence>
      {open ? (
        <DialogPortal keepMounted>
          <DialogBackdrop
            render={
              <motion.div
                data-modal-overlay
                className="fixed inset-0 z-50 bg-[var(--mk-scrim)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: enter }}
                exit={{ opacity: 0, transition: exit }}
              />
            }
          />
          <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
            <DialogPopup
              aria-modal="true"
              initialFocus={initialFocus ?? true}
              render={
                <motion.div
                  data-modal-content
                  className={`pointer-events-auto w-full max-w-[min(440px,calc(100vw-32px))] rounded-overlay bg-surface p-6 text-ink shadow-[var(--mk-shadow-overlay)] outline-none ${className}`}
                  initial={{ opacity: 0, scale: hiddenScale }}
                  animate={{ opacity: 1, scale: 1, transition: enter }}
                  exit={{ opacity: 0, scale: hiddenScale, transition: exit }}
                />
              }
            >
              {children}
            </DialogPopup>
          </div>
        </DialogPortal>
      ) : null}
    </AnimatePresence>
  );
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return <DialogTitle className="m-0 text-lg leading-snug font-semibold tracking-[-0.01em]">{children}</DialogTitle>;
}

export function ModalDescription({ children }: { children: ReactNode }) {
  return <DialogDescription className="mt-1 mb-0 text-[15px] leading-relaxed text-muted">{children}</DialogDescription>;
}

function ReportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="3.5" y="3.5" width="13" height="13" rx="3" />
      <path d="M7 13V10M10 13V7M13 13V9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

/**
 * Live example for /kit/modal: the "New report" form dialog the demo card shows. Submitting an
 * empty name keeps the dialog open and points the field at an error message.
 */
export function Playground() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const errorId = useId();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName("");
      setError(false);
      setResult(null);
    }
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(true);
      field.current?.focus();
      return;
    }
    setResult(`Created "${trimmed}"`);
    setOpen(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalTrigger>
          <Button data-testid="modal-trigger">
            <span aria-hidden="true" className="-ml-1 text-lg leading-none">
              +
            </span>
            New report
          </Button>
        </ModalTrigger>
        <ModalContent initialFocus={field}>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-sunken text-ink">
              <ReportIcon />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <ModalTitle>New report</ModalTitle>
              <ModalDescription>Name it now; add charts and filters after.</ModalDescription>
            </div>
            <ModalClose>
              <Button variant="ghost" size="icon" aria-label="Close" data-testid="modal-close" className="-mt-1.5 -mr-2 shrink-0 text-muted">
                <CloseIcon />
              </Button>
            </ModalClose>
          </div>
          <form className="mt-5 flex flex-col" onSubmit={onSubmit} noValidate>
            <label htmlFor={fieldId} className="text-sm font-medium text-ink">
              Report name
            </label>
            <input
              ref={field}
              id={fieldId}
              data-testid="modal-field"
              name="report-name"
              autoComplete="off"
              placeholder="e.g. Q3 revenue"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(false);
              }}
              aria-invalid={error || undefined}
              aria-describedby={error ? errorId : undefined}
              className="mt-1.5 h-10 w-full rounded-control border border-control-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted pointer-coarse:h-11 aria-invalid:border-2 aria-invalid:border-ink"
            />
            {error ? (
              <p id={errorId} className="mt-1.5 mb-0 text-sm font-medium text-ink">
                Enter a name for the report.
              </p>
            ) : null}
            <Button type="submit" data-testid="modal-confirm" className="mt-5 w-full">
              Create report
            </Button>
            <ModalClose>
              <Button variant="ghost" data-testid="modal-cancel" className="mt-1 self-center text-muted">
                Cancel
              </Button>
            </ModalClose>
          </form>
        </ModalContent>
      </Modal>
      <p role="status" className="m-0 min-h-6 text-sm text-muted">
        {result ? `Last action: ${result}` : ""}
      </p>
    </div>
  );
}
