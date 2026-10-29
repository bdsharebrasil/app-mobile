import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, RefreshCw } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileDiarioAircraftSelector } from '@/components/diario/MobileDiarioAircraftSelector';
import { MobileDiarioEntryForm } from '@/components/diario/MobileDiarioEntryForm';
import { apiClient } from '@/lib/api-client';

type FlowStep = 'select-aircraft' | 'aircraft-logbook' | 'new-entry';
type Flight = { id: string; numero_voo: string | null; status: string; aeronave_id: string | null; matricula_registro: string | null; origem: string | null; destino: string | null; data_agendada: string };
const timeLabel = (value?: string | null) => value ? String(value).slice(0, 5) : '—';
const hoursLabel = (value?: unknown) => `${(Number(value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;
const monthLabel = (year: number, month: number) => new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const DiarioBordo = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<FlowStep>('select-aircraft');
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [selectedAircraftReg, setSelectedAircraftReg] = useState('');
  const [selectedAircraftImage, setSelectedAircraftImage] = useState<string | null>(null);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const details = useQuery({
    queryKey: ['diario-detalhes', selectedAircraftId, viewYear, viewMonth],
    queryFn: () => apiClient.getDiarioDetalhes(selectedAircraftId!, viewYear, viewMonth),
    enabled: Boolean(selectedAircraftId && step === 'aircraft-logbook'),
  });
  const startedJourney = useQuery({
    queryKey: ['diario-jornada-iniciada', selectedAircraftId],
    enabled: Boolean(selectedAircraftId && step === 'aircraft-logbook'),
    queryFn: async () => {
      const response = await apiClient.get<{ voos: Flight[] }>('/api/colaborador/meus-voos');
      const candidates = (response.voos || []).filter((flight) => flight.aeronave_id === selectedAircraftId && !['encerrada', 'concluida'].includes(String(flight.status).trim().toLowerCase()));
      for (const flight of candidates) {
        try {
          const journey = await apiClient.get<{ id?: string; status?: string } | null>(`/api/interno/agendamento/${encodeURIComponent(flight.id)}/jornada`);
          if (journey?.id && String(journey.status || '').trim().toLowerCase() !== 'encerrada') return { flight, journey };
        } catch {
          // Falha ao consultar operações não deve impedir a consulta nem a criação de lançamentos.
        }
      }
      return null;
    },
  });
  const activeFlight = startedJourney.data?.flight;
  const diary = details.data?.diario_mes;
  const aircraft = details.data?.aeronave;
  const canCreate = Boolean(diary?.id) && !Number(diary?.fechado);

  const handleSelectAircraft = (id: string, registration: string, imageUrl: string | null) => {
    setSelectedAircraftId(id);
    setSelectedAircraftReg(registration);
    setSelectedAircraftImage(imageUrl);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setStep('aircraft-logbook');
  };
  const resetAircraft = () => {
    setStep('select-aircraft');
    setSelectedAircraftId(null);
    setSelectedAircraftReg('');
    setSelectedAircraftImage(null);
  };
  const handleBack = () => step === 'new-entry' ? setStep('aircraft-logbook') : resetAircraft();
  const handleSaved = () => {
    void details.refetch();
    setStep('aircraft-logbook');
  };
  const changeMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth - 1 + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
  };
  const monthIsFuture = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth >= today.getMonth() + 1);
  const monthIsCurrent = viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  return (
    <MobileLayout hideTabBar={step === 'new-entry'}>
      {step === 'select-aircraft' && <MobileDiarioAircraftSelector onSelect={handleSelectAircraft} onBack={() => navigate('/')} />}
      {step === 'aircraft-logbook' && selectedAircraftId && (
        <main className="min-h-[calc(100dvh-5rem)] bg-[#071326] px-4 pb-28 pt-4 text-white sm:px-6">
          <div className="mx-auto my-[26px] max-w-2xl px-[17px]">
            <header className="mb-4 flex items-center gap-3">
              <button type="button" onClick={resetAircraft} aria-label="Voltar para aeronaves" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/[0.06]"><ArrowLeft className="h-5 w-5" /></button>
              <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Diário de bordo</p><h1 className="truncate text-xl font-bold">{selectedAircraftReg}</h1></div>
              <button type="button" onClick={() => { void details.refetch(); void startedJourney.refetch(); }} aria-label="Atualizar diário" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/[0.06]"><RefreshCw className={`h-4 w-4 ${details.isFetching || startedJourney.isFetching ? 'animate-spin' : ''}`} /></button>
            </header>

            <section className="mb-4 overflow-hidden rounded-3xl border border-white/10 bg-[#101e33]">
              {selectedAircraftImage && <img src={selectedAircraftImage} alt={`Aeronave ${selectedAircraftReg}`} className="h-36 w-full object-cover" />}
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-sky-300">Aeronave</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Matrícula</p><p className="mt-1 truncate text-sm font-bold">{aircraft?.matricula_registro || selectedAircraftReg}</p></div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Modelo</p><p className="mt-1 truncate text-sm font-bold">{aircraft?.modelo || '—'}</p></div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fabricante</p><p className="mt-1 truncate text-sm font-bold">{aircraft?.fabricante || '—'}</p></div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Base</p><p className="mt-1 truncate text-sm font-bold">{diary?.aerodromo_base || aircraft?.base || '—'}</p></div>
                </div>
              </div>
            </section>

            <section className="mb-4 rounded-3xl border border-white/10 bg-[#101e33] p-4">
              <div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-violet-300"><Clock3 className="h-4 w-4" /> Célula</h2><span className="text-[10px] text-slate-500">horas totais</span></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Anterior</p><p className="mt-1 text-sm font-bold tabular-nums">{hoursLabel(diary?.celula_anterior_ttotal)}</p></div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Atual</p><p className="mt-1 text-sm font-bold tabular-nums">{hoursLabel(diary?.celula_atual_ttotal)}</p></div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Próx. revisão</p><p className="mt-1 text-sm font-bold tabular-nums">{hoursLabel(diary?.celula_prox_revisao_ttotal)}</p></div>
                <div className="rounded-xl border border-white/[0.08] bg-[#0a1729] p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Disponível</p><p className={`mt-1 text-sm font-bold tabular-nums ${Number(diary?.celula_disponivel_ttotal || 0) < 20 ? 'text-amber-300' : 'text-emerald-300'}`}>{hoursLabel(diary?.celula_disponivel_ttotal)}</p></div>
              </div>
            </section>

            <section className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-[#101e33] p-2.5">
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/[0.07]"><ChevronLeft className="h-5 w-5" /></button>
              <div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Período do diário</p><p className="mt-0.5 text-sm font-bold capitalize">{monthLabel(viewYear, viewMonth)}</p></div>
              <button type="button" onClick={() => changeMonth(1)} disabled={monthIsFuture} aria-label="Próximo mês" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/[0.07] disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
            </section>

            {activeFlight && <aside className="mb-4 flex gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] p-4" role="status"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><div><p className="text-sm font-semibold text-amber-100">Jornada iniciada</p><p className="mt-1 text-xs leading-5 text-amber-50/80">Há uma jornada em andamento{activeFlight.numero_voo ? ` no voo ${activeFlight.numero_voo}` : ''}{activeFlight.origem || activeFlight.destino ? `, ${activeFlight.origem || '—'} → ${activeFlight.destino || '—'}` : ''}. Você pode preencher e concluir o lançamento agora ou depois; é opcional, e qualquer usuário pode registrar lançamentos no diário.</p></div></aside>}

            <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-base font-bold">Lançamentos</h2><p className="mt-0.5 text-[11px] text-slate-400">{monthIsCurrent ? 'Mês atual' : monthLabel(viewYear, viewMonth)} · {details.data?.lancamentos?.length || 0} registros</p></div><button type="button" onClick={() => setStep('new-entry')} disabled={!canCreate} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-300 px-3.5 text-sm font-bold text-[#062018] disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /> Novo lançamento</button></div>
            {!diary?.id && !details.isLoading && <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">Não há diário aberto para {monthLabel(viewYear, viewMonth)}. Não é possível incluir lançamentos neste período.</div>}
            {diary?.id && Number(diary.fechado) === 1 && <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">O diário de {monthLabel(viewYear, viewMonth)} está fechado e não aceita novos lançamentos.</div>}
            {details.isLoading ? <div className="rounded-2xl border border-white/10 bg-[#101e33] p-8 text-center text-sm text-slate-400">Carregando lançamentos…</div> : details.isError ? <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.07] p-5 text-center"><p className="text-sm text-rose-100">Não foi possível carregar o diário.</p><button type="button" onClick={() => void details.refetch()} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm"><RefreshCw className="h-4 w-4" /> Tentar novamente</button></div> : (details.data?.lancamentos || []).length ? <div className="space-y-3">{[...(details.data?.lancamentos || [])].reverse().map((entry: any) => <article key={entry.id} className="rounded-2xl border border-white/10 bg-[#101e33] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{entry.numero_voo ? `Voo ${entry.numero_voo}` : 'Lançamento de voo'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300"><MapPin className="h-3.5 w-3.5 text-emerald-200" />{entry.aerodromo_partida_icao || entry.aerodromo_partida || '—'} <ChevronRight className="h-3 w-3" /> {entry.aerodromo_chegada_icao || entry.aerodromo_chegada || '—'}</p></div><span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-slate-300">{entry.natureza_voo || 'Voo'}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{entry.data_registro ? new Date(`${String(entry.data_registro).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : 'Data não informada'}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{timeLabel(entry.tempo_ac)}–{timeLabel(entry.tempo_cor)} UTC</span><span>{entry.pic_nome_exibicao || entry.pic_canac || 'Tripulação não informada'}</span></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center"><Plane className="mx-auto h-8 w-8 text-slate-500" /><p className="mt-3 text-sm font-semibold text-slate-200">Nenhum lançamento em {monthLabel(viewYear, viewMonth)}</p><p className="mt-1 text-xs text-slate-400">Use “Novo lançamento” para registrar um voo.</p></div>}
          </div>
        </main>
      )}
      {step === 'new-entry' && selectedAircraftId && <MobileDiarioEntryForm aircraftId={selectedAircraftId} aircraftRegistration={selectedAircraftReg} aircraftImageUrl={selectedAircraftImage} onBack={handleBack} onSaved={handleSaved} />}
    </MobileLayout>
  );
};

export default DiarioBordo;
