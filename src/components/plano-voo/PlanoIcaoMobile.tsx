import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plane, RefreshCw, Save, Search, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Fpl = {
  identificacao: string; regraVoo: 'I' | 'V' | 'Y' | 'Z'; tipoVoo: 'S' | 'N' | 'G' | 'M' | 'X'; numeroAeronaves: string; tipoAeronave: string; esteira: 'L' | 'M' | 'H' | 'J'; equipamento: string; adep: string; dataVoo: string; eobt: string; velocidade: string; nivel: string; rota: string; ades: string; eet: string; alternado1: string; alternado2: string; outrasInformacoes: string; autonomia: string; pessoasABordo: string; radioEmergencia: string; sobrevivencia: string; coletes: string; botes: string; corAeronave: string; observacoes: string; piloto: string;
};
type Reservation = { id: string; numero_voo: string | null; origem: string; destino: string; data_agendada: string; horario_previsto_agendamento?: string | null; numero_passageiros?: number | null; status?: string | null; aeronave_id?: string | null; matricula_registro?: string | null; modelo?: string | null; tipo_aeronave?: string | null; piloto_nome?: string | null };
type SavedPlan = { id: string; numero_voo: string | null; adep: string; ades: string; data_voo: string | null; eobt: string | null; created_at: string; payload: Record<string, any> };
const initialForm = (): Fpl => ({ identificacao: '', regraVoo: 'V', tipoVoo: 'N', numeroAeronaves: '1', tipoAeronave: '', esteira: 'L', equipamento: '', adep: '', dataVoo: new Date().toISOString().slice(0, 10), eobt: '', velocidade: '', nivel: '', rota: '', ades: '', eet: '', alternado1: '', alternado2: '', outrasInformacoes: '', autonomia: '', pessoasABordo: '', radioEmergencia: '', sobrevivencia: '', coletes: '', botes: '', corAeronave: '', observacoes: '', piloto: '' });
const control = 'h-11 rounded-xl border-white/10 bg-[#0a1729] text-white placeholder:text-slate-500';
const fields: Array<{ key: keyof Fpl; label: string; hint?: string; area?: boolean; placeholder?: string }> = [
  { key: 'identificacao', label: 'Item 7 · Identificação / número do voo', placeholder: 'Ex.: PT1234' },
  { key: 'numeroAeronaves', label: 'Item 9 · Número de aeronaves', placeholder: '1' },
  { key: 'tipoAeronave', label: 'Item 9 · Tipo da aeronave', placeholder: 'Ex.: PA46' },
  { key: 'equipamento', label: 'Item 10 · Equipamento', placeholder: 'Ex.: SDFG/LB1', hint: 'Preencha conforme os equipamentos e capacidades reais da aeronave.' },
  { key: 'adep', label: 'Item 13 · ADEP (ICAO)', placeholder: 'SBGR' },
  { key: 'eobt', label: 'Item 13 · EOBT (UTC)', placeholder: '13:30' },
  { key: 'velocidade', label: 'Item 15 · Velocidade', placeholder: 'N0250' },
  { key: 'nivel', label: 'Item 15 · Nível', placeholder: 'F250' },
  { key: 'rota', label: 'Item 15 · Rota', placeholder: 'DCT ...', area: true },
  { key: 'ades', label: 'Item 16 · ADES (ICAO)', placeholder: 'SBBR' },
  { key: 'eet', label: 'Item 16 · EET (HHMM)', placeholder: '0135' },
  { key: 'alternado1', label: 'Item 16 · Alternado 1', placeholder: 'SBGO' },
  { key: 'alternado2', label: 'Item 16 · Alternado 2' },
  { key: 'outrasInformacoes', label: 'Item 18 · Outras informações', placeholder: 'REG/PRABC TYP/PA46 RMK/...', area: true },
  { key: 'autonomia', label: 'Item 19 · Autonomia (HH:MM)', placeholder: '05:20' },
  { key: 'pessoasABordo', label: 'Item 19 · Pessoas a bordo', placeholder: '6' },
  { key: 'radioEmergencia', label: 'Item 19 · Rádio de emergência', placeholder: 'UHF VHF ELT' },
  { key: 'sobrevivencia', label: 'Item 19 · Equipamento de sobrevivência', placeholder: 'P D M J' },
  { key: 'coletes', label: 'Item 19 · Coletes salva-vidas', placeholder: 'J L F U V' },
  { key: 'botes', label: 'Item 19 · Botes' },
  { key: 'corAeronave', label: 'Item 19 · Cor e marcas da aeronave' },
  { key: 'piloto', label: 'Item 19 · Piloto em comando' },
  { key: 'observacoes', label: 'Item 19 · Observações', area: true },
];
const labels: Record<string, string> = { identificacao: 'Identificação', regraVoo: 'Regra de voo', tipoVoo: 'Tipo de voo', numeroAeronaves: 'Nº aeronaves', tipoAeronave: 'Tipo aeronave', esteira: 'Esteira', equipamento: 'Equipamento', adep: 'ADEP', dataVoo: 'Data do voo', eobt: 'EOBT (UTC)', velocidade: 'Velocidade', nivel: 'Nível', rota: 'Rota', ades: 'ADES', eet: 'EET', alternado1: 'Alternado 1', alternado2: 'Alternado 2', outrasInformacoes: 'Outras informações', autonomia: 'Autonomia', pessoasABordo: 'Pessoas a bordo', radioEmergencia: 'Rádio emergência', sobrevivencia: 'Sobrevivência', coletes: 'Coletes', botes: 'Botes', corAeronave: 'Cor e marcas', observacoes: 'Observações', piloto: 'Piloto em comando' };

