import { useEffect, useState } from "react";
import { Button } from "@/ui/Button";
import "./spinner.css";
export interface SpinnerProps { label?: string; size?: "sm" | "md" | "lg"; announce?: boolean }
export function Spinner({ label = "Loading…", size = "md", announce = true }: SpinnerProps) {
  return <span className="spinner-status inline-flex items-center gap-2" role={announce ? "status" : undefined} aria-label={label} data-testid="spinner-panel">
    <svg aria-hidden="true" className="spinner-ring" width={{ sm: 16, md: 24, lg: 36 }[size]} height={{ sm: 16, md: 24, lg: 36 }[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M12 3a9 9 0 0 1 9 9" /></svg>
    <span>{label}</span>
  </span>;
}
export function Playground() {
  const [pending, setPending] = useState(false);
  useEffect(() => { if (!pending) return; const id = setTimeout(() => setPending(false), 1800); return () => clearTimeout(id); }, [pending]);
  return <div data-testid="spinner-playground" className="flex flex-col items-start gap-4 text-ink">
    <Button data-testid="spinner-trigger" className="min-w-40" aria-disabled={pending} onClick={() => { if (!pending) setPending(true); }}>{pending ? <Spinner size="sm" label="Loading…" announce={false} /> : "Load preview"}</Button>
    <div className="min-h-10 text-sm text-muted" role="status">{pending ? <Spinner size="lg" label="Loading preview…" announce={false} /> : "Preview ready."}</div>
  </div>;
}
