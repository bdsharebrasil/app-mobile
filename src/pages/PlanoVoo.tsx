import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ArrowUpDown, Check, ChevronRight, CloudSun,
  FilePlus2, FileText, FolderOpen, Loader2, MapPin, Navigation,
  Plane, Plus, RefreshCw, Route, Shield, Trash2, AlertTriangle,
} from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAerodromes } from '@/hooks/useAerodromes';
import { useAeronaves } from '@/hooks/useAeronaves';
import { useAuth } from '@/contexts/AuthContext';
import { useAISWeb } from '@/hooks/useAISWeb';
import { useFlightPlans } from '@/hooks/useFlightPlans';
import { calculateDistance, calculateMagneticHeading, calculateOptimalAltitude } from '@/lib/aviation';
import type { NOTAMData } from '@/lib/aviation';
import { fetchAISWebMETAR } from '@/services/aiswebWeather';
import { fetchAirportCharts } from '@/services/chartsService';
import { AerodromeCombobox, FlightRouteMap } from '@/components/plano-voo';
import type { RoutePoint } from '@/components/plano-voo';
import PlanoIcaoMobile from '@/components/plano-voo/PlanoIcaoMobile';
import MeteorologiaMobile from '@/components/plano-voo/MeteorologiaMobile';
import InformacoesAerodromoMobile from '@/components/plano-voo/InformacoesAerodromoMobile';
import { toast } from 'sonner';
import './PlanoVooPage.css';

type Workspace = 'plano' | 'aerodromos' | 'meteorologia' | 'salvos';
type Step = 'icao' | 'rota' | 'resumo' | 'notams' | 'cartas';
type FlightFormData = {
  origin: string; destination: string; alternate: string;
  aircraftId: string; registration: string;
  flightRule: 'V' | 'I' | 'Y' | 'Z'; cruiseAlt: string;
  cruiseSpeed: string; departure: string; passengers: number; route: string;
};
interface FlightCalculations {
  distance: number; bearing: number; time: number; ete: string;
  fuelRequired: number; fuelReserve: number; totalFuel: number;
  suggestedAlt: string; altitudeWarnings: string[]; alternatives: string[];
}
type AIS = ReturnType<typeof useAISWeb>;
type Validation = NonNullable<Awaited<ReturnType<AIS['validateFlightPlan']>>>;
type SavedPlan = ReturnType<typeof useFlightPlans>['flightPlans'][number];
type PendingAction = { type: 'new' } | { type: 'delete'; plan: SavedPlan } | null;

const EMPTY_FORM: FlightFormData = {
  origin: '', destination: '', alternate: '', aircraftId: '', registration: '',
  flightRule: 'V', cruiseAlt: '', cruiseSpeed: '', departure: '', passengers: 1, route: '',
};
const MODULES = [
  { value: 'plano', label: 'Plano', icon: FilePlus2 },
  { value: 'aerodromos', label: 'Aeródromos', icon: MapPin },
  { value: 'meteorologia', label: 'Clima', icon: CloudSun },
  { value: 'salvos', label: 'Salvos', icon: FolderOpen },
] as const;
const STEPS = [
  { value: 'icao', label: 'Formulário' },
  { value: 'rota', label: 'Rota' },
  { value: 'resumo', label: 'Resumo' },
] as const;
const PRIORITY = {
  critical: { label: 'Crítico', tone: 'danger' },
  high: { label: 'Alta', tone: 'warning' },
  medium: { label: 'Média', tone: 'warning' },
  low: { label: 'Informativo', tone: 'info' },
} as const;

/** Mesma leitura decimal/DMS do arquivo original, aceitando a ordem lat/lon. */
function parseCoordinates(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const decimal = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (decimal) {
    const lat = Number(decimal[1]);
    const lng = Number(decimal[2]);
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  }
  const parts = Array.from(value.matchAll(/(\d+)\s+(\d+)\s+([\d.]+)\s*([NSEW])/gi));
  let lat: number | undefined;
  let lng: number | undefined;
  for (const match of parts) {
    const degrees = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (minutes >= 60 || seconds >= 60) return null;
    const hemisphere = match[4].toUpperCase();
    const angle = (degrees + minutes / 60 + seconds / 3600) * (/[SW]/.test(hemisphere) ? -1 : 1);
    if (/[NS]/.test(hemisphere)) lat = angle;
    else lng = angle;
  }
  return lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng } : null;
}

function formatDate(value: string | number | Date | null | undefined) {
  if (!value) return 'Não informado';
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
}
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Descarta respostas de uma rota anterior e também após desmontar a página. */
function useResource<T>(key: string, enabled: boolean, loader: () => Promise<T>) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const request = useRef(0);
  const [state, setState] = useState<{
    key: string; data: T | null; loading: boolean; error: string | null; updatedAt: number | null;
  }>({ key, data: null, loading: false, error: null, updatedAt: null });
  const reload = useCallback(async () => {
    const id = ++request.current;
    if (!enabled) {
      setState({ key, data: null, loading: false, error: null, updatedAt: null });
      return;
    }
    setState({ key, data: null, loading: true, error: null, updatedAt: null });
    try {
      const data = await loaderRef.current();
      if (id === request.current) setState({ key, data, loading: false, error: null, updatedAt: Date.now() });
    } catch {
      if (id === request.current) setState({ key, data: null, loading: false, error: 'Não foi possível atualizar esta consulta.', updatedAt: null });
    }
  }, [key, enabled]);
  useEffect(() => {
    void reload();
    return () => { request.current += 1; };
  }, [reload]);
  const current = state.key === key ? state : { key, data: null, loading: enabled, error: null, updatedAt: null };
  return { ...current, reload };
}