export default function PlanoIcaoMobile({ mode = 'form', onSaved, onCountChange }: { mode?: 'form' | 'saved'; onSaved?: () => void; onCountChange?: (count: number) => void }) {
  const queryClient = useQueryClient();
  const view = mode;
  const [form, setForm] = useState<Fpl>(initialForm);
  const [reservationId, setReservationId] = useState('');
  const [reservationNumber, setReservationNumber] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SavedPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const reservations = useQuery({
    queryKey: ['plano-icao-reservas'],
    queryFn: () => apiClient.get<{ agendamentos: Reservation[] }>('/api/interno/agendamento', { inicio: '2000-01-01', fim: '2099-12-31' }),
    enabled: view === 'form', staleTime: 60_000,
  });
  const saved = useQuery({ queryKey: ['planos-voo-d1'], queryFn: () => apiClient.get<SavedPlan[]>('/api/interno/planos-voo'), enabled: view === 'saved' });
  useEffect(() => { if (saved.data) onCountChange?.(saved.data.length); }, [saved.data, onCountChange]);
  const update = (key: keyof Fpl, value: string) => setForm((old) => ({ ...old, [key]: value.toUpperCase() }));
  const chooseReservation = (id: string) => {
    setReservationId(id);
    const item = (reservations.data?.agendamentos || []).find((flight) => flight.id === id);
    if (!item) return;
    setReservationNumber(item.numero_voo || '');
    const aircraftType = item.modelo || item.tipo_aeronave || '';
    setForm((old) => ({ ...old, identificacao: item.numero_voo || old.identificacao, adep: (item.origem || '').toUpperCase(), ades: (item.destino || '').toUpperCase(), dataVoo: item.data_agendada?.slice(0, 10) || old.dataVoo, eobt: (item.horario_previsto_agendamento || '').slice(0, 5), tipoAeronave: aircraftType.toUpperCase(), pessoasABordo: String(item.numero_passageiros || ''), piloto: item.piloto_nome || old.piloto, outrasInformacoes: item.matricula_registro ? `REG/${item.matricula_registro.replace('-', '')} TYP/${aircraftType}`.trim().toUpperCase() : old.outrasInformacoes }));
    toast.success('Dados da solicitação preenchidos. Confira e complete o formulário ICAO.');
  };
  const searchReservation = () => {
    const item = (reservations.data?.agendamentos || []).find((flight) => flight.numero_voo?.trim().toLocaleUpperCase('pt-BR') === reservationNumber.trim().toLocaleUpperCase('pt-BR'));
    if (!item) { toast.error('Voo não encontrado nas solicitações disponíveis. Você também pode preencher manualmente.'); return; }
    chooseReservation(item.id);
  };
  const save = async () => {
    const adep = form.adep.trim().toUpperCase(); const ades = form.ades.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(adep) || !/^[A-Z]{4}$/.test(ades) || adep === ades) { toast.error('Informe ADEP e ADES com códigos ICAO válidos e diferentes.'); return; }
    setSaving(true);
    try {
      const reservation = (reservations.data?.agendamentos || []).find((flight) => flight.id === reservationId);
      await apiClient.post('/api/interno/planos-voo', { numero_voo: form.identificacao || null, adep, ades, data_voo: form.dataVoo || null, eobt: form.eobt || null, form, contexto: reservation ? { solicitacao: reservation, aeronave: { matricula_registro: reservation.matricula_registro || null, modelo: reservation.modelo || null } } : null, rota: null, segmentos: [], distancia_total_nm: null, salvo_em: new Date().toISOString() });
      toast.success('Plano de voo salvo.');
      await queryClient.invalidateQueries({ queryKey: ['planos-voo-d1'] });
      onSaved?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o plano de voo.'); }
    finally { setSaving(false); }
  };
  const filteredPlans = (saved.data || []).filter((plan) => [plan.numero_voo, plan.adep, plan.ades, plan.payload?.form?.tipoAeronave, plan.payload?.contexto?.aeronave?.matricula_registro].join(' ').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
  const formValues = selected?.payload?.form as Record<string, unknown> | undefined;

  return <section className="space-y-4 text-white">
    {view === 'form' ? <>
      <section className="space-y-3 rounded-2xl border border-white/10 bg-[#101e33] p-4">
        <div><h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Número do voo</h2></div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input aria-label="Número do voo" value={reservationNumber} onChange={(event) => setReservationNumber(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchReservation(); } }} placeholder="EBL-0003/26" className={`${control} font-mono text-base tracking-widest`} /><Button type="button" onClick={searchReservation} disabled={reservations.isLoading} className="min-h-11 rounded-xl bg-[rgba(34,146,197,1)] px-5 font-bold text-slate-950 hover:bg-sky-400">{reservations.isLoading ? '…' : 'Buscar'}</Button></div>
        {(reservations.data?.agendamentos || []).some((flight) => flight.numero_voo) && <select aria-label="Selecionar solicitação de reserva" value={reservationId} onChange={(event) => chooseReservation(event.target.value)} className={`${control} w-full px-3 text-sm`}><option value="">Preencher manualmente / escolher solicitação</option>{(reservations.data?.agendamentos || []).filter((flight) => flight.numero_voo).map((flight) => <option key={flight.id} value={flight.id}>{flight.numero_voo} · {flight.origem} → {flight.destino} · {flight.data_agendada?.slice(0, 10)}</option>)}</select>}
        {reservations.isError && <p className="text-xs text-amber-200">Não foi possível carregar as solicitações; o formulário manual continua disponível.</p>}
      </section>
      <section className="space-y-5 rounded-2xl border border-white/10 bg-[#101e33] p-4">
        <div><h2 className="text-base font-bold">Formulário de plano de voo ICAO</h2><p className="mt-1 text-xs leading-5 text-slate-400">Itens 7 a 19. Revise as informações antes de encaminhar ao órgão AIS.</p></div>
        <div className="grid grid-cols-2 gap-3"><label className="space-y-1.5"><Label>Item 8 · Regra</Label><select className={`${control} w-full px-2 text-sm`} value={form.regraVoo} onChange={(e) => update('regraVoo', e.target.value)}><option value="I">I — IFR</option><option value="V">V — VFR</option><option value="Y">Y — IFR/VFR</option><option value="Z">Z — VFR/IFR</option></select></label><label className="space-y-1.5"><Label>Item 8 · Tipo</Label><select className={`${control} w-full px-2 text-sm`} value={form.tipoVoo} onChange={(e) => update('tipoVoo', e.target.value)}><option value="S">S — Regular</option><option value="N">N — Não regular</option><option value="G">G — Aviação geral</option><option value="M">M — Militar</option><option value="X">X — Outros</option></select></label><label className="space-y-1.5"><Label>Item 9 · Esteira</Label><select className={`${control} w-full px-2 text-sm`} value={form.esteira} onChange={(e) => update('esteira', e.target.value)}><option value="L">L — Leve</option><option value="M">M — Média</option><option value="H">H — Pesada</option><option value="J">J — Super</option></select></label><label className="space-y-1.5"><Label>Item 13 · Data do voo</Label><Input type="date" value={form.dataVoo} onChange={(e) => setForm((old) => ({ ...old, dataVoo: e.target.value }))} className={control} /></label></div>
        <div className="grid gap-3 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className={`block space-y-1.5 ${field.area ? 'sm:col-span-2' : ''}`}><Label>{field.label}</Label>{field.area ? <textarea rows={field.key === 'rota' ? 2 : 3} value={form[field.key]} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} className={`${control} min-h-20 w-full resize-y px-3 py-2 font-mono text-sm placeholder:text-slate-500`} /> : <Input value={form[field.key]} onChange={(e) => update(field.key, e.target.value)} placeholder={field.placeholder} maxLength={['adep', 'ades', 'alternado1', 'alternado2'].includes(field.key) ? 4 : undefined} className={`${control} font-mono`} />}{field.hint && <span className="block text-[11px] leading-4 text-slate-500">{field.hint}</span>}</label>)}</div>
        <label className="block space-y-1.5"><Label>Item 13 · EOBT (UTC)</Label><Input type="time" value={form.eobt} onChange={(e) => setForm((old) => ({ ...old, eobt: e.target.value }))} className={control} /><span className="block text-[11px] text-slate-500">Horário em UTC.</span></label>
        <Button type="button" onClick={() => void save()} disabled={saving} className="h-12 w-full rounded-[34px] overflow-hidden bg-[rgba(50,153,106,1)] font-bold text-black hover:bg-emerald-200">{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? 'Salvando…' : 'Salvar plano de voo'}</Button>
      </section>
    </> : <>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar voo, matrícula ou ICAO" className={`${control} pl-9`} /></div>
      {saved.isLoading ? <p className="rounded-2xl border border-white/10 bg-[#101e33] p-8 text-center text-sm text-slate-400">Carregando planos salvos…</p> : saved.isError ? <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[.07] p-4 text-sm text-rose-100">Não foi possível carregar os planos.<button type="button" onClick={() => void saved.refetch()} className="mt-3 flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3"><RefreshCw className="h-4 w-4" /> Tentar novamente</button></div> : filteredPlans.length ? filteredPlans.map((plan) => <article key={plan.id} className="rounded-2xl border border-white/10 bg-[#101e33] p-4"><button type="button" onClick={() => setSelected(selected?.id === plan.id ? null : plan)} className="flex min-h-12 w-full items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><FileText className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{plan.numero_voo || 'Plano sem número'} · {plan.adep} → {plan.ades}</span><span className="mt-1 block text-xs text-slate-400">{plan.data_voo || 'Data não informada'}{plan.eobt ? ` · EOBT ${plan.eobt}Z` : ''}</span></span><CheckCircle2 className="h-4 w-4 shrink-0 text-slate-500" /></button>{selected?.id === plan.id && <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => { const value = String(formValues?.[key] ?? '').trim(); return value ? <div key={key} className="rounded-xl bg-black/15 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-slate-200">{value}</p></div> : null; })}</div>}</article>) : <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center"><Plane className="mx-auto h-8 w-8 text-slate-500" /><p className="mt-3 text-sm font-semibold text-slate-200">{search ? 'Nenhum plano corresponde à busca.' : 'Nenhum plano de voo salvo.'}</p><p className="mt-1 text-xs text-slate-400">Planos salvos no formulário ICAO aparecem aqui.</p></div>}
    </>}
  </section>;
}
