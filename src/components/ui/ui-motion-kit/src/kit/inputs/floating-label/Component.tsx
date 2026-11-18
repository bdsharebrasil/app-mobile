import { useRef, useState, type ReactNode } from "react";
import { Field } from "@/primitives/field";
import "./floating-label.css";

/**
 * Floating-label field: a real <label> that sits inside the empty field and rises above the value
 * when the field has focus or any value (typed, prefilled, set by script or autofilled).
 *
 * Semantics come from the field primitive (src/primitives/field.tsx, Base UI): the label is tied
 * to the input, the description and error are wired into aria-describedby, and `invalid` sets
 * aria-invalid. The float itself is CSS (floating-label.css): the input keeps a " " placeholder,
 * so :placeholder-shown means empty, and :autofill covers browser autofill that sends no event.
 * Motion: rise and shrink to 12 px with a darker 2 px border in 180 ms ease-out; return in 120 ms
 * ease-in, only when empty and blurred. Reduced motion: no transitions.
 */

export interface FloatingLabelFieldProps {
  label: ReactNode;
  value: string;
  onValueChange(value: string): void;
  type?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  name?: string;
  description?: ReactNode;
  /** Message shown (and aria-invalid set) while the value is invalid. */
  error?: string;
  onBlur?(input: HTMLInputElement): void;
  /** Accessible name of the clear button; no button when omitted. */
  clearLabel?: string;
  "data-testid"?: string;
}

export function FloatingLabelField({
  label,
  value,
  onValueChange,
  type = "text",
  autoComplete,
  name,
  description,
  error,
  onBlur,
  clearLabel,
  "data-testid": testId,
}: FloatingLabelFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <Field.Root invalid={Boolean(error)} className="mk-float-field" data-testid={testId}>
      <div className="mk-float">
        <Field.Control
          ref={input}
          className="mk-float-input"
          type={type}
          name={name}
          autoComplete={autoComplete}
          placeholder=" "
          value={value}
          onValueChange={(v) => onValueChange(String(v))}
          onBlur={(e) => onBlur?.(e.currentTarget)}
        />
        <Field.Label className="mk-float-label">{label}</Field.Label>
        {clearLabel && value ? (
          <button
            type="button"
            className="mk-float-clear"
            aria-label={clearLabel}
            // Keep focus in the input: no blur (and no blur validation) on the way to clearing.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onValueChange("");
              input.current?.focus();
            }}
          >
            <span aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 2l6 6M8 2 2 8" />
              </svg>
            </span>
          </button>
        ) : null}
      </div>
      {description ? <Field.Description className="mt-1.5 mb-0 text-sm text-muted">{description}</Field.Description> : null}
      <div aria-live="polite">
        {error ? (
          <Field.Error match className="mt-1.5 mb-0 flex items-center gap-1.5 text-sm font-medium text-ink">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="7" cy="7" r="6" />
              <path d="M7 4v3.4M7 9.8v.1" />
            </svg>
            {error}
          </Field.Error>
        ) : null}
      </div>
    </Field.Root>
  );
}

/**
 * Live example for /kit/floating-label: a sign-up step with a prefilled "Full name" and an empty
 * "Work email" that is checked when it loses focus, the same form the demo shows.
 */
export function Playground() {
  const [name, setName] = useState("Ana Rivera");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="w-full max-w-[400px] rounded-panel border border-line bg-surface p-5"
      noValidate
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="m-0 text-base font-semibold text-ink">Create your account</p>
      <p className="m-0 mt-0.5 mb-5 text-sm text-muted">Step 1 of 2: who you are.</p>
      <div className="grid gap-4">
        <FloatingLabelField
          data-testid="float-name"
          label="Full name"
          value={name}
          onValueChange={setName}
          autoComplete="name"
          name="name"
          clearLabel="Clear full name"
        />
        <FloatingLabelField
          data-testid="float-email"
          label="Work email"
          type="email"
          value={email}
          onValueChange={(v) => {
            setEmail(v);
            if (error) setError("");
          }}
          onBlur={(el) => setError(el.value && el.validity.typeMismatch ? "Enter an email like name@company.com." : "")}
          autoComplete="email"
          name="email"
          description="We send the sign-in link here."
          error={error}
          clearLabel="Clear work email"
        />
      </div>
    </form>
  );
}