function NativeButton({ children, className = '', kind = 'secondary', busy = false, disabled, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; busy?: boolean }) {
  return <button type="button" {...props} disabled={disabled || busy} aria-busy={busy || undefined}
    className={`pv-button pv-button--${kind} ${className}`}>
    {busy && <Loader2 className="pv-spin" aria-hidden="true" />}{children}
  </button>;
}
function Section({ title, subtitle, action, children, className = '' }:
  { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`pv-section ${className}`}>
    <div className="pv-section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
    {children}
  </section>;
}
function Field({ label, htmlFor, children, wide = false }:
  { label: string; htmlFor?: string; children: ReactNode; wide?: boolean }) {
  return <div className={`pv-field${wide ? ' pv-field--wide' : ''}`}>
    {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <div className="pv-field-label">{label}</div>}
    {children}
  </div>;
}
function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="pv-empty"><div className="pv-empty-icon" aria-hidden="true">{icon}</div>
    <h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}
function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'danger' | 'info' | 'success' }) {
  return <div className={`pv-notice pv-tone--${tone}`}><AlertTriangle aria-hidden="true" /><div>{children}</div></div>;
}
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="pv-detail"><dt>{label}</dt><dd>{children}</dd></div>;
}

/** Tabs com toque, VoiceOver e navegação por setas/Home/End no teclado. */
function Segments<T extends string>({ id, value, options, onChange, label, modules = false }:
  { id: string; value: T; options: readonly { value: T; label: string; icon?: typeof Plane }[];
    onChange: (value: T) => void; label: string; modules?: boolean }) {
  return <div className={modules ? 'pv-modules' : 'pv-segments'} role="tablist" aria-label={label}
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = options.findIndex(option => option.value === value);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
      const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      tabs[next]?.focus();
      onChange(options[next].value);
    }}>
    {options.map(option => {
      const Icon = option.icon;
      return <button key={option.value} type="button" role="tab" id={`${id}-tab-${option.value}`}
        aria-controls={`${id}-panel-${option.value}`} aria-selected={value === option.value}
        tabIndex={value === option.value ? 0 : -1} onClick={() => onChange(option.value)}>
        {Icon && <Icon aria-hidden="true" />}<span>{option.label}</span>
      </button>;
    })}
  </div>;
}

