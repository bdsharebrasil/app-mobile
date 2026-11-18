import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Plane, Clock, MapPin, Fuel, Users, Save, Check, User, Edit2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { FlightNumberCombobox, type ExistingFlightOption } from '@/components/diario/FlightNumberCombobox';
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLogbookForm } from '@/hooks/useLogbookForm';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { Aerodrome } from '@/types';

interface Props {
  aircraftId: string;
  aircraftRegistration: string;
  aircraftImageUrl?: string | null;
  onBack: () => void;
  onSaved: () => void;
}

const FLIGHT_NATURES = [
  'PV - Privado',
  'AE - Aérea/Regular',
  'CQ - Cheque',
  'EX - Executivo',
  'NR - Não Remunerado',
  'RE - Retorno/Reposição',
  'SA - Serviço Aéreo',
  'TN - Transporte Não Regular/Táxi Aéreo',
  'TR - Traslado',
  'VT - Voo Teste',
];

const STEP_LABELS = ['Voo', 'Rota', 'Horários', 'Tripulação', 'Combustível', 'Revisão'];
const STEP_DESCRIPTIONS = [
  'Defina data e natureza da operação.',
  'Informe origem, destino e dados da etapa.',
  'Registre os horários operacionais em UTC.',
  'Confirme a tripulação e observações.',
  'Registre somente os dados de combustível aplicáveis.',
  'Revise as informações antes de gravar no D1.',
];
const TOTAL_STEPS = STEP_LABELS.length;

