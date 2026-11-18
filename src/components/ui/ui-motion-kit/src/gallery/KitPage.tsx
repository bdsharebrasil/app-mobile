import { Suspense, lazy, useEffect, useId, useMemo, useState } from "react";
import { usePlayback } from "@/engine/playhead";
import type { Piece } from "@/kit/registry";
import { Button } from "@/ui/Button";
import { DemoPlayer } from "./DemoPlayer";
import { Link } from "./router";

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(2)} s`;
}

function CopyTerm({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      className="h-9 shrink-0 px-3 text-[14px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy prompt"}</span>
    </Button>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function KitPage({ piece }: { piece: Piece }) {
  const { meta } = piece;
  const [localPaused, setLocalPaused] = useState<boolean | undefined>(undefined);
  // The global Pause/Play control takes over again whenever it changes.
  const { paused: globalPaused } = usePlayback();
  useEffect(() => setLocalPaused(undefined), [globalPaused]);
  const scrubId = useId();
  const Playground = useMemo(() => lazy(async () => ({ default: (await piece.loadComponent()).Playground })), [piece]);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 pt-8 pb-20 sm:px-8">
      <Link href="/" className="rounded-control text-[15px] text-muted underline-offset-4 hover:underline">
        ← All patterns
      </Link>
      <h1 className="mt-5 mb-0 text-[clamp(28px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.02em]">{meta.name}</h1>
      <p className="mt-3 mb-0 max-w-[640px] text-[16px] leading-relaxed text-muted">{meta.summary}</p>

      <section aria-label="Animated demo" className="mt-8">
        <div className="mx-auto w-full max-w-[720px]">
          <DemoPlayer piece={piece} showLabel={false} paused={localPaused} expose>
            {(playhead) => (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  className="w-[88px]"
                  onClick={() => setLocalPaused(playhead.playing)}
                  aria-label={playhead.playing ? "Pause demo" : "Play demo"}
                >
                  {playhead.playing ? "Pause" : "Play"}
                </Button>
                <label htmlFor={scrubId} className="sr-only-kit">
                  Playhead
                </label>
                <input
                  id={scrubId}
                  type="range"
                  min={0}
                  max={piece.demo.timeline.duration}
                  step={10}
                  value={Math.round(playhead.t)}
                  onChange={(e) => {
                    setLocalPaused(true);
                    playhead.seek(Number(e.currentTarget.value));
                  }}
                  aria-valuetext={seconds(playhead.t)}
                  className="min-w-0 flex-1 accent-[var(--mk-accent)]"
                />
                <output className="shrink-0 text-right font-mono text-[14px] whitespace-nowrap text-muted tabular-nums" aria-hidden="true">
                  {seconds(playhead.t)} / {seconds(piece.demo.timeline.duration)}
                </output>
              </div>
            )}
          </DemoPlayer>
        </div>
      </section>

      <section aria-labelledby="live-heading" className="mt-14">
        <h2 id="live-heading" className="m-0 text-[20px] font-semibold tracking-[-0.01em]">
          Live component
        </h2>
        <p className="mt-2 mb-0 text-[15px] text-muted">The real, reusable component. Try it with the keyboard too; the Accessibility notes below list the keys this pattern uses.</p>
        <div className="mt-5 grid min-h-[200px] place-items-center rounded-panel border border-line bg-sunken p-8">
          <Suspense fallback={<p className="m-0 text-[15px] text-muted">Loading component…</p>}>
            <Playground />
          </Suspense>
        </div>
      </section>

      <section aria-labelledby="sheet-heading" className="mt-14">
        <h2 id="sheet-heading" className="m-0 text-[20px] font-semibold tracking-[-0.01em]">
          Pattern sheet
        </h2>
        <dl className="mt-5 grid gap-x-10 gap-y-8 md:grid-cols-2">
          <div className="md:col-span-2">
            <dt className="text-[14px] font-medium text-muted">Say this to Claude or Codex</dt>
            <dd className="m-0 mt-2">
              <p className="m-0 text-[17px] font-semibold">{meta.promptTerm}</p>
              <div className="mt-3 flex flex-col gap-3 rounded-panel border border-line bg-sunken p-4 sm:flex-row sm:items-start">
                <p className="m-0 flex-1 font-mono text-[14px] leading-relaxed">{meta.promptExample}</p>
                <CopyTerm text={meta.promptExample} />
              </div>
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-medium text-muted">When to use</dt>
            <dd className="m-0 mt-2">
              <List items={meta.whenToUse} />
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-medium text-muted">Avoid when</dt>
            <dd className="m-0 mt-2">
              <List items={meta.avoidWhen} />
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-medium text-muted">Timing and easing</dt>
            <dd className="m-0 mt-2">
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                {meta.timing.map((t) => (
                  <li key={t.phase} className="flex flex-col">
                    <span>
                      {t.phase}: <strong className="font-semibold">{t.ms} ms</strong>
                    </span>
                    <span className="font-mono text-[13px] text-muted">{t.easing}</span>
                  </li>
                ))}
                <li className="text-[15px]">
                  Demo loop: <strong className="font-semibold">{meta.loopMs} ms</strong>
                </li>
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-medium text-muted">Accessibility</dt>
            <dd className="m-0 mt-2">
              <List items={meta.a11y} />
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-medium text-muted">Also called</dt>
            <dd className="m-0 mt-2 text-[15px]">{meta.aliases.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-[14px] font-medium text-muted">Built on</dt>
            <dd className="m-0 mt-2">
              <List items={meta.primitives} />
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
