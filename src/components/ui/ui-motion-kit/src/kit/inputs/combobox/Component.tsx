import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Combobox } from '@/primitives/combobox';
import { DURATION, EASING_POINTS } from '@/engine/tokens';

export interface SearchComboboxProps {
  label: string;
  loadOptions: (query: string, signal: AbortSignal) => Promise<string[]>;
  onSelect?: (value: string | null) => void;
  disabled?: boolean;
}
/** Application-owned async search; aborted/stale responses never replace newer results. */
export function SearchCombobox({ label, loadOptions, onSelect, disabled }: SearchComboboxProps) {
  const id = useId();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [value, setValue] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    const timer = setTimeout(() => {
      loadOptions(query, controller.signal).then(next => {
        if (!controller.signal.aborted) { setItems(next); setLoading(false); }
      }).catch(() => {
        if (!controller.signal.aborted) { setItems([]); setError(true); setLoading(false); }
      });
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, loadOptions]);
  const status = loading ? 'Searching cities…' : error ? 'Could not load cities. Change the search to try again.' : items.length ? `${items.length} cities available.` : 'No cities found. Try a different search.';
  return <div className="w-full max-w-80" data-testid="combobox-widget">
    <Combobox.Root inline items={items} filter={null} value={value} inputValue={query} onInputValueChange={setQuery}
      onValueChange={next => { setValue(next); setQuery(next??''); setOpen(false); onSelect?.(next); }} open={open} onOpenChange={setOpen} disabled={disabled}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <div className="relative" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
      <Combobox.Input id={id} aria-describedby={`${id}-hint`} onFocus={()=>setOpen(true)} onChange={()=>setOpen(true)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);else if(event.key==='ArrowDown'||event.key==='ArrowUp')setOpen(true);}} placeholder="Search cities" className="h-11 w-full rounded-control border border-control-line bg-surface px-3 text-base text-ink placeholder:text-muted" />
      <AnimatePresence>
        {open && <motion.div data-testid="combobox-popup" className="absolute top-full z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-overlay border border-control-line bg-surface p-1 text-ink shadow-[var(--mk-shadow-overlay)]" initial={{opacity: reduced ? 1 : 0,y: reduced ? 0 : -6}} animate={{opacity:1,y:0}} exit={{opacity:reduced ? 1:0,y:reduced?0:-6,transition:{duration:reduced?0:DURATION.exit/1000}}} transition={{duration:reduced?0:DURATION.enter/1000,ease:[...EASING_POINTS.out]}}>
            <Combobox.List aria-busy={loading}>{(item: string) => {
              const index = item.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
              return <Combobox.Item key={item} value={item} disabled={loading} className="flex min-h-11 items-center rounded-control px-3 text-base data-[highlighted]:bg-secondary data-[selected]:font-semibold">
                <span>{index < 0 || !query ? item : <>{item.slice(0,index)}<strong className="underline underline-offset-2">{item.slice(index,index+query.length)}</strong>{item.slice(index+query.length)}</>}</span>
                <Combobox.ItemIndicator className="ml-auto pl-3" aria-hidden>✓</Combobox.ItemIndicator>
              </Combobox.Item>;
            }}</Combobox.List>
            <div className="px-3 py-2 text-sm text-muted" role="status">{status}</div>
          </motion.div>}
      </AnimatePresence>
      </div>
    </Combobox.Root>
    <p id={`${id}-hint`} className="mt-2 text-sm text-muted">Type a city, then use ↑ ↓ and Enter to choose.</p>
    <p role="status" data-testid="combobox-result" className="min-h-6 text-sm text-muted">{value ? `Selected: ${value}` : 'No city selected.'}</p>
  </div>;
}
const CITIES = ['Calgary', 'Cambridge', 'Canberra', 'Caracas', 'Lisbon', 'Oslo'];
const loadCities = (query: string, signal: AbortSignal): Promise<string[]> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => resolve(CITIES.filter(city => city.toLowerCase().includes(query.toLowerCase()))), 240);
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, {once:true});
});
export function Playground() { return <SearchCombobox label="Destination city" loadOptions={loadCities} />; }
