import { useState } from 'react';
import { Check, ChevronDown, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ExistingFlightOption {
  id: string;
  number: string;
  route: string;
  date: string;
}

interface FlightNumberComboboxProps {
  value: string;
  options: ExistingFlightOption[];
  monthLabel: string;
  isLoading?: boolean;
  onChange: (value: string) => void;
}

export function FlightNumberCombobox({
  value,
  options,
  monthLabel,
  isLoading = false,
  onChange,
}: FlightNumberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleUpperCase('pt-BR');
  const hasExactMatch = options.some((option) => option.number.trim().toLocaleUpperCase('pt-BR') === normalizedQuery);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setQuery('');
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Selecionar número do voo"
          aria-expanded={open}
          className={`mt-1 h-12 w-full min-w-0 justify-between rounded-xl bg-background px-3 font-normal ${value ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Plane aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate">{value || 'Buscar ou digitar número'}</span>
          </span>
          <ChevronDown aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command>
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar voo ou digitar um número..."
            aria-label="Buscar número de voo"
            className="h-12 text-base"
          />
          <CommandList className="max-h-[min(55dvh,22rem)] overscroll-contain">
            <CommandEmpty>
              {isLoading ? 'Carregando voos registrados…' : `Nenhum voo encontrado em ${monthLabel}. Digite um número novo.`}
            </CommandEmpty>
            {options.length > 0 && (
              <CommandGroup heading={`Voos já lançados (${options.length})`}>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.number} ${option.route} ${option.date}`}
                    onSelect={() => choose(option.number)}
                    className="min-h-[56px] items-start gap-2 px-3 py-2.5"
                  >
                    <Check aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${value === option.number ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-foreground">{option.number}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {option.route} · {option.date}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {normalizedQuery && !hasExactMatch && (
              <CommandGroup heading="Novo número">
                <CommandItem
                  value={`novo numero ${normalizedQuery}`}
                  onSelect={() => choose(normalizedQuery)}
                  className="min-h-11 px-3 py-2.5 text-sm"
                >
                  Usar “{normalizedQuery}” neste lançamento
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