const durationLabel = (hours: string, minutes: string) => {
  const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}m`;
};

const minutesDurationLabel = (total: number) => `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}m`;

type DiarioFlightRecord = {
  id?: string | number | null;
  numero_voo?: string | null;
  data_registro?: string | null;
  aerodromo_partida_icao?: string | null;
  aerodromo_partida?: string | null;
  aerodromo_chegada_icao?: string | null;
  aerodromo_chegada?: string | null;
};

export const MobileDiarioEntryForm: React.FC<Props> = ({
  aircraftId,
  aircraftRegistration,
  aircraftImageUrl,
  onBack,
  onSaved,
}) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [flightNumber, setFlightNumber] = useState('');
  const [flightNature, setFlightNature] = useState('PV - Privado');
  const [clientId, setClientId] = useState('');
  const isEqualSplit = ['TR', 'VT'].includes(flightNature.split(' - ')[0]);
  const [fuelToggle, setFuelToggle] = useState(false);
  const [detailFuel, setDetailFuel] = useState(false);
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('');
  const [fuelLocation, setFuelLocation] = useState('');
  const [fuelOrderNumber, setFuelOrderNumber] = useState('');
  const [pousos, setPousos] = useState('1');
  const [passengers, setPassengers] = useState('');
  const [observations, setObservations] = useState('');
  const [sicName, setSicName] = useState('');
  const [sicCanac, setSicCanac] = useState('');

  const { user } = useAuth();
  const { profile } = useUserProfile(user);

  // Todas as opções e dados do diário vêm do Worker/D1.
  const { data: options, isError: isOptionsError } = useQuery({
    queryKey: ['diario-opcoes'],
    queryFn: () => apiClient.getDiarioOpcoes(),
  });
  const aerodromes = (options?.aerodromos || []).map(a => ({
    id: a.id, designativo: a.designativo, name: a.nome, coordenadas: a.coordenadas || undefined,
  })) as Aerodrome[];
  const clients = options?.clientes || [];
  const tripulantes = options?.tripulantes || [];
  const selectedDate = new Date(`${date}T00:00:00Z`);
  const { data: diarioDetails, isLoading: isDiaryLoading, isError: isDiaryError } = useQuery({
    queryKey: ['diario-detalhes', aircraftId, selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1],
    queryFn: () => apiClient.getDiarioDetalhes(aircraftId, selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1),
    enabled: Boolean(aircraftId && date),
  });
  const existingFlightOptions = useMemo<ExistingFlightOption[]>(() => {
    const entries = ((diarioDetails?.lancamentos || []) as DiarioFlightRecord[])
      .filter((entry) => String(entry.numero_voo || '').trim())
      .slice()
      .sort((a, b) => String(b.data_registro || '').localeCompare(String(a.data_registro || '')));

    const seenFlightNumbers = new Set<string>();
    return entries.flatMap((entry, index) => {
      const number = String(entry.numero_voo).trim();
      const normalizedNumber = number.toLocaleUpperCase('pt-BR');
      if (seenFlightNumbers.has(normalizedNumber)) return [];
      seenFlightNumbers.add(normalizedNumber);

      const flightDate = String(entry.data_registro || '').slice(0, 10);
      const dateLabel = flightDate
        ? new Date(`${flightDate}T12:00:00`).toLocaleDateString('pt-BR')
        : 'Data não informada';
      const departure = entry.aerodromo_partida_icao || entry.aerodromo_partida || '—';
      const arrival = entry.aerodromo_chegada_icao || entry.aerodromo_chegada || '—';

      return [{
        id: String(entry.id || `${entry.numero_voo}-${flightDate}-${index}`),
        number,
        route: `${departure} → ${arrival}`,
        date: dateLabel,
      }];
    });
  }, [diarioDetails?.lancamentos]);
  const logbookMonth = diarioDetails?.diario_mes || null;
  const lastEntry = diarioDetails?.lancamentos?.[diarioDetails.lancamentos.length - 1] || null;
  const crewMember = tripulantes.find(member => member.id === user?.id || (member.canac && profile?.canac && member.canac.toUpperCase() === profile.canac.toUpperCase())) || null;
  const picCanac = (crewMember?.canac || profile?.canac || '').trim();
  const { formData, updateField } = useLogbookForm(aerodromes);
  const diaryOpen = Boolean(logbookMonth?.id) && !Number(logbookMonth?.fechado);
  const lastArrivalAerodrome = lastEntry?.aerodromo_chegada_icao || lastEntry?.aerodromo_chegada || lastEntry?.arrival_aerodrome;
  const monthLabel = new Date(`${date.slice(0, 7)}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Pre-fill departure from last arrival
  useEffect(() => {
    if (lastArrivalAerodrome && !formData.departure_airport) {
      updateField('departure_airport', lastArrivalAerodrome);
    }
  }, [lastArrivalAerodrome, formData.departure_airport, updateField]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0: return !isOptionsError && (!!clientId || isEqualSplit);
      case 1: return !!formData.departure_airport && !!formData.arrival_airport;
      case 2: return !!formData.ac_time && !!formData.departure_time && !!formData.pou_time && !!formData.cor_time;
      case 3: return Boolean(picCanac);
      case 4: return !fuelToggle || !detailFuel || (Number(fuelLiters) > 0 && Number(fuelPricePerLiter) >= 0);
      default: return true;
    }
  }, [step, clientId, isEqualSplit, formData, picCanac, fuelToggle, detailFuel, fuelLiters, fuelPricePerLiter, isOptionsError]);

  const canSave = diaryOpen && Boolean(picCanac) && (!fuelToggle || !detailFuel || Number(fuelLiters) > 0) && !isDiaryLoading && !isDiaryError;

  const goNext = () => { if (step < TOTAL_STEPS - 1 && canGoNext) setStep(s => s + 1); };
  const goBack = () => { if (step > 0) setStep(s => s - 1); else onBack(); };
  const goToStep = (s: number) => setStep(s);

  const flightTimeDisplay = formData.flight_time_hours
    ? `${formData.flight_time_hours}h${formData.flight_time_minutes}m`
    : '--:--';
  const dayTimeMinutes = Math.max(0,
    (Number(formData.flight_time_hours) || 0) * 60 + (Number(formData.flight_time_minutes) || 0)
    - (Number(formData.night_time_hours) || 0) * 60 - (Number(formData.night_time_minutes) || 0),
  );

  const handleSave = async () => {
    if (!logbookMonth?.id) {
      toast.error('Não existe diário D1 aberto para esta aeronave e mês.');
      return;
    }
    if (Number(logbookMonth.fechado)) {
      toast.error('Este diário está fechado e não aceita novos lançamentos.');
      return;
    }
    if (!picCanac) {
      toast.error('Seu CANAC não está cadastrado no perfil. Atualize o cadastro para continuar.');
      return;
    }
    if (fuelToggle && detailFuel && Number(fuelLiters) <= 0) {
      toast.error('Informe a quantidade em litros do abastecimento.');
      return;
    }
    setSaving(true);
    try {
      const fH = parseFloat(formData.flight_time_hours) || 0;
      const fM = parseFloat(formData.flight_time_minutes) || 0;
      const flightTime = fH + fM / 60;
      const payload: Record<string, unknown> = {
        diario_mes_id: logbookMonth.id, aeronave_id: aircraftId, data_registro: date,
        numero_voo: flightNumber.trim() || null,
        natureza_voo: flightNature, cliente_id: !isEqualSplit && clientId ? clientId : null,
        aerodromo_partida: formData.departure_airport, aerodromo_chegada: formData.arrival_airport,
        pic_canac: picCanac,
        sic_canac: sicCanac || null, sic_nome: sicName || null,
        tempo_ac: formData.ac_time, tempo_dep: formData.departure_time, tempo_pou: formData.pou_time, tempo_cor: formData.cor_time,
        tempo_voo: flightTime, tempo_total: (() => { const [ah, am] = formData.ac_time.split(':').map(Number); const [ch, cm] = formData.cor_time.split(':').map(Number); let minutes = ch * 60 + cm - (ah * 60 + am); if (minutes < 0) minutes += 1440; return minutes / 60; })(),
        tempo_ifr: parseFloat(formData.ifr_count) || 0, pousos_total: Math.max(0, parseInt(pousos, 10) || 0), distancia_nm: parseFloat(formData.distance_nm) || 0,
        litros_combustivel_inicio_voo: parseFloat(formData.fuel_cell) || 0,
        litros_combustivel_abastecido: fuelToggle ? parseFloat(fuelLiters) || 0 : 0,
        passageiros: parseInt(passengers) || 0, ocorrencias: observations || null, confirmado: false,
        abastecido: fuelToggle, local_combustivel: fuelToggle ? fuelLocation || formData.arrival_airport : null,
        abastecimento: fuelToggle && detailFuel ? { litros: parseFloat(fuelLiters) || 0, valor_unitario: parseFloat(fuelPricePerLiter) || 0, valor_total: (parseFloat(fuelLiters) || 0) * (parseFloat(fuelPricePerLiter) || 0), local: fuelLocation || formData.arrival_airport, numero_comanda: fuelOrderNumber.trim() || null } : undefined,
      };
      await apiClient.criarLancamentoDiario(payload);
      setSaved(true);
      toast.success('Lançamento salvo com sucesso!');
      setTimeout(() => onSaved(), 1200);
    } catch (err: unknown) {
      console.error('Erro ao salvar:', err);
      const message = err instanceof Error ? err.message : '';
      const messages: Record<string, string> = {
        diario_fechado: 'Este diário está fechado e não aceita novos lançamentos.',
        data_fora_do_mes: 'A data escolhida não pertence ao mês aberto deste diário.',
        diario_ou_aeronave_invalido: 'O diário não corresponde à aeronave selecionada.',
        campos_obrigatorios_ausentes: 'Confira os campos obrigatórios antes de salvar.',
      };
      toast.error(messages[message] || message || 'Erro ao salvar lançamento');
    } finally { setSaving(false); }
  };
  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 px-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Salvo com sucesso!</h2>
        <p className="text-sm text-muted-foreground text-center">
          Lançamento para {aircraftRegistration} registrado.
        </p>
      </div>
    );
  }

  const depAeroName = aerodromes.find(a => a.designativo === formData.departure_airport)?.name || '';
  const arrAeroName = aerodromes.find(a => a.designativo === formData.arrival_airport)?.name || '';
  const clientName = clients.find(client => client.id === clientId)?.nome || '';

  // ======= STEP RENDERERS =======

  const renderStep0_Flight = () => (
    <div className="space-y-4">
      <div className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <div className="min-w-0">
          <Label className="text-xs text-muted-foreground">Data do Voo</Label>
          <Input type="date" value={date} onChange={e => { setDate(e.target.value); updateField('entry_date', e.target.value); }} className="mt-1 h-12 w-full min-w-0 max-w-full rounded-xl bg-background" />
        </div>
        <div className="min-w-0">
          <Label className="text-xs text-muted-foreground">Número do voo <span className="font-normal">(opcional)</span></Label>
          <FlightNumberCombobox
            value={flightNumber}
            options={existingFlightOptions}
            monthLabel={monthLabel}
            isLoading={isDiaryLoading}
            onChange={setFlightNumber}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Natureza do Voo</Label>
        <Select value={flightNature} onValueChange={setFlightNature}>
          <SelectTrigger className="mt-1 h-12 rounded-xl bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>{FLIGHT_NATURES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isEqualSplit ? (
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-sm text-primary font-medium">⚡ Rateio entre sócios</p>
          <p className="text-xs text-muted-foreground mt-1">Custos divididos igualmente entre os sócios</p>
        </div>
      ) : (
        <div>
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="mt-1 h-12 rounded-xl bg-background"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
          <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderStep1_Route = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Origem (DE)</Label>
        <Select value={formData.departure_airport} onValueChange={v => updateField('departure_airport', v)}>
          <SelectTrigger className="mt-1 rounded-xl bg-background"><SelectValue placeholder="ICAO" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {aerodromes.map(a => <SelectItem key={a.id} value={a.designativo}>{a.designativo} - {a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Destino (PARA)</Label>
        <Select value={formData.arrival_airport} onValueChange={v => updateField('arrival_airport', v)}>
          <SelectTrigger className="mt-1 rounded-xl bg-background"><SelectValue placeholder="ICAO" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {aerodromes.map(a => <SelectItem key={a.id} value={a.designativo}>{a.designativo} - {a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {formData.distance_nm && (
        <div className="bg-primary/5 rounded-xl p-4 text-center border border-primary/20">
          <p className="text-xs text-muted-foreground">Distância Calculada</p>
          <p className="text-2xl font-bold text-primary">{formData.distance_nm} NM</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Pousos</Label>
          <Input type="number" value={pousos} onChange={e => setPousos(e.target.value)} className="mt-1 rounded-xl bg-background text-center" min="0" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">PAX</Label>
          <Input type="number" value={passengers} onChange={e => setPassengers(e.target.value)} className="mt-1 rounded-xl bg-background text-center" min="0" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">IFR</Label>
          <Input type="number" value={formData.ifr_count} onChange={e => updateField('ifr_count', e.target.value)} className="mt-1 rounded-xl bg-background text-center" min="0" />
        </div>
      </div>
    </div>
  );

  const renderStep2_Times = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Acionamento (AC)', field: 'ac_time' as const },
          { label: 'Decolagem (DEP)', field: 'departure_time' as const },
          { label: 'Pouso (POU)', field: 'pou_time' as const },
          { label: 'Corte (COR)', field: 'cor_time' as const },
        ].map(({ label, field }) => (
          <div key={field}>
            <Label className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</Label>
            <Input
              type="time"
              value={formData[field]}
              onChange={e => updateField(field, e.target.value)}
              className="mt-1 h-12 rounded-xl bg-background text-center text-base"
            />
          </div>
        ))}
      </div>

      {/* Auto-calculated Apresentação */}
      {formData.crew_checkin_time && (
        <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Apresentação (auto)</p>
            <p className="text-sm font-semibold text-foreground">{formData.crew_checkin_time} UTC</p>
          </div>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Flight time badge */}
      {formData.flight_time_hours && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20">
            <p className="text-[10px] text-primary/70 uppercase font-semibold">Tempo de Voo</p>
            <p className="text-lg font-bold text-primary">{flightTimeDisplay}</p>
            <p className="mt-1 text-[9px] text-primary/60">Calculado por DEP–POU</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Diurno</p>
            <p className="text-sm font-semibold text-foreground">{minutesDurationLabel(dayTimeMinutes)}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Noturno</p>
            <p className="text-sm font-semibold text-foreground">{durationLabel(formData.night_time_hours, formData.night_time_minutes)}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3_Crew = () => (
    <div className="space-y-4">
      {/* PIC - Auto filled */}
      <div className="bg-card border border-border/60 rounded-2xl p-4">
        <Label className="text-xs text-muted-foreground uppercase font-semibold">Comandante (PIC)</Label>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="PIC" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{profile?.full_name || crewMember?.nome_completo || 'Piloto'}</p>
            <p className="text-xs text-muted-foreground">CANAC: {picCanac || '—'}</p>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Auto</span>
        </div>
      </div>

      {/* SIC - Optional */}
      <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
        <Label className="text-xs text-muted-foreground uppercase font-semibold">Copiloto (SIC) — Opcional</Label>
        <div>
          <Label className="text-xs text-muted-foreground">Nome do SIC</Label>
          <Input value={sicName} onChange={e => setSicName(e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="Nome completo" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">CANAC do SIC</Label>
          <Input value={sicCanac} onChange={e => setSicCanac(e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="Nº CANAC" />
        </div>
      </div>

      {/* Observations */}
      <div>
        <Label className="text-xs text-muted-foreground">Ocorrências / observações</Label>
        <Textarea
          value={observations}
          onChange={e => setObservations(e.target.value)}
          className="mt-1 rounded-xl bg-background min-h-[60px] resize-none"
          placeholder="Discrepâncias, ocorrências..."
        />
      </div>
    </div>
  );

  const renderStep4_Fuel = () => (
    <div className="space-y-4">
      <div className="bg-card border border-border/60 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Houve abastecimento?</p>
            <p className="text-xs text-muted-foreground">Ative se houve abastecimento neste voo</p>
          </div>
          <Switch checked={fuelToggle} onCheckedChange={setFuelToggle} />
        </div>
      </div>

      {fuelToggle && (
        <>
          <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Abastecido neste voo (L)</Label>
                <Input type="number" inputMode="decimal" value={fuelLiters} onChange={e => setFuelLiters(e.target.value)} className="mt-1 h-12 rounded-xl bg-background" placeholder="0" min="0" step="0.1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Combustível inicial (L)</Label>
                <Input type="number" inputMode="decimal" value={formData.fuel_cell} onChange={e => updateField('fuel_cell', e.target.value)} className="mt-1 h-12 rounded-xl bg-background" placeholder="0" min="0" step="0.1" />
              </div>
            </div>
          </div>

          {/* Detail toggle */}
          <div className="bg-card border border-border/60 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Detalhar abastecimento?</p>
                <p className="text-xs text-muted-foreground">Registrar na tabela de abastecimentos</p>
              </div>
              <Switch checked={detailFuel} onCheckedChange={setDetailFuel} />
            </div>
          </div>

          {detailFuel && (
            <div className="bg-card border border-primary/20 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                <Label className="text-xs text-muted-foreground">Valor por litro (R$)</Label>
                <Input type="number" inputMode="decimal" value={fuelPricePerLiter} onChange={e => setFuelPricePerLiter(e.target.value)} className="mt-1 h-12 rounded-xl bg-background" placeholder="0,00" min="0" step="0.01" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nº da comanda</Label>
                <Input value={fuelOrderNumber} onChange={e => setFuelOrderNumber(e.target.value)} className="mt-1 h-12 rounded-xl bg-background" placeholder="Opcional" />
              </div>
              </div>
              {fuelLiters && fuelPricePerLiter && (
                <div className="bg-primary/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Estimado</p>
                  <p className="text-lg font-bold text-primary">R$ {(parseFloat(fuelLiters) * parseFloat(fuelPricePerLiter)).toFixed(2)}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Local</Label>
                <Input value={fuelLocation} onChange={e => setFuelLocation(e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="Ex: SBSP" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderStep5_Review = () => (
    <div className="space-y-3">
      {/* Review cards */}
      {[
        { step: 0, icon: <Plane className="w-4 h-4" />, title: 'Voo', items: [
          { label: 'Data', value: date },
          { label: 'Número', value: flightNumber || '—' },
          { label: 'Natureza', value: flightNature },
          { label: 'Cliente', value: isEqualSplit ? 'Rateio entre sócios' : (clientName || '—') },
        ]},
        { step: 1, icon: <MapPin className="w-4 h-4" />, title: 'Rota', items: [
          { label: 'Origem', value: `${formData.departure_airport} ${depAeroName ? `(${depAeroName})` : ''}` },
          { label: 'Destino', value: `${formData.arrival_airport} ${arrAeroName ? `(${arrAeroName})` : ''}` },
          { label: 'Distância', value: formData.distance_nm ? `${formData.distance_nm} NM` : '—' },
          { label: 'Pousos / PAX', value: `${pousos} / ${passengers || '0'}` },
        ]},
        { step: 2, icon: <Clock className="w-4 h-4" />, title: 'Horários', items: [
          { label: 'Apresentação', value: formData.crew_checkin_time || '—' },
          { label: 'AC / DEP / POU / COR', value: `${formData.ac_time} / ${formData.departure_time} / ${formData.pou_time} / ${formData.cor_time}` },
          { label: 'Tempo de Voo', value: flightTimeDisplay },
        ]},
        { step: 3, icon: <Users className="w-4 h-4" />, title: 'Tripulação', items: [
          { label: 'PIC', value: profile?.full_name || 'Piloto' },
          { label: 'SIC', value: sicName || '—' },
          { label: 'Obs', value: observations || '—' },
        ]},
        { step: 4, icon: <Fuel className="w-4 h-4" />, title: 'Combustível', items: fuelToggle ? [
          { label: 'Litros abastecidos', value: fuelLiters || '0' },
          { label: 'Combustível inicial', value: formData.fuel_cell || '0' },
          ...(detailFuel ? [
            { label: 'R$/L', value: fuelPricePerLiter || '0' },
            { label: 'Comanda', value: fuelOrderNumber || '—' },
            { label: 'Local', value: fuelLocation || '—' },
          ] : []),
        ] : [{ label: 'Status', value: 'Sem abastecimento' }]},
      ].map(section => (
        <button
          key={section.step}
          onClick={() => goToStep(section.step)}
          className="w-full bg-card border border-border/60 rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-primary">
              {section.icon}
              <span className="text-xs font-semibold uppercase tracking-wider">{section.title}</span>
            </div>
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            {section.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground font-medium text-right max-w-[60%] truncate">{item.value}</span>
              </div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );

  const stepRenderers = [renderStep0_Flight, renderStep1_Route, renderStep2_Times, renderStep3_Crew, renderStep4_Fuel, renderStep5_Review];
  const StepIcon = [Plane, MapPin, Clock, Users, Fuel, Eye][step];
  const diaryStatus = isDiaryLoading ? 'Verificando o D1…' : isDiaryError ? 'Falha ao consultar o D1' : diaryOpen ? 'Diário aberto para lançamentos' : logbookMonth?.id ? 'Diário do mês encerrado' : 'Diário do mês não aberto';

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-[max(24px,env(safe-area-inset-top))] z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <button type="button" onClick={goBack} aria-label={step === 0 ? 'Voltar às aeronaves' : 'Voltar uma etapa'} className="flex h-11 min-w-11 items-center gap-1 rounded-xl pr-2 text-primary active:scale-95">
            <ArrowLeft className="h-5 w-5" /><span className="text-xs font-semibold">{step === 0 ? 'Aeronaves' : 'Voltar'}</span>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold text-foreground">{aircraftRegistration}</p>
            <p className="text-[10px] text-muted-foreground">{monthLabel}</p>
          </div>
          <span className="flex h-9 min-w-11 items-center justify-center rounded-xl bg-primary/10 px-2 text-xs font-bold tabular-nums text-primary">{step + 1}/{TOTAL_STEPS}</span>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <Progress value={progress} className="h-1.5 rounded-full" />
          <div className="mt-2 grid grid-cols-6 gap-1.5" aria-label="Etapas do lançamento">
            {STEP_LABELS.map((label, index) => (
              <button
                type="button"
                key={label}
                aria-label={`Etapa ${index + 1}: ${label}`}
                aria-current={index === step ? 'step' : undefined}
                onClick={() => index <= step && goToStep(index)}
                className={`h-1.5 rounded-full transition-colors ${index <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-32 pt-4">
        <section className="relative mb-4 h-36 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#173b62] via-[#0d2947] to-[#06172d] shadow-lg shadow-black/10">
          {aircraftImageUrl && <img src={aircraftImageUrl} alt={aircraftRegistration} className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-[#06172d]/90 via-[#06172d]/45 to-[#06172d]/10" />
          <div className="absolute inset-0 flex flex-col justify-between p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Diário de bordo · D1</p>
            <div>
              <p className="text-xl font-bold tracking-wide">{aircraftRegistration}</p>
              <p className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${diaryOpen ? 'border-emerald-200/30 bg-emerald-300/15 text-emerald-100' : 'border-amber-200/30 bg-amber-300/15 text-amber-100'}`}>
                {diaryStatus}
              </p>
            </div>
          </div>
        </section>

        {!diaryOpen && (
          <div role="status" className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            {isDiaryLoading ? 'Consultando o diário deste mês…' : isDiaryError ? 'Não foi possível validar o diário no D1. Tente novamente antes de continuar.' : logbookMonth?.id ? 'Este diário está fechado. Selecione uma aeronave/mês com diário aberto ou solicite a reabertura.' : `Não há diário aberto para ${monthLabel}. A gravação só será habilitada quando esse mês estiver aberto no D1.`}
          </div>
        )}

        <section className="mb-4 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><StepIcon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{STEP_LABELS[step]}</p>
              <p className="text-xs leading-5 text-muted-foreground">{STEP_DESCRIPTIONS[step]}</p>
            </div>
          </div>
        </section>
        {step === 0 && isOptionsError && <p role="alert" className="mb-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">Não foi possível carregar as opções do D1. Tente novamente antes de preencher o lançamento.</p>}
        {stepRenderers[step]()}
        {step === 3 && !picCanac && <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">Seu perfil não possui CANAC. O lançamento não poderá ser salvo sem esse identificador.</p>}
        {step === 5 && !canSave && diaryOpen && <p role="alert" className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">Confira o CANAC e os litros do abastecimento detalhado antes de salvar.</p>}
      </main>

      <footer className="sticky bottom-0 z-30 border-t border-border/50 bg-background/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-[auto_1fr] gap-3">
          <Button type="button" variant="outline" onClick={goBack} className="h-12 min-w-12 rounded-2xl px-4 text-sm font-semibold">
            {step === 0 ? 'Sair' : <><ArrowLeft className="mr-1.5 h-4 w-4" /> Anterior</>}
          </Button>
          {step < TOTAL_STEPS - 1 ? (
            <Button type="button" onClick={goNext} disabled={!canGoNext} className="h-12 rounded-2xl text-sm font-semibold shadow-lg shadow-primary/15">
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={saving || !canSave} className="h-12 rounded-2xl text-sm font-semibold shadow-lg shadow-primary/15">
              {saving ? 'Salvando no D1…' : <><Save className="mr-2 h-4 w-4" /> Salvar lançamento</>}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};
