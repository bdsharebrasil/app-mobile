import { useState } from "react";
import { Progress } from "@/primitives/progress";
import { Button } from "@/ui/Button";
import "./progress-bar.css";
export interface ProgressBarProps { value: number | null; label: string; max?: number }
/** Values are supplied by the caller's actual work, never synthesized by this component. */
export function ProgressBar({ value, label, max = 100 }: ProgressBarProps) {
  return <Progress.Root value={value} max={max} className="progress-bar-root w-full text-ink" data-testid="progress-bar-panel">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><Progress.Label>{label}</Progress.Label><span aria-hidden="true">{value === null ? "Working…" : `${Math.round(Math.min(max, Math.max(0, value)) / max * 100)}%`}</span></div>
    <Progress.Track className="progress-bar-track"><Progress.Indicator className="progress-bar-fill" /></Progress.Track>
  </Progress.Root>;
}
export function Playground() {
  const [value, setValue] = useState<number | null>(0);
  return <div data-testid="progress-bar-playground" className="w-full max-w-md space-y-4 text-ink">
    <div aria-busy={value === null || (value > 0 && value < 100)}><ProgressBar label="Upload progress" value={value} /></div>
    <p className="text-sm text-muted">Use the controls to supply measured progress or an unknown duration.</p>
    <div className="flex flex-wrap gap-2"><Button data-testid="progress-bar-trigger" onClick={() => setValue(v => v === null ? 25 : Math.min(100, v + 25))}>Add 25%</Button><Button variant="secondary" onClick={() => setValue(null)}>Unknown duration</Button><Button variant="ghost" onClick={() => setValue(0)}>Reset</Button></div>
    <p role="status" className="min-h-6 text-sm text-muted">{value === 100 ? "✓ Upload complete." : ""}</p>
  </div>;
}
