import { piecesByFamily } from "@/kit/registry";
import { DemoPlayer } from "./DemoPlayer";
import { Link } from "./router";

const FAMILY_LABEL: Record<string, string> = {
  overlays: "Overlays",
  feedback: "Feedback",
  navigation: "Navigation",
  inputs: "Inputs",
  content: "Content",
  "micro-interactions": "Micro-interactions",
  transitions: "Transitions",
};

export function Home() {
  const groups = piecesByFamily();
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 pt-10 pb-20 sm:px-8 sm:pt-14">
      <div className="max-w-[640px]">
        <h1 className="m-0 text-[clamp(28px,4vw,40px)] leading-[1.1] font-semibold tracking-[-0.02em]">Animated UI patterns</h1>
        <p className="mt-3 mb-0 text-[16px] leading-relaxed text-muted">
          Each card loops one interaction pattern. Open a card for the real, accessible component, its timing and the exact term to ask
          Claude or Codex for.
        </p>
      </div>
      {groups.map(([family, list]) => (
        <section key={family} aria-labelledby={`family-${family}`} className="mt-12">
          <h2 id={`family-${family}`} className="m-0 mb-5 text-[14px] font-medium tracking-[0.02em] text-muted uppercase">
            {FAMILY_LABEL[family] ?? family}
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-x-8 gap-y-10 p-0 sm:grid-cols-2 xl:grid-cols-3" data-testid="card-grid">
            {list.map((piece) => (
              <li key={piece.meta.slug}>
                <Link
                  href={`/kit/${piece.meta.slug}`}
                  data-card={piece.meta.slug}
                  aria-label={`${piece.meta.name}: ${piece.meta.summary}`}
                  className="block rounded-[18px] p-2 no-underline transition-transform duration-120 ease-kit-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <DemoPlayer piece={piece} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
