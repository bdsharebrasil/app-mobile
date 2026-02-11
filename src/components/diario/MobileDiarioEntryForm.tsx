import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Plane, Clock, MapPin, Fuel, Users, Save, Check, ChevronDown, User, Edit2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
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
];

const STEP_LABELS = ['Voo', 'Rota', 'Horários', 'Tripulação', 'Combustível', 'Revisão'];
const TOTAL_STEPS = STEP_LABELS.length;

export const MobileDiarioEntryForm: React.FC<Props> = ({
  aircraftId,
  aircraftRegistration,
  onBack,
  onSaved,
}) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [flightNature, setFlightNature] = useState('PV - Privado');
  const [clientId, setClientId] = useState('');
  const [isEqualSplit, setIsEqualSplit] = useState(false);
  const [fuelToggle, setFuelToggle] = useState(false);
  const [detailFuel, setDetailFuel] = useState(false);
  const [fuelAdded, setFuelAdded] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('');
  const [fuelLocation, setFuelLocation] = useState('');
  const [fuelSupplier, setFuelSupplier] = useState('');
  const [pousos, setPousos] = useState('1');
  const [passengers, setPassengers] = useState('');
  const [observations, setObservations] = useState('');
  const [sicName, setSicName] = useState('');
  const [sicCanac, setSicCanac] = useState('');
  const [editingFlightTime, setEditingFlightTime] = useState(false);
  const [manualFlightH, setManualFlightH] = useState('');
  const [manualFlightM, setManualFlightM] = useState('');

  const { user } = useAuth();
  const { profile } = useUserProfile(user);

  // Fetch aerodromes
  const { data: aerodromes = [] } = useQuery({
    queryKey: ['aerodromes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aerodromes')
        .select('id, designativo, name, coordenadas')
        .order('designativo');
      if (error) throw error;
      return data as Aerodrome[];
    },
  });

  // Fetch clients linked to aircraft
  const { data: clients = [] } = useQuery({
    queryKey: ['aircraft-clients', aircraftId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_aircraft')
        .select('client_id, clients:client_id (id, company_name)')
        .eq('aircraft_id', aircraftId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!aircraftId,
  });

  // Fetch logbook month for this aircraft
  const { data: logbookMonth } = useQuery({
    queryKey: ['current-logbook-month', aircraftId, date],
    queryFn: async () => {
      const d = new Date(date);
      const { data } = await supabase
        .from('logbook_months')
        .select('*')
        .eq('aircraft_id', aircraftId)
        .eq('month', d.getMonth() + 1)
        .eq('year', d.getFullYear())
        .single();
      return data;
    },
    enabled: !!aircraftId && !!date,
  });

  // Fetch last entry for pre-filling departure
  const { data: lastEntry } = useQuery({
    queryKey: ['last-logbook-entry', aircraftId],
    queryFn: async () => {
      const { data } = await supabase
        .from('logbook_entries')
        .select('arrival_aerodrome')
        .eq('aircraft_id', aircraftId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!aircraftId,
  });

  // Fetch crew member for PIC
  const { data: crewMember } = useQuery({
    queryKey: ['crew-member-pic', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('crew_members')
        .select('id, full_name, canac')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { formData, updateField, updateFields, resetForm } = useLogbookForm(aerodromes);

  // Pre-fill departure from last arrival
  useEffect(() => {
    if (lastEntry?.arrival_aerodrome && !formData.departure_airport) {
      updateField('departure_airport', lastEntry.arrival_aerodrome);
    }
  }, [lastEntry]);

  // Auto-detect split types
  useEffect(() => {
    const splitTypes = ['CQ', 'TR', 'TN'];
    const code = flightNature.split(' - ')[0];
    setIsEqualSplit(splitTypes.includes(code));
  }, [flightNature]);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0: return !!clientId || isEqualSplit;
      case 1: return !!formData.departure_airport && !!formData.arrival_airport;
      case 2: return !!formData.ac_time && !!formData.departure_time && !!formData.pou_time && !!formData.cor_time;
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  }, [step, clientId, isEqualSplit, formData]);

  const goNext = () => { if (step < TOTAL_STEPS - 1 && canGoNext) setStep(s => s + 1); };
  const goBack = () => { if (step > 0) setStep(s => s - 1); else onBack(); };
  const goToStep = (s: number) => setStep(s);

  const flightTimeDisplay = editingFlightTime
    ? `${manualFlightH || '0'}h${manualFlightM || '0'}m`
    : formData.flight_time_hours
      ? `${formData.flight_time_hours}h${formData.flight_time_minutes}m`
      : '--:--';

  const getFlightTimeHours = () => editingFlightTime ? manualFlightH : formData.flight_time_hours;
  const getFlightTimeMinutes = () => editingFlightTime ? manualFlightM : formData.flight_time_minutes;

  const handleSave = async () => {
    if (!logbookMonth?.id) {
      toast.error('Nenhum diário aberto para este mês/aeronave. Abra o diário primeiro.');
      return;
    }

    setSaving(true);
    try {
      const fH = parseFloat(getFlightTimeHours()) || 0;
      const fM = parseFloat(getFlightTimeMinutes()) || 0;
      const flightTime = fH + fM / 60;

      const [acH, acM] = formData.ac_time.split(':').map(Number);
      const [corH, corM] = formData.cor_time.split(':').map(Number);
      let blockMin = (corH * 60 + corM) - (acH * 60 + acM);
      if (blockMin < 0) blockMin += 24 * 60;
      const totalBlockTime = blockMin / 60;

      const nightH = parseFloat(formData.night_time_hours) || 0;
      const nightM = parseFloat(formData.night_time_minutes) || 0;
      const totalNight = nightH + nightM / 60;
      const totalDay = Math.max(0, totalBlockTime - totalNight);

      let celula = 0;
      if (logbookMonth?.celula_atual) {
        celula = parseFloat((logbookMonth.celula_atual + totalBlockTime).toFixed(2));
      }

      const trecho = `${formData.departure_airport}-${formData.arrival_airport}`;

      const { data: insertedEntry, error } = await supabase.from('logbook_entries').insert([{
        logbook_month_id: logbookMonth.id,
        aircraft_id: aircraftId,
        entry_date: date,
        departure_aerodrome: formData.departure_airport,
        arrival_aerodrome: formData.arrival_airport,
        trecho,
        flight_nature: flightNature,
        client_id: !isEqualSplit && clientId ? clientId : null,
        is_equal_split: isEqualSplit,
        pic_canac: crewMember?.id || user?.id || '',
        sic_name: sicName || null,
        sic_canac: sicCanac || null,
        ac_time: `${date}T${formData.ac_time}:00`,
        dep_time: `${date}T${formData.departure_time}:00`,
        pou_time: `${date}T${formData.pou_time}:00`,
        cor_time: `${date}T${formData.cor_time}:00`,
        crew_checkin_time: formData.crew_checkin_time ? `${date}T${formData.crew_checkin_time}:00` : null,
        time: flightTime,
        total_time: totalBlockTime,
        day_time: totalDay,
        night_hours: totalNight,
        ifr_time: parseFloat(formData.ifr_count) || 0,
        pousos: parseInt(pousos) || 1,
        fuel_added: fuelToggle ? (parseFloat(fuelAdded) || 0) : 0,
        fuel_liters: fuelToggle ? (parseFloat(fuelLiters) || 0) : 0,
        fuel_price_per_liter: fuelToggle ? (parseFloat(fuelPricePerLiter) || 0) : null,
        fuel_location: fuelToggle ? (fuelLocation || null) : null,
        refueled: fuelToggle,
        celula: celula || parseFloat(formData.fuel_cell) || 0,
        distance_nm: parseFloat(formData.distance_nm) || 0,
        passengers: parseInt(passengers) || 0,
        occurrences: observations || null,
        pilot_signature_date: new Date().toISOString(),
        created_by: user?.id || null,
      }]).select('id').single();

      if (error) throw error;

      // Insert into abastecimentos if fuel detailed
      if (fuelToggle && detailFuel && insertedEntry?.id) {
        const litros = parseFloat(fuelLiters) || 0;
        const valorUnit = parseFloat(fuelPricePerLiter) || 0;
        if (litros > 0) {
          await supabase.from('abastecimentos').insert([{
            aeronave_id: aircraftId,
            client_id: !isEqualSplit && clientId ? clientId : null,
            data: date,
            trecho,
            local: fuelLocation || formData.arrival_airport || '',
            litros,
            valor_unitario: valorUnit,
            abastecedor: fuelSupplier || null,
          }]);
        }
      }

      // Update logbook_months celula_atual
      if (logbookMonth?.id) {
        await supabase
          .from('logbook_months')
          .update({
            celula_atual: celula || logbookMonth.celula_atual,
            celula_disponivel: parseFloat(((logbookMonth.celula_prox_revisao ?? 0) - (celula || logbookMonth.celula_atual)).toFixed(2)),
          })
          .eq('id', logbookMonth.id);
      }

      setSaved(true);
      toast.success('Lançamento salvo com sucesso!');
      setTimeout(() => onSaved(), 1200);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast.error(err.message || 'Erro ao salvar lançamento');
    } finally {
      setSaving(false);
    }
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
  const clientName = clients.find((c: any) => c.client_id === clientId)?.clients?.company_name || '';

  // ======= STEP RENDERERS =======

  const renderStep0_Flight = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Data do Voo</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 rounded-xl bg-background" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Natureza do Voo</Label>
        <Select value={flightNature} onValueChange={setFlightNature}>
          <SelectTrigger className="mt-1 rounded-xl bg-background"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="mt-1 rounded-xl bg-background"><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => (
                <SelectItem key={c.client_id} value={c.client_id}>{c.clients?.company_name || c.client_id}</SelectItem>
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
              className="mt-1 rounded-xl bg-background text-center text-sm"
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
          <button
            onClick={() => {
              if (!editingFlightTime) {
                setManualFlightH(formData.flight_time_hours);
                setManualFlightM(formData.flight_time_minutes);
              }
              setEditingFlightTime(!editingFlightTime);
            }}
            className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20 active:scale-95 transition-transform"
          >
            <p className="text-[10px] text-primary/70 uppercase font-semibold">Tempo de Voo</p>
            <p className="text-lg font-bold text-primary">{flightTimeDisplay}</p>
            <Edit2 className="w-3 h-3 text-primary/50 mx-auto mt-1" />
          </button>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Diurno</p>
            <p className="text-sm font-semibold text-foreground">
              {formData.night_time_hours
                ? `${Math.max(0, (parseInt(formData.flight_time_hours) || 0) - (parseInt(formData.night_time_hours) || 0))}h`
                : `${formData.flight_time_hours}h`}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Noturno</p>
            <p className="text-sm font-semibold text-foreground">{formData.night_time_hours || '0'}h{formData.night_time_minutes || '0'}m</p>
          </div>
        </div>
      )}

      {editingFlightTime && (
        <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Horas</Label>
            <Input type="number" value={manualFlightH} onChange={e => setManualFlightH(e.target.value)} className="mt-1 rounded-xl bg-background text-center" min="0" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Minutos</Label>
            <Input type="number" value={manualFlightM} onChange={e => setManualFlightM(e.target.value)} className="mt-1 rounded-xl bg-background text-center" min="0" max="59" />
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
            <p className="text-sm font-semibold text-foreground">{profile?.full_name || 'Piloto'}</p>
            <p className="text-xs text-muted-foreground">CANAC: {crewMember?.canac || '—'}</p>
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
        <Label className="text-xs text-muted-foreground">Observações / Discrepâncias</Label>
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
                <Label className="text-xs text-muted-foreground">Galões</Label>
                <Input type="number" value={fuelAdded} onChange={e => setFuelAdded(e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="0" min="0" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Célula</Label>
                <Input type="text" value={formData.fuel_cell} onChange={e => updateField('fuel_cell', e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="0" />
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
                  <Label className="text-xs text-muted-foreground">Litros</Label>
                  <Input type="number" value={fuelLiters} onChange={e => setFuelLiters(e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="0" min="0" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor/Litro (R$)</Label>
                  <Input type="number" value={fuelPricePerLiter} onChange={e => setFuelPricePerLiter(e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="0.00" min="0" step="0.01" />
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
              <div>
                <Label className="text-xs text-muted-foreground">Abastecedor</Label>
                <Input value={fuelSupplier} onChange={e => setFuelSupplier(e.target.value)} className="mt-1 rounded-xl bg-background" placeholder="Nome do fornecedor" />
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
          { label: 'Galões', value: fuelAdded || '0' },
          ...(detailFuel ? [
            { label: 'Litros', value: fuelLiters || '0' },
            { label: 'R$/L', value: fuelPricePerLiter || '0' },
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-background to-background/95 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={goBack} className="flex items-center gap-1 text-primary text-xs font-medium -ml-1 active:opacity-60">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{step === 0 ? 'Aeronaves' : 'Voltar'}</span>
          </button>
          <h1 className="text-sm font-semibold text-foreground">{aircraftRegistration}</h1>
          <div className="w-16 text-right">
            <span className="text-xs text-muted-foreground">{step + 1}/{TOTAL_STEPS}</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="px-4 pb-2.5 pt-0">
          <Progress value={progress} className="h-1 rounded-full" />
          <div className="flex justify-between mt-1">
            {STEP_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => i <= step && goToStep(i)}
                className={`text-[8px] font-medium transition-colors truncate ${i === step ? 'text-primary' : i < step ? 'text-primary/50' : 'text-muted-foreground/40'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20">
        <div className="flex items-center gap-2 mb-3">
          {[<Plane />, <MapPin />, <Clock />, <Users />, <Fuel />, <Eye />][step]}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{STEP_LABELS[step]}</span>
        </div>
        {stepRenderers[step]()}
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 p-3 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={goNext} disabled={!canGoNext} className="w-full h-11 rounded-xl text-sm font-semibold" size="lg">
            Próximo <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl text-sm font-semibold" size="lg">
            {saving ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Confirmar</>}
          </Button>
        )}
      </div>
    </div>
  );
};
