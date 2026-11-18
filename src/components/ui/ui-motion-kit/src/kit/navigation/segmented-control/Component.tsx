import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Radio, RadioGroup } from "@/primitives/radio-group";
import { EASING_POINTS } from "@/engine/tokens";
import { CONTENT_ENTER_DELAY, CONTENT_ENTER_MS, CONTENT_EXIT_MS, THUMB_MS } from "./timing";

/**
 * Segmented control: a single-choice group drawn as adjacent segments with a sliding thumb.
 *
 * Semantics: a radio group, not tabs. The choice is one setting (a range, a unit, a view) that
 * re-scopes the content below; there are no separate tabpanels, so tab roles would promise
 * structure that is not there. Behavior comes from the radio group
 * primitive (src/primitives/radio-group.tsx, Base UI): role="radiogroup" named by `label`,
 * role="radio" + aria-checked per option, one tab stop, arrow keys move and select, Space selects.
 * Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 *
 * Motion: the thumb is one shared-layout element (Motion `layoutId`) that travels to the checked
 * segment in 200 ms ease-out, no spring (a click, not a drag); the checked label darkens in 200 ms
 * and the label losing emphasis fades in 120 ms ease-in. Reduced motion: the thumb jumps (0 ms).
 */

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<V extends string> {
  /** Visible group label; also the radiogroup's accessible name. */
  label: string;
  options: readonly SegmentOption<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?(value: V): void;
  /** Hide the visible label (it stays the accessible name). */
  hideLabel?: boolean;
  name?: string;
}

export function SegmentedControl<V extends string>({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  hideLabel = false,
  name,
}: SegmentedControlProps<V>) {
  const id = useId();
  const [inner, setInner] = useState<V>(defaultValue ?? options[0]!.value);
  const current = value ?? inner;
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={`${id}-label`} className={hideLabel ? "sr-only-kit" : "text-[14px] font-medium text-muted"}>
        {label}
      </span>
      {/* A LayoutGroup per control keeps two controls on one page from sharing a thumb. */}
      <LayoutGroup id={id}>
        <RadioGroup
          aria-labelledby={`${id}-label`}
          name={name}
          value={current}
          onValueChange={(next) => {
            const v = next as V;
            if (value === undefined) setInner(v);
            onValueChange?.(v);
          }}
          className="relative flex max-w-full rounded-control bg-sunken p-[3px] shadow-[inset_0_0_0_1px_var(--mk-border)]"
        >
          {options.map((o) => (
            <Radio.Root
              key={o.value}
              value={o.value}
              data-segment={o.value}
              className="group relative inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-[7px] px-3 text-[15px] font-medium whitespace-nowrap text-muted transition-colors duration-120 ease-kit-in select-none pointer-coarse:h-11 data-[checked]:text-ink data-[checked]:duration-200 data-[checked]:ease-kit-out motion-reduce:transition-none"
            >
              {o.value === current ? (
                <motion.span
                  aria-hidden="true"
                  data-testid="segment-thumb"
                  layoutId="thumb"
                  className="absolute inset-0 rounded-[7px] border border-control-line bg-surface shadow-[0_1px_3px_rgb(10_12_16/0.12)]"
                  transition={{ duration: reduced ? 0 : THUMB_MS / 1000, ease: [...EASING_POINTS.out] }}
                />
              ) : null}
              {o.icon ? <span aria-hidden="true" className="relative hidden shrink-0 sm:inline-flex">{o.icon}</span> : null}
              <span className="relative">{o.label}</span>
            </Radio.Root>
          ))}
        </RadioGroup>
      </LayoutGroup>
    </div>
  );
}

/**
 * Crossfade for the content a segmented control re-scopes: the old content fades out 120 ms ease-in
 * while the new one fades in 200 ms ease-out with a 4 px settle, stacked in one grid cell so the
 * height never jumps. Reduced motion: an instant swap.
 */
export function SegmentFade({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <div className={`grid ${className}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={id}
          data-segment-content={id}
          className="col-start-1 row-start-1 min-w-0"
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0, transition: { duration: reduced ? 0 : CONTENT_ENTER_MS / 1000, delay: reduced ? 0 : CONTENT_ENTER_DELAY / 1000, ease: [...EASING_POINTS.out] } }}
          exit={{ opacity: 0, transition: { duration: reduced ? 0 : CONTENT_EXIT_MS / 1000, ease: [...EASING_POINTS.in] } }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const RANGES = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;
type Range = (typeof RANGES)[number]["value"];

const UNITS = [
  { value: "steps", label: "Steps" },
  { value: "km", label: "Distance" },
] as const;
type Unit = (typeof UNITS)[number]["value"];

/** Sample activity: steps per bucket, the period's name and three axis labels. */
const DATA: Record<Range, { period: string; buckets: number[]; axis: [string, string, string] }> = {
  day: { period: "today", buckets: [320, 760, 540, 1480, 1120, 1920, 1310, 790], axis: ["6 AM", "12 PM", "9 PM"] },
  week: { period: "this week", buckets: [7400, 9120, 6050, 10980, 8610, 4720, 7830], axis: ["Mon", "Thu", "Sun"] },
  month: { period: "this month", buckets: [21400, 26800, 31900, 23600, 37200, 29900, 41100, 33000, 36100, 25800], axis: ["Oct 1", "Oct 16", "Oct 30"] },
};
const KM_PER_STEP = 0.00075;
const fmt = (steps: number, unit: Unit) =>
  unit === "steps" ? `${steps.toLocaleString("en-US")} steps` : `${(steps * KM_PER_STEP).toLocaleString("en-US", { maximumFractionDigits: 1 })} km`;

export function Playground() {
  const [range, setRange] = useState<Range>("day");
  const [unit, setUnit] = useState<Unit>("steps");
  const data = DATA[range];
  const total = data.buckets.reduce((a, b) => a + b, 0);
  const peak = Math.max(...data.buckets);

  return (
    <div data-testid="segmented-control-playground" className="flex w-full max-w-[360px] flex-col gap-5">
      <section aria-labelledby="activity-title" className="flex flex-col gap-4 rounded-[12px] border border-line bg-surface p-4">
        <h3 id="activity-title" className="m-0 text-[16px] font-semibold text-ink">
          Activity
        </h3>
        <SegmentedControl<Range> label="Range" hideLabel options={RANGES} value={range} onValueChange={setRange} />
        <SegmentFade id={`${range}-${unit}`}>
          <p data-testid="segmented-result" className="m-0 text-[22px] font-semibold tracking-[-0.01em] text-ink tabular-nums">
            {fmt(total, unit)}
          </p>
          <p className="m-0 mt-1 text-[14px] text-muted">Total {data.period}</p>
          <div
            role="img"
            aria-label={`Bar chart of ${data.buckets.length} periods ${data.period}, peak ${fmt(peak, unit)}`}
            className="mt-4 flex h-[112px] items-end gap-[6px] border-b border-line"
          >
            {data.buckets.map((v, i) => (
              <span
                key={i}
                className={`min-w-0 flex-1 rounded-t-[4px] ${v === peak ? "bg-ink" : "bg-control-line"}`}
                style={{ height: `${Math.round((v / peak) * 100)}%` }}
              />
            ))}
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between text-[12px] text-muted">
            {data.axis.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        </SegmentFade>
      </section>
      <SegmentedControl<Unit> label="Units" options={UNITS} defaultValue="steps" onValueChange={setUnit} />
    </div>
  );
}
