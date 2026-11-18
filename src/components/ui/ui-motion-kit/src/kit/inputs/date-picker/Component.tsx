import { useContext, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DatePicker, DateInput, DateSegment, Label, Group, Button, Popover, Dialog, Calendar, Heading, CalendarGrid, CalendarCell, CalendarStateContext, Text, FieldError, I18nProvider, type DateValue, type DatePickerProps } from '@/primitives/react-aria';
import { DURATION, EASING_POINTS } from '@/engine/tokens';
import './date-picker.css';

function MonthGrid() {
  const state = useContext(CalendarStateContext)!;
  const reduced = useReducedMotion();
  const month = state.visibleRange.start.toString();
  return <motion.div key={month} data-testid="date-picker-month" initial={{opacity:reduced?1:0,x:reduced?0:12}} animate={{opacity:1,x:0}} transition={{duration:reduced?0:DURATION.enter/1000,ease:[...EASING_POINTS.out]}}>
    <CalendarGrid>{date => <CalendarCell date={date} className="date-picker-cell">{({formattedDate,isSelected}) =>
      <motion.span className="date-picker-day" animate={{scale:reduced?1:isSelected?[.9,1]:1}} transition={{duration:reduced?0:DURATION.enter/1000}}>{formattedDate}</motion.span>
    }</CalendarCell>}</CalendarGrid>
  </motion.div>;
}

export interface AccessibleDatePickerProps extends Omit<DatePickerProps<DateValue>, 'children'> {
  label: string;
  hint?: string;
}
/** minValue/maxValue and locale formatting are supplied by React Aria, without custom date parsing. */
export function AccessibleDatePicker({label,hint,...props}:AccessibleDatePickerProps) {
  const reduced=useReducedMotion();
  return <DatePicker {...props} className="date-picker w-full max-w-80" data-testid="date-picker-widget">
    <Label data-testid="date-picker-label" className="mb-2 block text-sm font-medium text-ink">{label}</Label>
    <Group className="flex min-h-11 items-center rounded-control border border-control-line bg-surface text-ink">
      <DateInput className="flex min-w-0 flex-1 px-3 text-base">{segment=><DateSegment segment={segment} className="rounded px-0.5 data-[placeholder]:text-muted focus:bg-secondary"/>}</DateInput>
      <Button aria-label="Choose date" className="m-1 min-h-10 min-w-10 rounded-control bg-secondary text-ink" data-testid="date-picker-trigger">▦</Button>
    </Group>
    {hint&&<Text slot="description" className="mt-2 block text-sm text-muted">{hint}</Text>}
    <FieldError className="mt-2 block text-sm text-ink"/>
    <Popover offset={8} className="date-picker-popover z-50 max-w-[calc(100vw-16px)] rounded-overlay border border-control-line bg-surface p-3 text-ink shadow-[var(--mk-shadow-overlay)]">
      <Dialog aria-label={label}>
        <motion.div data-testid="date-picker-popup" initial={{opacity:reduced?1:0}} animate={{opacity:1}} transition={{duration:reduced?0:DURATION.enter/1000}}>
          <Calendar aria-label={label}>
            <header className="mb-2 flex items-center justify-between gap-2">
              <Button slot="previous" aria-label="Previous month" className="min-h-10 min-w-10 rounded-control border border-control-line">‹</Button>
              <Heading className="m-0 text-base font-semibold"/>
              <Button slot="next" aria-label="Next month" className="min-h-10 min-w-10 rounded-control border border-control-line">›</Button>
            </header>
            <MonthGrid/>
          </Calendar>
        </motion.div>
      </Dialog>
    </Popover>
  </DatePicker>;
}

export function Playground() {
 const [value,setValue]=useState<DateValue|null>(null);
 return <I18nProvider locale="en-US"><div className="w-full max-w-80">
   <AccessibleDatePicker label="Review date" value={value} onChange={setValue} minValue={value?.set({year:2026,month:1,day:1})} maxValue={value?.set({year:2026,month:12,day:31})} hint="Choose a date in 2026. Use arrows to edit each date segment." isDateUnavailable={date=>date.year!==2026}/>
   <p role="status" data-testid="date-picker-result" className="mt-3 text-sm text-muted">{value?`Selected: ${new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'}).format(value.toDate('UTC'))}`:'No date selected.'}</p>
 </div></I18nProvider>;
}