export default function PlanoVooPage() {
  const navigate = useNavigate();
  const uid = useId();
  const { user } = useAuth();
  const { aerodromes, isLoadingAerodromes } = useAerodromes();
  const { aeronaves, isLoadingAeronaves } = useAeronaves();
  const { getMultipleNOTAMs, validateFlightPlan, error: aiswebError } = useAISWeb();
  const { flightPlans, loading: loadingPlans, createFlightPlan, deleteFlightPlan, refreshFlightPlans } = useFlightPlans();
  const [workspace, setWorkspace] = useState<Workspace>('plano');
  const [step, setStep] = useState<Step>('icao');
  const [savedView, setSavedView] = useState<'icao' | 'rotas'>('icao');
  const [visited, setVisited] = useState({ aerodromos: false, meteorologia: false, salvos: false });
  const [fplResetKey, setFplResetKey] = useState(0);
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [savedPlanCount, setSavedPlanCount] = useState<number | null>(null);
  const [form, setForm] = useState<FlightFormData>({ ...EMPTY_FORM });
  const [calculations, setCalculations] = useState<FlightCalculations | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [deleting, setDeleting] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const request = useRef(0);
  const saveLock = useRef(false);
  const deleteLock = useRef(false);
  const calcLock = useRef(false);
  const alive = useRef(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const validationRef = useRef(validateFlightPlan);
  validationRef.current = validateFlightPlan;

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; request.current += 1; };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const editing = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
      setKeyboardOpen(Boolean(editing) && window.innerHeight - viewport.height > 150);
    };
    viewport.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  const showWorkspace = useCallback((value: Workspace) => {
    if (value !== 'plano') setVisited(previous => ({ ...previous, [value]: true }));
    setWorkspace(value);
  }, []);
  const updateForm = useCallback((patch: Partial<FlightFormData>) => {
    request.current += 1;
    calcLock.current = false;
    setCalculating(false);
    setForm(previous => ({ ...previous, ...patch }));
    setCalculations(null);
    setValidation(null);
  }, []);
  const findAerodrome = useCallback((code: string) => aerodromes.find(item => item.designativo === code), [aerodromes]);
  const icaos = useMemo(() => Array.from(new Set([form.origin, form.destination, form.alternate].filter(Boolean))),
    [form.origin, form.destination, form.alternate]);
  const routeKey = `${form.origin}|${form.destination}`;
  const notams = useResource<Record<string, NOTAMData[]>>(icaos.join('|'), icaos.length > 0,
    () => getMultipleNOTAMs(icaos));
  const charts = useResource(routeKey, Boolean(form.origin || form.destination), async () => {
    const [origin, destination] = await Promise.all([
      form.origin ? fetchAirportCharts(form.origin) : Promise.resolve([]),
      form.destination ? fetchAirportCharts(form.destination) : Promise.resolve([]),
    ]);
    return { origin, destination };
  });
  const weather = useResource(routeKey, Boolean(form.origin || form.destination), async () => {
    const [origin, destination] = await Promise.all([
      form.origin ? fetchAISWebMETAR(form.origin) : Promise.resolve(null),
      form.destination ? fetchAISWebMETAR(form.destination) : Promise.resolve(null),
    ]);
    return { origin, destination };
  });
  const routePoints = useMemo<RoutePoint[]>(() => {
    const points: RoutePoint[] = [];
    const stops = [
      { code: form.origin, type: 'departure' as const },
      { code: form.destination, type: 'arrival' as const },
      { code: form.alternate, type: 'alternate' as const },
    ];
    for (const stop of stops) {
      const aerodrome = findAerodrome(stop.code);
      const coords = aerodrome ? parseCoordinates(aerodrome.coordenadas) : null;
      if (aerodrome && coords) points.push({ icao: stop.code, name: aerodrome.name, ...coords, type: stop.type });
    }
    return points;
  }, [form.origin, form.destination, form.alternate, findAerodrome]);

  async function calculatePlan() {
    if (calcLock.current || saveLock.current) return;
    const origin = findAerodrome(form.origin);
    const destination = findAerodrome(form.destination);
    if (!origin || !destination) { toast.error('Selecione origem e destino.'); return; }
    if (form.origin === form.destination) { toast.error('Escolha um destino diferente da origem.'); return; }
    const originCoords = parseCoordinates(origin.coordenadas);
    const destCoords = parseCoordinates(destination.coordenadas);
    if (!originCoords || !destCoords) { toast.error('Coordenadas indisponíveis para esta rota.'); return; }
    const speed = form.cruiseSpeed.trim() ? Number(form.cruiseSpeed) : 180;
    const altitude = form.cruiseAlt.trim() ? Number(form.cruiseAlt) : 5500;
    if (!Number.isFinite(speed) || speed <= 0 || !Number.isFinite(altitude) || altitude <= 0) {
      toast.error('Informe velocidade e altitude maiores que zero.'); return;
    }
    const aircraft = aeronaves.find(item => item.id === form.aircraftId);
    const fuelConsumption = aircraft?.fuel_consumption || 50;
    const distance = calculateDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
    const bearing = calculateMagneticHeading(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
    if (![distance, bearing, fuelConsumption].every(Number.isFinite)) {
      toast.error('Confira os dados de navegação e consumo da aeronave.'); return;
    }
    const id = ++request.current;
    calcLock.current = true;
    setCalculating(true);
    try {
      let checked: Validation | null = null;
      try {
        checked = await validationRef.current(form.origin, form.destination, form.alternate || null, [originCoords, destCoords], altitude);
      } catch {
        if (id === request.current && alive.current) toast.error('A validação operacional não está disponível.');
      }
      if (id !== request.current || !alive.current) return;
      const time = distance / speed;
      const fuelRequired = time * fuelConsumption;
      // Preserva a regra de reserva de 45% do código fornecido.
      const fuelReserve = fuelRequired * 0.45;
      const optimal = calculateOptimalAltitude(bearing, form.flightRule, checked?.restrictions || []);
      const minutes = Math.round(time * 60);
      setValidation(checked);
      setCalculations({
        distance: Math.round(distance), bearing: Math.round(bearing), time,
        ete: `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min`,
        fuelRequired: Math.round(fuelRequired), fuelReserve: Math.round(fuelReserve),
        totalFuel: Math.round(fuelRequired + fuelReserve), suggestedAlt: optimal.suggested,
        altitudeWarnings: optimal.warnings, alternatives: optimal.alternatives,
      });
      setStep('resumo');
      // Leva o início do resultado para a área visível do scroll do app.
      requestAnimationFrame(() => {
        if (alive.current && id === request.current) sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
      if (checked?.warnings.length) toast.warning(`${checked.warnings.length} alerta(s) na rota.`);
      else toast.success('Estimativa de rota calculada.');
    } catch {
      if (id === request.current && alive.current) toast.error('Não foi possível calcular esta rota.');
    } finally {
      if (id === request.current && alive.current) { calcLock.current = false; setCalculating(false); }
    }
  }

  async function savePlan() {
    if (!calculations || saveLock.current) return;
    if (!user) { toast.error('Entre na sua conta para salvar.'); return; }
    saveLock.current = true;
    setSaving(true);
    try {
      const result: unknown = await createFlightPlan({
        flight_date: form.departure ? form.departure.split('T')[0] : localDate(),
        departure_airport: form.origin, arrival_airport: form.destination,
        aircraft_id: form.aircraftId || undefined, pilot_in_command: user.email || 'Piloto',
        alternate_airport: form.alternate || undefined,
        cruise_altitude: form.cruiseAlt || calculations.suggestedAlt,
        estimated_time: calculations.ete, fuel_endurance: `${calculations.totalFuel}L`,
        route: form.route || 'DCT', status: 'draft' as const, calculations, validation,
        weather: {
          origin: weather.data?.origin || null, destination: weather.data?.destination || null,
          timestamp: weather.updatedAt ?? Date.now(),
        },
      });
      if (result === null || result === false) return;
      if (alive.current) { setSavedView('rotas'); showWorkspace('salvos'); }
    } catch {
      if (alive.current) toast.error('Não foi possível salvar. Tente novamente.');
    } finally {
      saveLock.current = false;
      if (alive.current) setSaving(false);
    }
  }
  function loadPlan(plan: SavedPlan) {
    const aircraft = aeronaves.find(item => item.id === plan.aircraft_id);
    updateForm({
      ...EMPTY_FORM, origin: plan.departure_airport, destination: plan.arrival_airport,
      alternate: plan.alternate_airport || '', aircraftId: plan.aircraft_id || '',
      registration: aircraft?.registration || '', cruiseAlt: plan.cruise_altitude || '', route: plan.route || '',
    });
    setStep('rota'); showWorkspace('plano');
    toast.success('Rota carregada. Revise os dados antes de calcular.');
  }
  function newPlan() {
    if (saving) return;
    updateForm({ ...EMPTY_FORM });
    setFplResetKey(previous => previous + 1);
    setStep('icao'); showWorkspace('plano'); setPendingAction(null);
  }
  async function confirmDelete() {
    if (pendingAction?.type !== 'delete' || deleteLock.current) return;
    deleteLock.current = true; setDeleting(true);
    try {
      const result: unknown = await deleteFlightPlan(pendingAction.plan.id);
      if (result !== false && result !== null && alive.current) setPendingAction(null);
    } catch {
      if (alive.current) toast.error('Não foi possível excluir a rota.');
    } finally {
      deleteLock.current = false;
      if (alive.current) setDeleting(false);
    }
  }
  const onIcaoSaved = () => {
    setSavedView('icao'); setSavedPlanCount(null);
    setSavedRefreshKey(previous => previous + 1); showWorkspace('salvos');
  };
  const showTool = (value: Step) => { setStep(value); showWorkspace('plano'); };
  const hasRoute = Boolean(form.origin || form.destination);
  const notamCount = notams.data ? Object.values(notams.data).reduce((sum, items) => sum + items.length, 0) : null;
  const statusLabels: Record<string, string> = {
    draft: 'Rascunho', filed: 'Enviado', approved: 'Aprovado', completed: 'Concluído', cancelled: 'Cancelado',
  };

  return <MobileLayout>
    <div className="pv-app" data-keyboard={keyboardOpen ? 'open' : 'closed'}>
      <div className="pv-container">
        <header className="pv-header">
          <div className="pv-navbar">
            <NativeButton kind="ghost" className="pv-back" onClick={() => navigate('/')} aria-label="Voltar para o início">
              <ArrowLeft aria-hidden="true" /><span>Início</span>
            </NativeButton>
            <NativeButton kind="ghost" onClick={() => setPendingAction({ type: 'new' })} disabled={saving}>
              <Plus aria-hidden="true" /><span>Novo plano</span>
            </NativeButton>
          </div>
          <div className="pv-title-row"><div><p className="pv-eyebrow">Operações de voo</p><h1>Plano de voo</h1></div>
            <span className="pv-app-icon" aria-hidden="true"><Plane /></span></div>
          <Segments<Workspace> id={`${uid}-module`} value={workspace} options={MODULES}
            onChange={showWorkspace} label="Área do plano de voo" modules />
        </header>

        {aiswebError && <div role="status"><Notice>{aiswebError}</Notice></div>}

        <div ref={sectionRef} className="pv-workspace">
          <div role="tabpanel" id={`${uid}-module-panel-plano`} aria-labelledby={`${uid}-module-tab-plano`} hidden={workspace !== 'plano'}>
            <div className="pv-plan-nav">
              <nav className="pv-segments" aria-label="Etapas do plano">
                {STEPS.map(item => <button key={item.value} type="button" id={`${uid}-step-tab-${item.value}`}
                  aria-current={step === item.value ? 'step' : undefined} aria-controls={`${uid}-step-panel-${item.value}`}
                  onClick={() => setStep(item.value)}>{item.label}</button>)}
              </nav>
              <div className="pv-tools" aria-label="Consultas da rota">
                <NativeButton kind="ghost" aria-pressed={step === 'notams'} onClick={() => showTool(step === 'notams' ? 'rota' : 'notams')}>
                  <Shield aria-hidden="true" /><span>NOTAMs</span>{notamCount !== null && <span className="pv-counter">{notamCount}</span>}
                </NativeButton>
                <NativeButton kind="ghost" aria-pressed={step === 'cartas'} onClick={() => showTool(step === 'cartas' ? 'rota' : 'cartas')}>
                  <FileText aria-hidden="true" /><span>Cartas</span>
                </NativeButton>
              </div>
            </div>

            {/* hidden mantém o rascunho ICAO montado, sem deixar outro painel visível. */}
            <div className="pv-panel pv-embedded" role="region" id={`${uid}-step-panel-icao`} aria-labelledby={`${uid}-step-tab-icao`} hidden={step !== 'icao'}>
              <PlanoIcaoMobile key={fplResetKey} onSaved={onIcaoSaved} />
            </div>

            <div className="pv-panel" role="region" id={`${uid}-step-panel-rota`} aria-labelledby={`${uid}-step-tab-rota`} hidden={step !== 'rota'}>
              <form onSubmit={event => { event.preventDefault(); void calculatePlan(); }}>
                <fieldset className="pv-form-body" disabled={saving}>
                  <Section title="Sua rota" subtitle="Defina os aeródromos do voo."
                    action={<NativeButton kind="ghost" className="pv-icon-button" aria-label="Inverter origem e destino"
                      disabled={!form.origin && !form.destination} onClick={() => updateForm({ origin: form.destination, destination: form.origin })}>
                      <ArrowUpDown aria-hidden="true" /></NativeButton>}>
                    <div className="pv-route-fields">
                      {([
                        { key: 'origin', label: 'Origem', hint: 'Buscar origem', dot: 'origin' },
                        { key: 'destination', label: 'Destino', hint: 'Buscar destino', dot: 'destination' },
                        { key: 'alternate', label: 'Alternativa', hint: 'Buscar alternativa', dot: 'alternate' },
                      ] as const).map(item => <div className="pv-stop" key={item.key}>
                        <span className={`pv-stop-dot pv-stop-dot--${item.dot}`} aria-hidden="true" />
                        <Field label={item.label}>
                          <div className="pv-combobox" role="group" aria-label={item.label}>
                            <AerodromeCombobox aerodromes={aerodromes} value={form[item.key]} disabled={isLoadingAerodromes}
                              onChange={value => updateForm({ [item.key]: value })} placeholder={item.hint} />
                          </div>
                        </Field>
                      </div>)}
                    </div>
                    {isLoadingAerodromes && <p className="pv-caption" role="status">Carregando aeródromos…</p>}
                  </Section>
                  <div className="pv-two-up">
                    <Section title="Aeronave" subtitle="Dados para a estimativa de voo.">
                      <div className="pv-fields">
                        <Field label="Aeronave" htmlFor={`${uid}-aircraft`} wide>
                          <select id={`${uid}-aircraft`} value={form.aircraftId} disabled={isLoadingAeronaves}
                            onChange={event => {
                              const aircraft = aeronaves.find(item => item.id === event.target.value);
                              updateForm({ aircraftId: event.target.value, registration: aircraft?.registration || '' });
                            }}>
                            <option value="">{isLoadingAeronaves ? 'Carregando…' : 'Selecionar aeronave'}</option>
                            {aeronaves.map(item => <option key={item.id} value={item.id}>{item.registration} · {item.model}</option>)}
                          </select>
                        </Field>
                        <Field label="Matrícula" htmlFor={`${uid}-registration`}>
                          <input id={`${uid}-registration`} value={form.registration} autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                            placeholder="PT-ABC" onChange={event => updateForm({ registration: event.target.value.toUpperCase() })} />
                        </Field>
                        <Field label="Passageiros" htmlFor={`${uid}-passengers`}>
                          <input id={`${uid}-passengers`} type="number" inputMode="numeric" min="1" step="1" value={form.passengers || ''}
                            onChange={event => updateForm({ passengers: Math.max(0, Number(event.target.value)) })} required />
                        </Field>
                      </div>
                    </Section>
                    <Section title="Condições de voo" subtitle="Preencha os parâmetros de cruzeiro.">
                      <div className="pv-fields">
                        <Field label="Regra de voo" htmlFor={`${uid}-rule`} wide>
                          <select id={`${uid}-rule`} value={form.flightRule}
                            onChange={event => updateForm({ flightRule: event.target.value as FlightFormData['flightRule'] })}>
                            <option value="V">VFR · Visual</option><option value="I">IFR · Instrumentos</option>
                            <option value="Y">IFR → VFR</option><option value="Z">VFR → IFR</option>
                          </select>
                        </Field>
                        <Field label="Velocidade · kt" htmlFor={`${uid}-speed`}>
                          <input id={`${uid}-speed`} type="number" inputMode="decimal" min="1" step="any" value={form.cruiseSpeed}
                            placeholder="180" onChange={event => updateForm({ cruiseSpeed: event.target.value })} />
                        </Field>
                        <Field label="Altitude · ft" htmlFor={`${uid}-altitude`}>
                          <input id={`${uid}-altitude`} type="number" inputMode="numeric" min="1" step="1" value={form.cruiseAlt}
                            placeholder="5500" onChange={event => updateForm({ cruiseAlt: event.target.value })} />
                        </Field>
                      </div>
                    </Section>
                  </div>
                  <Section title="Partida e navegação">
                    <div className="pv-fields pv-fields--departure">
                      <Field label="Data e hora local" htmlFor={`${uid}-departure`}>
                        <input id={`${uid}-departure`} type="datetime-local" value={form.departure}
                          onChange={event => updateForm({ departure: event.target.value })} />
                      </Field>
                      <Field label="Rota" htmlFor={`${uid}-route`}>
                        <input id={`${uid}-route`} value={form.route} placeholder="DCT" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                          onChange={event => updateForm({ route: event.target.value.toUpperCase() })} />
                      </Field>
                    </div>
                  </Section>
                </fieldset>
                <div className="pv-actionbar"><NativeButton type="submit" kind="primary" busy={calculating}
                  disabled={!form.origin || !form.destination || saving}>
                  {!calculating && <Navigation aria-hidden="true" />}<span>{calculating ? 'Validando a rota…' : 'Calcular e validar rota'}</span>
                  {!calculating && <ArrowRight className="pv-button-trailing" aria-hidden="true" />}
                </NativeButton></div>
              </form>
            </div>

            <div className="pv-panel" role="region" id={`${uid}-step-panel-resumo`} aria-labelledby={`${uid}-step-tab-resumo`} hidden={step !== 'resumo'}>
              {!calculations ? <Empty icon={<Route />} title="Sua rota começa aqui"
                action={<NativeButton kind="primary" onClick={() => setStep('rota')}>Planejar rota<ArrowRight aria-hidden="true" /></NativeButton>}>
                Informe os aeródromos e calcule a estimativa do voo.
              </Empty> : <>
                <Section title="Resumo da rota" action={<span className={`pv-badge pv-tone--${validation?.valid ? 'success' : 'warning'}`}>
                  {validation?.valid ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
                  {validation ? (validation.valid ? 'Validado' : 'Requer atenção') : 'Sem validação'}
                </span>}>
                  <div className="pv-route-summary">
                    <div><span className="pv-caption">Origem</span><strong>{form.origin}</strong><p>{findAerodrome(form.origin)?.name}</p></div>
                    <div className="pv-route-bridge" aria-hidden="true"><Plane /><span>{calculations.distance} NM</span></div>
                    <div><span className="pv-caption">Destino</span><strong>{form.destination}</strong><p>{findAerodrome(form.destination)?.name}</p></div>
                  </div>
                  {validation && !validation.originStatus.operational && <Notice tone="danger">Origem: {validation.originStatus.reason || 'Não operacional'}</Notice>}
                  {validation && !validation.destinationStatus.operational && <Notice tone="danger">Destino: {validation.destinationStatus.reason || 'Não operacional'}</Notice>}
                  {validation && validation.warnings.length > 0 && <Notice><strong>Alertas da rota</strong>
                    <ul>{validation.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
                  </Notice>}
                  {calculations.altitudeWarnings.length > 0 && <Notice><strong>Altitude</strong>
                    <ul>{calculations.altitudeWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
                  </Notice>}
                </Section>
                <div className="pv-metrics">
                  <div><span>Tempo estimado</span><strong>{calculations.ete}</strong></div>
                  <div><span>Proa magnética</span><strong>{calculations.bearing}°</strong></div>
                  <div><span>Altitude sugerida</span><strong>{calculations.suggestedAlt}</strong></div>
                </div>
                <div className="pv-two-up">
                  <Section title="Traçado da rota" className="pv-map-section">
                    <div className="pv-map"><FlightRouteMap points={routePoints} className="pv-route-map" /></div>
                  </Section>
                  <Section title="Combustível" subtitle="Estimativa com os parâmetros atuais.">
                    <dl className="pv-details"><Detail label="Consumo estimado">{calculations.fuelRequired} L</Detail>
                      <Detail label="Reserva (45%)">{calculations.fuelReserve} L</Detail>
                      <Detail label="Total estimado"><strong className="pv-accent">{calculations.totalFuel} L</strong></Detail>
                    </dl>
                    {calculations.alternatives.length > 0 && <div className="pv-altitudes"><p className="pv-caption">Outras altitudes</p>
                      <div className="pv-chips">{calculations.alternatives.map((altitude, index) => <span key={index} className="pv-badge">{altitude}</span>)}</div>
                    </div>}
                  </Section>
                </div>
                <Section title="Meteorologia da rota" action={<NativeButton kind="ghost" className="pv-icon-button" aria-label="Atualizar meteorologia da rota"
                  busy={weather.loading} onClick={() => void weather.reload()}>{!weather.loading && <RefreshCw aria-hidden="true" />}</NativeButton>}>
                  {weather.loading ? <p className="pv-caption" role="status">Atualizando METAR…</p> : weather.error ? <Notice>{weather.error}</Notice> : <div className="pv-weather-grid">
                    {([
                      { code: form.origin, data: weather.data?.origin }, { code: form.destination, data: weather.data?.destination },
                    ]).map(item => <div key={item.code} className="pv-weather-card"><div className="pv-row"><strong>{item.code}</strong>
                      {item.data && <span className="pv-badge">{item.data.flightCategory}</span>}</div>
                      {item.data?.rawOb ? <p className="pv-metar">{item.data.rawOb}</p> : <p className="pv-caption">METAR não disponível nesta consulta.</p>}
                      {item.data?.taf && <p className="pv-metar">TAF: {item.data.taf}</p>}
                      {item.data?.updatedTime && <p className="pv-caption">Observação: {new Date(item.data.updatedTime).toLocaleString('pt-BR')}</p>}
                    </div>)}
                  </div>}
                </Section>
                <div className="pv-actionbar pv-actionbar--split">
                  <NativeButton disabled={saving} onClick={() => setStep('rota')}>Ajustar rota</NativeButton>
                  <NativeButton kind="primary" busy={saving} onClick={() => void savePlan()}>{!saving && <FolderOpen aria-hidden="true" />}
                    {saving ? 'Salvando…' : 'Salvar rota'}</NativeButton>
                </div>
              </>}
            </div>

            <section className="pv-panel" aria-label="NOTAMs e restrições" hidden={step !== 'notams'}>
              <div className="pv-view-heading"><div><h2>NOTAMs</h2><p>Consulta dos aeródromos da rota.</p></div>
                <NativeButton kind="ghost" className="pv-icon-button" aria-label="Atualizar NOTAMs" busy={notams.loading} disabled={!hasRoute}
                  onClick={() => void notams.reload()}>{!notams.loading && <RefreshCw aria-hidden="true" />}</NativeButton></div>
              {!hasRoute ? <Empty icon={<Shield />} title="Selecione uma rota"
                action={<NativeButton onClick={() => setStep('rota')}>Informar aeródromos<ChevronRight aria-hidden="true" /></NativeButton>}>
                Escolha os aeródromos para consultar os NOTAMs.
              </Empty> : notams.loading ? <Empty icon={<Loader2 className="pv-spin" />} title="Consultando NOTAMs…" />
                : notams.error ? <Notice>{notams.error}<NativeButton onClick={() => void notams.reload()}>Tentar novamente</NativeButton></Notice>
                : icaos.map(icao => <Section key={icao} title={icao} subtitle={findAerodrome(icao)?.name}
                  action={<span className="pv-badge">{notams.data?.[icao.toUpperCase()]?.length ?? 0} NOTAMs</span>}>
                  {(notams.data?.[icao.toUpperCase()] || []).length === 0 ? <p className="pv-caption">Nenhum NOTAM retornado nesta consulta.</p>
                    : (notams.data?.[icao.toUpperCase()] || []).map((notam, index) => {
                      const priority = PRIORITY[notam.priority] || PRIORITY.low;
                      return <details key={`${notam.number}-${index}`} className={`pv-notam pv-tone--${priority.tone}`} open={notam.priority === 'critical'}>
                        <summary><span className="pv-notam-number">{notam.number}</span><span className="pv-badge">{priority.label}</span>
                          <ChevronRight aria-hidden="true" /></summary>
                        <div className="pv-notam-body"><p>{notam.message}</p>
                          <p className="pv-caption">{formatDate(notam.startDate)} até {formatDate(notam.endDate)}</p>
                          {notam.schedule && <p className="pv-caption">{notam.schedule}</p>}
                        </div>
                      </details>;
                    })}
                </Section>)}
              {validation && validation.restrictions.length > 0 && <Section title="Restrições na rota">
                {validation.restrictions.map((restriction, index) => <div className="pv-restriction" key={index}>
                  <div className="pv-row"><strong>{restriction.name}</strong><span className="pv-badge">{restriction.type}</span></div>
                  <p>{restriction.notes}</p><p className="pv-caption">Limites: {restriction.lowerLimit} – {restriction.upperLimit}</p>
                  {restriction.schedule && <p className="pv-caption">{restriction.schedule}</p>}
                </div>)}
              </Section>}
            </section>

            <section className="pv-panel" aria-label="Cartas dos aeródromos" hidden={step !== 'cartas'}>
              <div className="pv-view-heading"><div><h2>Cartas</h2><p>Documentos dos aeródromos da rota.</p></div>
                <NativeButton kind="ghost" className="pv-icon-button" aria-label="Atualizar cartas" busy={charts.loading} disabled={!hasRoute}
                  onClick={() => void charts.reload()}>{!charts.loading && <RefreshCw aria-hidden="true" />}</NativeButton></div>
              {!hasRoute ? <Empty icon={<FileText />} title="Escolha os aeródromos"
                action={<NativeButton onClick={() => setStep('rota')}>Informar rota<ChevronRight aria-hidden="true" /></NativeButton>} />
                : charts.loading ? <Empty icon={<Loader2 className="pv-spin" />} title="Carregando cartas…" />
                : charts.error ? <Notice>{charts.error}<NativeButton onClick={() => void charts.reload()}>Tentar novamente</NativeButton></Notice>
                : <div className="pv-two-up">{([
                  { code: form.origin, label: 'Origem', items: charts.data?.origin || [] },
                  { code: form.destination, label: 'Destino', items: charts.data?.destination || [] },
                ]).filter(item => item.code).map(group => <Section key={group.label} title={group.code} subtitle={group.label}>
                  {group.items.length === 0 ? <p className="pv-caption">Nenhuma carta retornada nesta consulta.</p> : group.items.map((chart, index) => <article key={index} className="pv-chart">
                    <div className="pv-row"><h3>{chart.title}</h3><span className="pv-badge">{chart.type}</span></div>
                    {chart.description && <p>{chart.description}</p>}{chart.edition && <p className="pv-caption">Edição {chart.edition}</p>}
                    {chart.url && /^https?:\/\//i.test(chart.url) ? <a className="pv-button pv-button--secondary" href={chart.url} target="_blank" rel="noopener noreferrer">
                      <FileText aria-hidden="true" />Abrir carta<ArrowRight aria-hidden="true" /></a> : <p className="pv-caption">Sem link disponível</p>}
                  </article>)}
                </Section>)}</div>}
            </section>
          </div>

          <div className="pv-panel pv-embedded" role="tabpanel" id={`${uid}-module-panel-aerodromos`} aria-labelledby={`${uid}-module-tab-aerodromos`} hidden={workspace !== 'aerodromos'}>
            {visited.aerodromos && <InformacoesAerodromoMobile />}
          </div>
          <div className="pv-panel pv-embedded" role="tabpanel" id={`${uid}-module-panel-meteorologia`} aria-labelledby={`${uid}-module-tab-meteorologia`} hidden={workspace !== 'meteorologia'}>
            {visited.meteorologia && <MeteorologiaMobile />}
          </div>
          <div className="pv-panel" role="tabpanel" id={`${uid}-module-panel-salvos`} aria-labelledby={`${uid}-module-tab-salvos`} hidden={workspace !== 'salvos'}>
            <div className="pv-view-heading"><div><h2>Seus planos</h2><p>Formulários ICAO e rotas calculadas.</p></div></div>
            <Segments<'icao' | 'rotas'> id={`${uid}-saved`} value={savedView} onChange={setSavedView} label="Tipo de plano salvo"
              options={[{ value: 'icao', label: `ICAO${savedPlanCount !== null ? ` · ${savedPlanCount}` : ''}` }, { value: 'rotas', label: `Rotas · ${flightPlans.length}` }]} />
            <div role="tabpanel" id={`${uid}-saved-panel-icao`} aria-labelledby={`${uid}-saved-tab-icao`} className="pv-saved-panel pv-embedded" hidden={savedView !== 'icao'}>
              {visited.salvos && <PlanoIcaoMobile key={savedRefreshKey} mode="saved" onCountChange={setSavedPlanCount} />}
            </div>
            <div role="tabpanel" id={`${uid}-saved-panel-rotas`} aria-labelledby={`${uid}-saved-tab-rotas`} className="pv-saved-panel" hidden={savedView !== 'rotas'}>
              <div className="pv-list-toolbar"><span className="pv-caption">{flightPlans.length} rota(s)</span>
                <NativeButton kind="ghost" busy={loadingPlans} onClick={() => void refreshFlightPlans()}>
                  {!loadingPlans && <RefreshCw aria-hidden="true" />}Atualizar</NativeButton></div>
              {loadingPlans ? <Empty icon={<Loader2 className="pv-spin" />} title="Carregando suas rotas…" />
                : flightPlans.length === 0 ? <Empty icon={<FolderOpen />} title="Tudo pronto para o primeiro voo"
                  action={<NativeButton kind="primary" onClick={() => { showWorkspace('plano'); setStep('rota'); }}>Planejar rota<ArrowRight aria-hidden="true" /></NativeButton>}>
                  As rotas que você salvar aparecem aqui.
                </Empty> : <div className="pv-saved-grid">{flightPlans.map(plan => <article key={plan.id} className="pv-saved-card">
                  <div className="pv-row"><span className="pv-caption">{formatDate(plan.flight_date)}</span>
                    <span className={`pv-badge${plan.status === 'cancelled' ? ' pv-tone--danger' : plan.status === 'approved' ? ' pv-tone--success' : ''}`}>
                      {statusLabels[plan.status] || plan.status}</span></div>
                  <h3 className="pv-saved-route">{plan.departure_airport}<ArrowRight aria-hidden="true" />{plan.arrival_airport}</h3>
                  <dl className="pv-details"><Detail label="Piloto">{plan.pilot_in_command}</Detail>
                    <Detail label="Distância">{plan.calculations?.distance ?? '—'} NM</Detail><Detail label="Tempo">{plan.estimated_time || '—'}</Detail>
                    {plan.alternate_airport && <Detail label="Alternativa">{plan.alternate_airport}</Detail>}
                  </dl>
                  {plan.validation && !plan.validation.valid && <p className="pv-caption pv-warning-text">Revise os alertas operacionais.</p>}
                  <div className="pv-saved-actions"><NativeButton onClick={() => loadPlan(plan)} disabled={saving}>Usar rota<ChevronRight aria-hidden="true" /></NativeButton>
                    <NativeButton kind="ghost" className="pv-delete" onClick={() => setPendingAction({ type: 'delete', plan })} aria-label={`Excluir rota ${plan.departure_airport} para ${plan.arrival_airport}`}>
                      <Trash2 aria-hidden="true" /></NativeButton></div>
                </article>)}</div>}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={pendingAction !== null} onOpenChange={open => { if (!open && !deleting) setPendingAction(null); }}>
        <DialogContent className="pv-sheet" aria-busy={deleting} onEscapeKeyDown={event => { if (deleting) event.preventDefault(); }}
          onPointerDownOutside={event => { if (deleting) event.preventDefault(); }}>
          <DialogHeader><DialogTitle>{pendingAction?.type === 'delete' ? 'Excluir esta rota?' : 'Começar um novo plano?'}</DialogTitle>
            <DialogDescription>{pendingAction?.type === 'delete'
              ? `${pendingAction.plan.departure_airport} → ${pendingAction.plan.arrival_airport}. A rota será removida dos seus planos salvos.`
              : 'Isso limpa os dados do formulário e da rota que você está preenchendo.'}</DialogDescription></DialogHeader>
          <div className="pv-sheet-actions"><NativeButton kind="secondary" disabled={deleting} onClick={() => setPendingAction(null)}>Continuar aqui</NativeButton>
            <NativeButton kind={pendingAction?.type === 'delete' ? 'danger' : 'primary'} busy={deleting}
              onClick={() => pendingAction?.type === 'delete' ? void confirmDelete() : newPlan()}>
              {pendingAction?.type === 'delete' ? (deleting ? 'Excluindo…' : 'Excluir rota') : 'Criar novo plano'}
            </NativeButton></div>
        </DialogContent>
      </Dialog>
    </div>
  </MobileLayout>;
}
