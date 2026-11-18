import { STAGE } from "@/engine/tokens";
import { Stage, TEMPLATES, Window } from "@/wireframe";

/**
 * The shared page layouts every demo is drawn on. Static (no timeline): this is the reference
 * contributors pick from, so each one shows its name, what it is for and its target names.
 */
export function TemplatesPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 pt-10 pb-20 sm:px-8 sm:pt-14">
      <div className="max-w-[640px]">
        <h1 className="m-0 text-[clamp(28px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.02em]">Page templates</h1>
        <p className="mt-3 mb-0 text-[16px] leading-relaxed text-muted">
          Every pattern plays on one of these layouts. Pick the one closest to where the pattern lives in a real product, then
          press its named targets.
        </p>
      </div>
      <ul className="m-0 mt-12 grid list-none grid-cols-1 gap-x-8 gap-y-12 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {TEMPLATES.map((t) => (
          <li key={t.id} data-template={t.id}>
            <Stage height={STAGE.windowH}>
              <div aria-hidden="true">
                <Window>
                  <t.Page />
                </Window>
              </div>
            </Stage>
            <h2 className="m-0 mt-5 text-[18px] font-semibold tracking-[-0.01em]">{t.name}</h2>
            <p className="mt-1.5 mb-0 text-[15px] leading-relaxed text-muted">{t.use}</p>
            <p className="mt-2 mb-0 text-[13px] leading-relaxed text-muted">
              <span className="font-medium text-ink">Targets:</span> {Object.keys(t.targets).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
