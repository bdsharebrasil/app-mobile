import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Clock3, Plane, RefreshCw, Search, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type DiarioAeronaveResumo } from '@/lib/api-client';
import { LottieAirplaneSpinner } from '@/components/ui/lottie-airplane-spinner';

interface Props {
  onSelect: (id: string, registration: string, imageUrl: string | null) => void;
  onBack: () => void;
}

const decimalToHM = (decimal?: number | null): string => {
  if (decimal === null || decimal === undefined || Number.isNaN(decimal)) return '—';
  const totalMinutes = Math.round(Math.abs(decimal) * 60);
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`;
};

function AircraftPhoto({ aircraft }: { aircraft: DiarioAeronaveResumo }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#19395d] via-[#0d2947] to-[#06172d] sm:h-48">
      {aircraft.image_url && !imageFailed ? (
        <img
          src={aircraft.image_url}
          alt={`${aircraft.matricula_registro} ${aircraft.modelo || 'aeronave'}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-white/30">
          <Plane className="h-16 w-16" strokeWidth={1.1} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#031326] via-[#031326]/20 to-black/5" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="min-w-0 text-left">
          <p className="truncate text-xl font-bold tracking-wide text-white">{aircraft.matricula_registro}</p>
          <p className="truncate text-xs text-slate-200/85">{[aircraft.fabricante, aircraft.modelo].filter(Boolean).join(' ') || 'Aeronave'}</p>
        </div>
        <span className={`mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${Number(aircraft.celula_disponivel_ttotal) < 0 ? 'border-amber-200/30 bg-amber-300/15 text-amber-100' : 'border-emerald-200/30 bg-emerald-300/15 text-emerald-100'}`}>
          {Number(aircraft.celula_disponivel_ttotal) < 0 ? <Wrench className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {Number(aircraft.celula_disponivel_ttotal) < 0 ? 'Revisão vencida' : 'Ativa'}
        </span>
      </div>
    </div>
  );
}

export const MobileDiarioAircraftSelector: React.FC<Props> = ({ onSelect, onBack }) => {
  const year = new Date().getFullYear();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['diario-aircraft-list', year],
    queryFn: () => apiClient.getDiarioResumo(year),
  });
  const aircraft = data?.aeronaves || [];
  const term = search.trim().toLocaleLowerCase('pt-BR');
  const filteredAircraft = term
    ? aircraft.filter((item) => `${item.matricula_registro} ${item.fabricante || ''} ${item.modelo || ''}`.toLocaleLowerCase('pt-BR').includes(term))
    : aircraft;

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-background pb-8">
      <header className="sticky top-[max(24px,env(safe-area-inset-top))] z-30 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <button type="button" onClick={onBack} aria-label="Voltar ao Dashboard" className="flex h-11 min-w-11 items-center gap-1 rounded-xl pr-2 text-primary active:scale-95">
            <ArrowLeft className="h-5 w-5" /><span className="text-sm font-medium">Voltar</span>
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-foreground">Diário de Bordo</h1>
          <button type="button" onClick={() => void refetch()} disabled={isFetching} aria-label="Atualizar aeronaves" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground active:scale-95 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5 sm:px-6">
        <section className="mb-4 mt-1 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#122744] to-[#08172b] px-5 py-4 text-white shadow-xl shadow-black/10">
          <div className="flex items-start justify-between gap-3 text-[13px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Operação · {year}</p>
              <h2 className="mt-2 text-[16px] font-bold tracking-tight">Escolha uma aeronave</h2>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">{aircraft.length}</span> aeronaves ativas
            <span className="h-1 w-1 rounded-full bg-slate-500" />
          </div>
        </section>

        <label className="mb-4 flex h-12 items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar aeronave"
            placeholder="Buscar matrícula, fabricante ou modelo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center"><LottieAirplaneSpinner size="md" text="Carregando aeronaves do D1..." /></div>
        ) : isError ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 px-5 py-10 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 font-semibold text-foreground">Não foi possível carregar as aeronaves</p>
            <p className="mt-1 text-sm text-muted-foreground">Confira sua conexão e tente novamente.</p>
            <button type="button" onClick={() => void refetch()} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground active:scale-95"><RefreshCw className="h-4 w-4" /> Tentar novamente</button>
          </div>
        ) : filteredAircraft.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredAircraft.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id, item.matricula_registro, item.image_url)}
                aria-label={`Abrir Diário de Bordo da aeronave ${item.matricula_registro}`}
                className="group overflow-hidden rounded-3xl border border-border/70 bg-card text-left shadow-lg shadow-black/[0.04] transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl active:scale-[0.99]"
              >
                <AircraftPhoto aircraft={item} />
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-muted/60 p-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><Clock3 className="h-3.5 w-3.5 text-primary" /> Célula atual</p>
                      <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">{decimalToHM(item.celula_atual_ttotal)}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/60 p-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><Wrench className="h-3.5 w-3.5 text-primary" /> Próxima revisão</p>
                      <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">{decimalToHM(item.celula_prox_revisao_ttotal)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="truncate text-xs text-muted-foreground"><span className="font-semibold text-foreground">{decimalToHM(item.horas_ano)}</span> voadas em {year}</p>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><ChevronRight className="h-4 w-4" /></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border px-5 py-12 text-center">
            <Plane className="mx-auto h-9 w-9 text-muted-foreground/50" />
            <p className="mt-3 font-semibold text-foreground">{search ? 'Nenhuma aeronave corresponde à busca' : 'Nenhuma aeronave ativa'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{search ? 'Tente outra matrícula ou modelo.' : 'As aeronaves ativas serão exibidas aqui quando disponíveis no D1.'}</p>
          </div>
        )}
      </main>
    </div>
  );
};
