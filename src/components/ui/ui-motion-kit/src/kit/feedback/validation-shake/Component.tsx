import { useId, useRef, useState, type Ref } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Field } from "@/primitives/field";
import { DURATION, EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";
export interface ValidationShakeProps { label: string; value: string; onValueChange(value: string): void; error?: string; attempt?: number; inputRef?: Ref<HTMLInputElement> }
export function ValidationShake({ label, value, onValueChange, error, attempt = 0, inputRef }: ValidationShakeProps) {
  const reduced = useReducedMotion(); const errorId = useId();
  return <Field.Root invalid={!!error} className="w-full text-ink" data-testid="validation-shake-panel">
    <Field.Label className="mb-2 block text-sm font-medium">{label}</Field.Label>
    <motion.div data-testid="validation-shake-motion" animate={{ x: error && !reduced ? [0, -4, 4, -3, 3, -2, 0] : 0 }} key={attempt} transition={{ duration: reduced ? 0 : (DURATION.fast * 2) / 1000, ease: [...EASING_POINTS.out] }}>
      <Field.Control ref={inputRef} value={value} onValueChange={onValueChange} aria-describedby={error ? errorId : undefined} className="h-11 w-full rounded-control border border-control-line bg-surface px-3 text-base text-ink aria-invalid:border-2 aria-invalid:border-ink" />
    </motion.div>
    <div className="min-h-8">{error && <motion.p id={errorId} className="mt-2 mb-0 text-sm text-ink" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : DURATION.enter / 1000 }}>{error}</motion.p>}</div>
  </Field.Root>;
}
export function Playground() {
  const [value, setValue] = useState(""); const [error, setError] = useState(""); const [attempt, setAttempt] = useState(0); const [result, setResult] = useState(""); const input = useRef<HTMLInputElement>(null);
  return <form data-testid="validation-shake-playground" className="w-full max-w-sm space-y-4" noValidate onSubmit={e => { e.preventDefault(); if (!value.trim()) { setError("Enter a name for this workspace."); setAttempt(a => a + 1); setResult(""); requestAnimationFrame(() => input.current?.focus()); } else { setError(""); setResult(`Workspace “${value.trim()}” saved.`); } }}>
    <ValidationShake label="Workspace name" value={value} onValueChange={v => { setValue(v); setError(""); }} error={error} attempt={attempt} inputRef={input} />
    <Button type="submit" data-testid="validation-shake-trigger">Save workspace</Button><p role="status" className="min-h-6 text-sm text-muted">{result}</p>
  </form>;
}
