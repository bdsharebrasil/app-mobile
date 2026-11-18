import { useState, type ReactNode } from "react";
import { Slider } from "@/primitives/slider";
import "./slider.css";

/**
 * Slider: a labeled numeric input with a filled track, a draggable thumb and a value bubble.
 *
 * Behavior comes from the slider primitive (src/primitives/slider.tsx, Base UI): each thumb wraps
 * a native <input type="range"> (role slider, aria-valuemin/max/now), arrows change one step,
 * PageUp/PageDown change `largeStep`, Home/End reach the bounds, and range sliders keep the two
 * thumbs in order. Pointer drags and track presses move the thumb directly under the pointer.
 * Motion (slider.css): the bubble fades in 180 ms ease-out on hover, drag or keyboard focus and
 * out 120 ms ease-in; keyboard value changes ease the thumb and fill over 180 ms. The component
 * marks those changes with data-keyboard on the root, read from the change reason Base UI reports.
 * Reduced motion: value, geometry and bubble change at once.
 */

export interface ValueSliderProps {
  label: ReactNode;
  /** A number for one thumb, a pair for a range with two thumbs. */
  value: number | readonly number[];
  onValueChange(value: number | readonly number[]): void;
  min: number;
  max: number;
  step?: number;
  largeStep?: number;
  /** Text for a value, used by the bubble, the output and aria-valuetext. */
  format(value: number): string;
  /** Range mode: the accessible name of each thumb ("Minimum price", "Maximum price"). */
  thumbLabels?: readonly [string, string];
  disabled?: boolean;
  name?: string;
  "data-testid"?: string;
}

export function ValueSlider({
  label,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  largeStep = 10,
  format,
  thumbLabels,
  disabled = false,
  name,
  "data-testid": testId,
}: ValueSliderProps) {
  // Keyboard steps ease; drags and track presses (any other reason) follow the pointer.
  const [keyboard, setKeyboard] = useState(false);
  const values = typeof value === "number" ? [value] : value;

  return (
    <Slider.Root
      data-testid={testId}
      data-keyboard={keyboard ? "" : undefined}
      className="mk-slider"
      value={value}
      onValueChange={(next, details) => {
        setKeyboard(details.reason === "keyboard");
        onValueChange(next);
      }}
      min={min}
      max={max}
      step={step}
      largeStep={largeStep}
      disabled={disabled}
      name={name}
    >
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <Slider.Label className="text-[15px] leading-snug font-medium text-ink">{label}</Slider.Label>
        <Slider.Value className="text-sm text-muted tabular-nums">
          {(_, vs) => vs.map(format).join(" to ")}
        </Slider.Value>
      </div>
      <Slider.Control className="mk-slider-control flex h-11 cursor-pointer touch-none items-center select-none data-[disabled]:cursor-not-allowed">
        <Slider.Track className="relative h-1 w-full rounded-full bg-control-line">
          <Slider.Indicator className="mk-slider-indicator rounded-full bg-accent" />
          {values.map((v, i) => (
            <Slider.Thumb
              key={i}
              index={i}
              className="mk-slider-thumb"
              getAriaLabel={thumbLabels ? (index) => thumbLabels[index] ?? "" : undefined}
              getAriaValueText={(_, n) => format(n)}
            >
              <span aria-hidden="true" className="mk-slider-bubble">
                {format(v)}
              </span>
            </Slider.Thumb>
          ))}
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

const usd = (n: number) => `$${n}`;
const seats = (n: number) => `${n} ${n === 1 ? "seat" : "seats"}`;

/**
 * Live example for /kit/slider: a plan estimator with a single "Team seats" slider and a
 * two-thumb "Price range" filter, the same card the demo shows.
 */
export function Playground() {
  const [team, setTeam] = useState<number | readonly number[]>(12);
  const [price, setPrice] = useState<number | readonly number[]>([80, 320]);
  return (
    <div className="w-full max-w-[480px] rounded-panel border border-line bg-surface p-5">
      <p className="m-0 text-base font-semibold text-ink">Plan estimator</p>
      <p className="m-0 mt-0.5 mb-6 text-sm text-muted">Drag, or focus a thumb and use the arrow keys.</p>
      <div className="grid gap-6">
        <ValueSlider
          data-testid="slider-seats"
          label="Team seats"
          value={team}
          onValueChange={setTeam}
          min={1}
          max={50}
          largeStep={5}
          format={seats}
          name="seats"
        />
        <ValueSlider
          data-testid="slider-price"
          label="Price range"
          value={price}
          onValueChange={setPrice}
          min={0}
          max={500}
          step={10}
          largeStep={50}
          format={usd}
          thumbLabels={["Minimum price", "Maximum price"]}
          name="price"
        />
      </div>
    </div>
  );
}
