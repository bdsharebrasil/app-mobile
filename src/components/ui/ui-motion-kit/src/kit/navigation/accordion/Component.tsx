import { useId, useState, type ReactNode } from "react";
import { Accordion } from "@/primitives/accordion";

/**
 * Accordion: a stack of headings that expand and collapse their sections.
 *
 * Behavior comes from the accordion primitive (src/primitives/accordion.tsx, Base UI): a button
 * inside each heading with aria-expanded and aria-controls, a labelled region per panel,
 * Enter/Space to toggle, single (default) or multiple open sections. Closed panels are removed
 * from the page, so their links cannot take focus.
 * Motion: the panel height animates to its measured auto height (--accordion-panel-height) in
 * 240 ms ease-out when opening and 180 ms ease-in when closing; the chevron turns with the same
 * curves. Reduced motion: both change in 0 ms.
 */

export const ENTER_MS = 240;
export const EXIT_MS = 180;

export interface AccordionItem {
  value: string;
  title: string;
  content: ReactNode;
}

export interface AccordionListProps {
  items: readonly AccordionItem[];
  /** Allow several sections open at once. Default: one at a time. */
  multiple?: boolean;
  defaultValue?: string[];
  value?: string[];
  onValueChange?(value: string[]): void;
  /** Heading level of each item's heading. */
  headingLevel?: 2 | 3 | 4;
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0 text-muted transition-transform duration-180 ease-kit-in group-data-[panel-open]:rotate-180 group-data-[panel-open]:duration-240 group-data-[panel-open]:ease-kit-out motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function AccordionList({ items, multiple = false, defaultValue, value, onValueChange, headingLevel = 3 }: AccordionListProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <Accordion.Root
      multiple={multiple}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange ? (next) => onValueChange(next as string[]) : undefined}
      className="w-full divide-y divide-line rounded-panel border border-line bg-surface px-2"
    >
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Header render={<Heading className="m-0" />}>
            <Accordion.Trigger className="group my-1 flex min-h-11 w-full items-center justify-between gap-3 rounded-control bg-transparent px-3 py-2 text-left text-[15px] font-medium text-ink hover:bg-sunken">
              <span className="min-w-0">{item.title}</span>
              <Chevron />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel
            data-testid={`panel-${item.value}`}
            className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height] duration-240 ease-kit-out data-[ending-style]:h-0 data-[ending-style]:duration-180 data-[ending-style]:ease-kit-in data-[starting-style]:h-0 motion-reduce:transition-none"
          >
            <div className="px-3 pt-1 pb-4 text-[14px] leading-6 text-muted">{item.content}</div>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

const FAQ: readonly AccordionItem[] = [
  { value: "plans", title: "Can I change plans later?", content: "Yes. Upgrades apply right away; downgrades start at the next billing date." },
  {
    value: "refunds",
    title: "Do you offer refunds?",
    content: (
      <>
        Within 14 days of your first payment.{" "}
        <a href="#refund-policy" className="font-medium text-ink underline underline-offset-2">
          Read the refund policy
        </a>
      </>
    ),
  },
  { value: "teams", title: "Is there a team discount?", content: "Teams of five or more get 15% off every seat." },
];

export function Playground() {
  const [multiple, setMultiple] = useState(false);
  const id = useId();
  return (
    <div data-testid="accordion-playground" className="flex w-full max-w-[440px] flex-col gap-4">
      <AccordionList key={String(multiple)} items={FAQ} multiple={multiple} defaultValue={["plans"]} />
      <label htmlFor={id} className="inline-flex items-center gap-2 self-start text-[14px] text-muted">
        <input id={id} type="checkbox" className="size-4 accent-accent" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />
        Allow several open sections
      </label>
    </div>
  );
}
