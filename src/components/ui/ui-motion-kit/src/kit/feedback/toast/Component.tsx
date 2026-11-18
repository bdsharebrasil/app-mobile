import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Toast } from "@/primitives/toast";
import { DURATION, EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";
import "./toast.css";

export const TOAST_TIMEOUT = 8000;
export const useToastManager = Toast.useToastManager;

/** Base UI owns announcement, keyboard navigation, timer suspension and touch dismissal. */
export function ToastProvider({ children, timeout = TOAST_TIMEOUT }: { children: ReactNode; timeout?: number }) {
  return <Toast.Provider timeout={timeout} limit={3}>{children}<ToastQueue timeout={timeout} /></Toast.Provider>;
}

function ArchiveCheck() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8v8h12V8M3 4h14v4H3zM7 11l2 2 4-4" /></svg>;
}

function ToastQueue({ timeout }: { timeout: number }) {
  const { toasts } = Toast.useToastManager();
  const reduced = useReducedMotion() ?? false;
  const [windowFocused, setWindowFocused] = useState(true);
  useEffect(() => {
    const focus = () => setWindowFocused(true);
    const blur = () => setWindowFocused(false);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("focus", focus); window.removeEventListener("blur", blur); };
  }, []);
  return <Toast.Portal>
    <Toast.Viewport className="mk-toast-viewport" data-window-focused={windowFocused}>
      {toasts.map((toast) => {
        const ending = toast.transitionStatus === "ending" || toast.limited;
        return <Toast.Root key={toast.id} toast={toast} swipeDirection={["left", "right"]}
          data-testid="toast-notice" className="mk-toast-notice"
          render={<motion.div layout={reduced ? false : "position"}
            initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: ending ? 0 : 1, y: ending && !reduced ? 12 : 0 }}
            transition={{ duration: reduced ? 0 : (ending ? DURATION.exit : DURATION.enter) / 1000, ease: [...(ending ? EASING_POINTS.in : EASING_POINTS.out)] }} />}
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-sunken text-ink"><ArchiveCheck /></span>
            <div className="min-w-0 flex-1">
              <Toast.Title className="m-0 text-base leading-snug font-semibold" />
              <Toast.Description className="mt-1 text-sm leading-relaxed text-muted" />
            </div>
            <Toast.Close aria-hidden={false} render={<Button variant="ghost" size="icon" aria-label="Dismiss notification" className="shrink-0" />}>
              <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m6 6 8 8m0-8-8 8" /></svg>
            </Toast.Close>
          </div>
          {toast.actionProps ? <Toast.Action className="mt-3" render={<Button variant="secondary" />} /> : null}
          {(toast.timeout ?? timeout) > 0 ? <div aria-hidden="true" className="mk-toast-progress-track">
            <div key={toast.updateKey} data-testid="toast-progress" className="mk-toast-progress" style={{ "--toast-timeout": `${toast.timeout ?? timeout}ms` } as CSSProperties} />
          </div> : null}
        </Toast.Root>;
      })}
    </Toast.Viewport>
  </Toast.Portal>;
}

function SavePreferences() {
  const manager = Toast.useToastManager();
  const [saved, setSaved] = useState(0);
  const save = () => {
    setSaved((n) => n + 1);
    const id = manager.add({ title: "Preferences saved", description: "Your workspace is up to date.", priority: "low",
      actionProps: { children: "Undo", onClick: () => { setSaved((n) => Math.max(0, n - 1)); manager.close(id); } } });
  };
  return <div className="flex flex-col items-center gap-3">
    <Button data-testid="toast-trigger" onClick={save}>Save preferences</Button>
    <p data-testid="toast-result" className="m-0 text-sm text-muted">{saved ? `${saved} saved ${saved === 1 ? "change" : "changes"}` : "No saved changes"}</p>
    <Button variant="ghost" onClick={() => setSaved(0)}>Reset saved changes</Button>
    <p className="m-0 max-w-80 text-center text-sm leading-relaxed text-muted">Save twice to stack notifications. Hover or focus a notification to pause dismissal. Press F6 to reach notifications.</p>
  </div>;
}

export function Playground() {
  return <ToastProvider><SavePreferences /></ToastProvider>;
}
