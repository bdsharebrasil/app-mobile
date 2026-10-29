import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plane, MapPin, Clock, Fuel, Wind, Calendar, AlertTriangle, CheckCircle, FileText, Download, Save, Calculator, Navigation, Route, CloudRain, RefreshCw, Loader2, Shield, Radio, Info, XCircle, AlertCircle, CheckCircle2, Thermometer, ChevronRight, ChevronLeft, FilePlus2, FolderOpen } from 'lucide-react';
import { InlineLottieSpinner } from '@/components/ui/inline-lottie-spinner';
import { useAerodromes, type Aerodromo } from '@/hooks/useAerodromes';
import { useAeronaves, type Aeronave } from '@/hooks/useAeronaves';
import { useAuth } from '@/contexts/AuthContext';
import { useSolarData } from '@/hooks/useSolarData';
import { useAISWeb } from '@/hooks/useAISWeb';
import { useFlightPlans } from '@/hooks/useFlightPlans';
import { calculateDistance, calculateMagneticHeading, calculateOptimalAltitude, isAerodromeOperational, type NOTAMData, type ROTAERData } from '@/lib/aviation';
import { fetchAISWebMETAR, type AISWebMETARData } from '@/services/aiswebWeather';
import { fetchAirportCharts, type ChartData } from '@/services/chartsService';
import { AerodromeCombobox, FlightRouteMap, type RoutePoint } from '@/components/plano-voo';
import PlanoIcaoMobile from '@/components/plano-voo/PlanoIcaoMobile';
import MeteorologiaMobile from '@/components/plano-voo/MeteorologiaMobile';
import InformacoesAerodromoMobile from '@/components/plano-voo/InformacoesAerodromoMobile';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
interface FlightFormData {
  origin: string;
  destination: string;
  alternate: string;
  aircraftId: string;
  registration: string;
  flightRule: 'V' | 'I' | 'Y' | 'Z';
  cruiseAlt: string;
  cruiseSpeed: string;
  departure: string;
  passengers: number;
  route: string;
}
interface FlightCalculations {
  distance: number;
  bearing: number;
  time: number;
  ete: string;
  fuelRequired: number;
  fuelReserve: number;
  totalFuel: number;
  suggestedAlt: string;
  altitudeWarnings: string[];
  alternatives: string[];
}
interface ValidationResult {
  valid: boolean;
  notams: Record<string, NOTAMData[]>;
  originStatus: {
    operational: boolean;
    reason: string | null;
    criticalNOTAMs: NOTAMData[];
    warnings?: string[];
  };
  destinationStatus: {
    operational: boolean;
    reason: string | null;
    criticalNOTAMs: NOTAMData[];
    warnings?: string[];
  };
  restrictions: any[];
  warnings: string[];
}

// Parse coordenadas do banco de dados
function parseCoordinates(coordStr: string | null): {
  lat: number;
  lng: number;
} | null {
  if (!coordStr) return null;

  // Formato decimal: "-23.5505,-46.6333"
  if (coordStr.includes(',') && !coordStr.includes(' ')) {
    const [lat, lng] = coordStr.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        lat,
        lng
      };
    }
  }

  // Formato DMS: "42 47 34.95 W 4 57 33.97 S"
  const dmsRegex = /(\d+)\s+(\d+)\s+([\d.]+)\s*([NSEW])\s+(\d+)\s+(\d+)\s+([\d.]+)\s*([NSEW])/i;
  const match = coordStr.match(dmsRegex);
  if (match) {
    let lng = parseInt(match[1]) + parseInt(match[2]) / 60 + parseFloat(match[3]) / 3600;
    let lat = parseInt(match[5]) + parseInt(match[6]) / 60 + parseFloat(match[7]) / 3600;
    if (match[4].toUpperCase() === 'W') lng = -lng;
    if (match[8].toUpperCase() === 'S') lat = -lat;
    return {
      lat,
      lng
    };
  }
  return null;
}

// Helper para formatar vento
function formatWind(wdir: number | string | null, wspd: number | null, wgst: number | null): string {
  if (wspd === null || wspd === 0) return 'Calmo';
  const direction = wdir !== null ? `${wdir}°` : 'VRB';
  const gust = wgst && wgst > wspd ? ` rajadas ${wgst}kt` : '';
  return `${direction} ${wspd}kt${gust}`;
}

// Helper para formatar visibilidade
function formatVisibility(visib: string | number | null): string {
  if (!visib) return '--';
  const value = typeof visib === 'string' ? parseFloat(visib) : visib;
  if (value >= 9999) return '10km+';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}km`;
  return `${value}m`;
}

// Helper para cor da categoria de voo
function getFlightCategoryColor(cat: string): string {
  switch (cat) {
    case 'VFR':
      return 'text-green-400';
    case 'MVFR':
      return 'text-blue-400';
    case 'IFR':
      return 'text-orange-400';
    case 'LIFR':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}
function getFlightCategoryBg(cat: string): string {
  switch (cat) {
    case 'VFR':
      return 'bg-green-500/20 border-green-500/50';
    case 'MVFR':
      return 'bg-blue-500/20 border-blue-500/50';
    case 'IFR':
      return 'bg-orange-500/20 border-orange-500/50';
    case 'LIFR':
      return 'bg-red-500/20 border-red-500/50';
    default:
      return 'bg-slate-500/20 border-slate-500/50';
  }
}

// Helper para formatar datas de NOTAM com segurança
function formatNOTAMDate(dateValue: any): string {
  try {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Data Inválida';
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn('[formatNOTAMDate] Error formatting date:', dateValue, error);
    return 'Data Inválida';
  }
}

export default function PlanoVooPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('formulario-icao');
  const [fplResetKey, setFplResetKey] = useState(0);
  const [savedPlanCount, setSavedPlanCount] = useState(0);
  const [formData, setFormData] = useState<FlightFormData>({
    origin: '',
    destination: '',
    alternate: '',
    aircraftId: '',
    registration: '',
    flightRule: 'V',
    cruiseAlt: '',
    cruiseSpeed: '',
    departure: '',
    passengers: 1,
    route: ''
  });
  const [calculations, setCalculations] = useState<FlightCalculations | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [originWeather, setOriginWeather] = useState<AISWebMETARData | null>(null);
  const [destWeather, setDestWeather] = useState<AISWebMETARData | null>(null);
  const [originROTAER, setOriginROTAER] = useState<ROTAERData | null>(null);
  const [destROTAER, setDestROTAER] = useState<ROTAERData | null>(null);
  const [originNotams, setOriginNotams] = useState<NOTAMData[]>([]);
  const [destNotams, setDestNotams] = useState<NOTAMData[]>([]);
  const [altNotams, setAltNotams] = useState<NOTAMData[]>([]);
  const [isLoadingNotams, setIsLoadingNotams] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [restrictionsModal, setRestrictionsModal] = useState<{ icao: string; restrictions: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [originCharts, setOriginCharts] = useState<ChartData[]>([]);
  const [destCharts, setDestCharts] = useState<ChartData[]>([]);
  const [isLoadingCharts, setIsLoadingCharts] = useState(false);
  const { solarData: originSolar } = useSolarData(formData.origin || null);
  const { solarData: destSolar } = useSolarData(formData.destination || null);
  const {
    user
  } = useAuth();
  const {
    aerodromes,
    isLoadingAerodromes
  } = useAerodromes();
  const {
    aeronaves,
    isLoadingAeronaves
  } = useAeronaves();
  const {
    getNOTAMs,
    getMultipleNOTAMs,
    getROTAER,
    getRouteRestrictions,
    validateFlightPlan,
    getCacheAge,
    loading: aiswebLoading,
    error: aiswebError
  } = useAISWeb();
  const {
    flightPlans,
    loading: loadingPlans,
    createFlightPlan,
    deleteFlightPlan,
    refreshFlightPlans
  } = useFlightPlans();

  // Obter aeródromo por designativo
  const getAerodromeByCode = useCallback((code: string): Aerodromo | undefined => {
    return aerodromes.find(a => a.designativo === code);
  }, [aerodromes]);

  // Obter aeronave por ID
  const getAircraftById = useCallback((id: string): Aeronave | undefined => {
    return aeronaves.find(a => a.id === id);
  }, [aeronaves]);

  // Pontos para o mapa
  const routePoints = useMemo((): RoutePoint[] => {
    const points: RoutePoint[] = [];
    const originAerodrome = getAerodromeByCode(formData.origin);
    if (originAerodrome) {
      const coords = parseCoordinates(originAerodrome.coordenadas);
      if (coords) {
        points.push({
          icao: originAerodrome.designativo,
          name: originAerodrome.name,
          lat: coords.lat,
          lng: coords.lng,
          type: 'departure'
        });
      }
    }
    const destAerodrome = getAerodromeByCode(formData.destination);
    if (destAerodrome) {
      const coords = parseCoordinates(destAerodrome.coordenadas);
      if (coords) {
        points.push({
          icao: destAerodrome.designativo,
          name: destAerodrome.name,
          lat: coords.lat,
          lng: coords.lng,
          type: 'arrival'
        });
      }
    }
    const altAerodrome = getAerodromeByCode(formData.alternate);
    if (altAerodrome) {
      const coords = parseCoordinates(altAerodrome.coordenadas);
      if (coords) {
        points.push({
          icao: altAerodrome.designativo,
          name: altAerodrome.name,
          lat: coords.lat,
          lng: coords.lng,
          type: 'alternate'
        });
      }
    }
    return points;
  }, [formData.origin, formData.destination, formData.alternate, getAerodromeByCode]);

  // Calcular plano de voo
  const calculateFlightPlan = useCallback(async () => {
    const originAerodrome = getAerodromeByCode(formData.origin);
    const destAerodrome = getAerodromeByCode(formData.destination);
    const aircraft = getAircraftById(formData.aircraftId);
    if (!originAerodrome || !destAerodrome) {
      toast.error('Selecione origem e destino');
      return;
    }
    const originCoords = parseCoordinates(originAerodrome.coordenadas);
    const destCoords = parseCoordinates(destAerodrome.coordenadas);
    if (!originCoords || !destCoords) {
      toast.error('Coordenadas não disponíveis para os aeródromos selecionados');
      return;
    }
    const distance = calculateDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
    const bearing = calculateMagneticHeading(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);

    // Velocidade de cruzeiro
    const cruiseSpeed = formData.cruiseSpeed ? parseInt(formData.cruiseSpeed) : 180;
    const fuelConsumption = aircraft?.fuel_consumption || 50;
    const timeHours = distance / cruiseSpeed;
    const fuelRequired = timeHours * fuelConsumption;
    const fuelReserve = fuelRequired * 0.45;
    const totalFuel = fuelRequired + fuelReserve;

    // Validar plano primeiro para obter restrições
    const validationResult = await validatePlan(originCoords, destCoords);

    // Calcular altitude ótima com restrições
    const altitudeData = calculateOptimalAltitude(bearing, formData.flightRule, validationResult?.restrictions || []);
    setCalculations({
      distance: Math.round(distance),
      bearing: Math.round(bearing),
      time: timeHours,
      fuelRequired: Math.round(fuelRequired),
      fuelReserve: Math.round(fuelReserve),
      totalFuel: Math.round(totalFuel),
      suggestedAlt: altitudeData.suggested,
      altitudeWarnings: altitudeData.warnings,
      alternatives: altitudeData.alternatives,
      ete: `${Math.floor(timeHours)}h ${Math.round(timeHours % 1 * 60)}min`
    });
    setActiveTab('resultados');
    toast.success('Plano de voo calculado');
  }, [formData, getAerodromeByCode, getAircraftById]);

  // Validar plano de voo
  const validatePlan = useCallback(async (originCoords: {
    lat: number;
    lng: number;
  }, destCoords: {
    lat: number;
    lng: number;
  }): Promise<ValidationResult | null> => {
    if (!formData.origin || !formData.destination) return null;
    setIsValidating(true);
    try {
      const altitude = formData.cruiseAlt ? parseInt(formData.cruiseAlt) : 5500;
      const route = [originCoords, destCoords];
      const validationResult = await validateFlightPlan(formData.origin, formData.destination, formData.alternate || null, route, altitude);
      setValidation(validationResult);

      // Mostrar warnings se houver
      if (validationResult.warnings.length > 0) {
        toast.warning(`${validationResult.warnings.length} alertas encontrados`);
      }

      // Alertar se aeródromo não operacional
      if (!validationResult.originStatus.operational) {
        toast.error(`ORIGEM: ${validationResult.originStatus.reason}`);
      }
      if (!validationResult.destinationStatus.operational) {
        toast.error(`DESTINO: ${validationResult.destinationStatus.reason}`);
      }
      return validationResult;
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erro ao validar plano de voo');
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [formData, validateFlightPlan]);

  // Buscar meteorologia
  const fetchWeatherData = useCallback(async () => {
    if (!formData.origin && !formData.destination) {
      toast.error('Selecione origem e/ou destino');
      return;
    }
    setIsLoadingWeather(true);
    try {
      if (formData.origin) {
        const weather = await fetchAISWebMETAR(formData.origin);
        setOriginWeather(weather);
      }
      if (formData.destination) {
        const weather = await fetchAISWebMETAR(formData.destination);
        setDestWeather(weather);
      }
      toast.success('Dados meteorológicos atualizados');
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast.error('Erro ao buscar meteorologia');
    } finally {
      setIsLoadingWeather(false);
    }
  }, [formData.origin, formData.destination]);

  // Buscar dados ROTAER
  const fetchROTAERData = useCallback(async () => {
    if (!formData.origin && !formData.destination) return;
    try {
      if (formData.origin) {
        const rotaer = await getROTAER(formData.origin);
        setOriginROTAER(rotaer);
      }
      if (formData.destination) {
        const rotaer = await getROTAER(formData.destination);
        setDestROTAER(rotaer);
      }
    } catch (error) {
      console.error('Error fetching ROTAER:', error);
    }
  }, [formData.origin, formData.destination, getROTAER]);

  // Buscar ROTAER quando mudar origem/destino
  useEffect(() => {
    if (formData.origin || formData.destination) {
      fetchROTAERData();
    }
  }, [formData.origin, formData.destination, fetchROTAERData]);

  // Auto-fetch NOTAMs quando mudar origem/destino/alternativa
  const fetchNOTAMsData = useCallback(async () => {
    const icaos = [formData.origin, formData.destination, formData.alternate].filter(Boolean);
    if (icaos.length === 0) return;
    setIsLoadingNotams(true);
    try {
      const results = await getMultipleNOTAMs(icaos);
      if (formData.origin) setOriginNotams(results[formData.origin.toUpperCase()] || []);
      if (formData.destination) setDestNotams(results[formData.destination.toUpperCase()] || []);
      if (formData.alternate) setAltNotams(results[formData.alternate.toUpperCase()] || []);
    } catch (error) {
      console.error('Error fetching NOTAMs:', error);
    } finally {
      setIsLoadingNotams(false);
    }
  }, [formData.origin, formData.destination, formData.alternate, getMultipleNOTAMs]);

  // Buscar Cartas do aeródromo
  const fetchChartsData = useCallback(async () => {
    if (!formData.origin && !formData.destination) return;
    setIsLoadingCharts(true);
    try {
      if (formData.origin) {
        const charts = await fetchAirportCharts(formData.origin);
        setOriginCharts(charts);
      }
      if (formData.destination) {
        const charts = await fetchAirportCharts(formData.destination);
        setDestCharts(charts);
      }
    } catch (error) {
      console.error('Error fetching charts:', error);
    } finally {
      setIsLoadingCharts(false);
    }
  }, [formData.origin, formData.destination]);

  useEffect(() => {
    if (formData.origin || formData.destination) {
      fetchNOTAMsData();
      fetchChartsData();
    }
  }, [formData.origin, formData.destination, formData.alternate, fetchNOTAMsData, fetchChartsData]);

  // Salvar plano
  const savePlan = useCallback(async () => {
    if (!calculations) {
      toast.error('Calcule o plano primeiro');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado para salvar planos');
      return;
    }

    // Extrair data da departure ou usar hoje
    const flightDate = formData.departure ? formData.departure.split('T')[0] : new Date().toISOString().split('T')[0];
    const planInput = {
      flight_date: flightDate,
      departure_airport: formData.origin,
      arrival_airport: formData.destination,
      aircraft_id: formData.aircraftId || undefined,
      pilot_in_command: user.email || 'Piloto',
      alternate_airport: formData.alternate || undefined,
      cruise_altitude: formData.cruiseAlt || calculations.suggestedAlt,
      estimated_time: calculations.ete,
      fuel_endurance: `${calculations.totalFuel}L`,
      route: formData.route || 'DCT',
      status: 'draft' as const,
      calculations,
      validation,
      weather: {
        origin: originWeather,
        destination: destWeather,
        timestamp: Date.now()
      }
    };
    await createFlightPlan(planInput);
  }, [formData, calculations, validation, originWeather, destWeather, createFlightPlan, user]);

  // Excluir plano
  const handleDeletePlan = useCallback(async (id: string) => {
    await deleteFlightPlan(id);
  }, [deleteFlightPlan]);

  // Atualizar aircraft quando mudar
  const handleAircraftChange = useCallback((aircraftId: string) => {
    const aircraft = aeronaves.find(a => a.id === aircraftId);
    setFormData(prev => ({
      ...prev,
      aircraftId,
      registration: aircraft?.registration || ''
    }));
  }, [aeronaves]);

  // Renderizar NOTAM badge
  const renderNOTAMBadge = (priority: NOTAMData['priority']) => {
    const config = {
      critical: {
        icon: XCircle,
        color: 'bg-red-500/20 text-red-400 border-red-500/50'
      },
      high: {
        icon: AlertTriangle,
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      },
      medium: {
        icon: AlertCircle,
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      },
      low: {
        icon: Info,
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      }
    };
    const {
      icon: Icon,
      color
    } = config[priority];
    return <Icon className="w-4 h-4" />;
  };

  // Renderizar card de meteorologia
  const renderWeatherCard = (weather: AISWebMETARData | null, title: string, icao: string) => {
    if (!weather) {
      return <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CloudRain className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-semibold">{icao || title}</h3>
          </div>
          <p className="text-slate-400 text-sm">Clique em "Buscar METAR" para carregar</p>
        </Card>;
    }
    return <Card className="bg-slate-800/50 border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-semibold">{weather.icao}</h3>
          </div>
          <Badge className={`${getFlightCategoryBg(weather.flightCategory)} ${getFlightCategoryColor(weather.flightCategory)} border`}>
            {weather.flightCategory}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Temperatura:</span>
            <span className="text-white font-mono">{weather.temp !== null ? `${weather.temp}°C` : '--'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Ponto de Orvalho:</span>
            <span className="text-white font-mono">{weather.dewp !== null ? `${weather.dewp}°C` : '--'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Vento:</span>
            <span className="text-white font-mono">{formatWind(weather.wdir, weather.wspd, weather.wgst)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Visibilidade:</span>
            <span className="text-white font-mono">{formatVisibility(weather.visib)}</span>
          </div>
        </div>

        {weather.rawOb && <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">METAR:</p>
            <p className="text-xs text-slate-500 font-mono break-all">{weather.rawOb}</p>
          </div>}

        {weather.taf && <div className="mt-2 pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">TAF:</p>
            <p className="text-xs text-slate-500 font-mono break-all">{weather.taf}</p>
          </div>}

        {weather.updatedTime && <div className="mt-2 text-xs text-slate-500">
            Atualizado: {new Date(weather.updatedTime).toLocaleTimeString('pt-BR')}
          </div>}
      </Card>;
  };

  // Renderizar card ROTAER
  const renderROTAERCard = (rotaer: ROTAERData | null, icao: string, solarData?: any) => {
    if (!rotaer) {
      return <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-slate-400" />
            <p className="text-slate-400 text-sm">Dados ROTAER não disponíveis</p>
          </div>
        </Card>;
    }

    return <Card className="bg-slate-800/50 border-slate-700 p-4">
        <div className="space-y-4">
          {/* Solar Data - Sunrise/Sunset */}
          {solarData?.day && <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-500/30 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-semibold">Nascer:</span>
                  <span className="text-white font-mono">{solarData.day.sunrise}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-semibold">Pôr:</span>
                  <span className="text-white font-mono">{solarData.day.sunset}</span>
                </div>
              </div>
            </div>}

          {/* Header */}
          <div className="border-b border-slate-700 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-primary" />
              <h3 className="text-white font-semibold">{rotaer.icao} - {rotaer.name}</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 ml-7">
              <div>{rotaer.city}, {rotaer.state}</div>
              <div>Elevação: {rotaer.elevation}ft</div>
              <div>Coordenadas: {rotaer.coordinates.lat.toFixed(2)}°, {rotaer.coordinates.lng.toFixed(2)}°</div>
              <div>Tipo: {rotaer.type}</div>
            </div>
          </div>

          {/* Pistas */}
          {rotaer.runways && rotaer.runways.length > 0 && <div>
              <h4 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" />
                Pistas:
              </h4>
              <div className="grid gap-2 ml-6">
                {rotaer.runways.map((rwy, idx) => <div key={idx} className="text-white bg-slate-900/30 p-2 rounded border border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400">{rwy.designator}</span>
                      <span className="text-slate-400 text-sm">{rwy.surface}</span>
                    </div>
                    <div className="text-slate-300 text-sm mt-1">
                      {rwy.length}m × {rwy.width}m
                      {rwy.strength && <span className="ml-2 text-slate-500">(PCN: {rwy.strength})</span>}
                    </div>
                  </div>)}
              </div>
            </div>}

          {/* Frequências Comunicação */}
          {rotaer.frequencies && rotaer.frequencies.length > 0 && <div>
              <h4 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
                <Radio className="w-4 h-4 text-orange-400" />
                Frequências:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                {rotaer.frequencies.map((freq, idx) => <div key={idx} className="bg-slate-900/30 p-2 rounded border border-slate-700">
                    <div className="text-slate-400 text-xs font-semibold">{freq.type}</div>
                    <div className="text-white font-mono text-sm mt-1">
                      {freq.frequency} MHz
                      {freq.name && <span className="ml-2 text-slate-400">({freq.name})</span>}
                    </div>
                  </div>)}
              </div>
            </div>}

          {/* Auxílios à Navegação */}
          {rotaer.navaids && rotaer.navaids.length > 0 && <div>
              <h4 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400" />
                Auxílios à Navegação:
              </h4>
              <div className="flex flex-wrap gap-2 ml-6">
                {rotaer.navaids.map((nav, idx) => <Badge key={idx} variant="outline" className="bg-purple-500/20 border-purple-500/40 text-purple-300">
                    {nav.type} {nav.identifier} {nav.frequency && `(${nav.frequency})`}
                  </Badge>)}
              </div>
            </div>}

          {/* Serviços */}
          <div>
            <h4 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Serviços Disponíveis:
            </h4>
            <div className="flex flex-wrap gap-2 ml-6">
              {rotaer.services?.fuel && <Badge variant="outline" className="bg-green-500/20 border-green-500/40 text-green-300">
                Combustível {rotaer.services.fuelTypes && rotaer.services.fuelTypes.length > 0 && `(${rotaer.services.fuelTypes.join(', ')})`}
              </Badge>}
              {rotaer.services?.maintenance && <Badge variant="outline" className="bg-orange-500/20 border-orange-500/40 text-orange-300">Manutenção</Badge>}
              {rotaer.services?.hangar && <Badge variant="outline" className="bg-blue-500/20 border-blue-500/40 text-blue-300">Hangar</Badge>}
              {rotaer.services?.customs && <Badge variant="outline" className="bg-purple-500/20 border-purple-500/40 text-purple-300">Alfândega</Badge>}
              {(!rotaer.services?.fuel && !rotaer.services?.maintenance && !rotaer.services?.hangar && !rotaer.services?.customs) && <span className="text-slate-400 text-sm ml-6">Serviços não disponíveis</span>}
            </div>
          </div>

          {/* Restrições */}
          {rotaer.restrictions && rotaer.restrictions.length > 0 && <div>
              <h4 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Restrições e Observações:
              </h4>
              <div className="ml-6 space-y-1">
                {rotaer.restrictions.slice(0, 3).map((restriction, idx) => <p key={idx} className="text-slate-300 text-sm bg-red-900/10 border-l-2 border-red-500 pl-2 py-1">
                    {restriction}
                  </p>)}
                {rotaer.restrictions.length > 3 && <button
                    onClick={() => setRestrictionsModal({ icao: rotaer.icao, restrictions: rotaer.restrictions })}
                    className="mt-2 text-red-400 hover:text-red-300 text-sm font-semibold flex items-center gap-1 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Ver {rotaer.restrictions.length - 3} restrições adicionais
                  </button>}
              </div>
            </div>}

          {/* Contato */}
          {(rotaer.contact?.phone || rotaer.contact?.email) && <div className="border-t border-slate-700 pt-3">
              <h4 className="text-slate-300 font-semibold mb-2">Contato:</h4>
              <div className="text-sm text-slate-300 ml-2 space-y-1">
                {rotaer.contact.phone && <div>Tel: <span className="font-mono">{rotaer.contact.phone}</span></div>}
                {rotaer.contact.email && <div>Email: <span className="font-mono text-blue-400">{rotaer.contact.email}</span></div>}
              </div>
            </div>}
        </div>
      </Card>;
  };
  return <MobileLayout>
      <div className="min-h-screen p-4 sm:p-6 bg-inherit rounded-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 mb-4 p-2 -ml-2 rounded-lg hover:bg-primary/10 transition-colors text-primary hover:text-primary/80"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar</span>
            </button>

            <div className="relative overflow-hidden rounded-2xl border border-slate-600/50 bg-gradient-to-br from-[#12253b] via-[#102034] to-[#102b3d] p-5 shadow-[0_18px_55px_rgba(0,0,0,.2)] sm:p-7">
              <div className="pointer-events-none absolute -right-10 -top-20 h-80 w-1/2 rotate-[18deg] bg-cyan-400/[.04]" />
              <div className="relative">
                <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-sky-400">Operações · ICAO FPL</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Plano de voo</h1>
                <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">Preencha o formulário ICAO, consulte informações operacionais e acesse rapidamente os planos salvos.</p>
                <button type="button" onClick={() => { setFplResetKey((value) => value + 1); setActiveTab('formulario-icao'); }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 text-sm font-bold text-white transition-colors hover:bg-white/[.12] sm:text-base">
                  <FilePlus2 className="h-5 w-5" /> Novo plano
                </button>
              </div>
            </div>
          </div>

          {/* Erro da API AISWeb */}
          {aiswebError && <Alert className="mb-3 sm:mb-4 bg-orange-500/10 border-orange-500/50 text-xs sm:text-sm">
              <AlertTriangle className="w-3 sm:w-4 h-3 sm:h-4 text-orange-400 flex-shrink-0" />
              <AlertDescription className="text-orange-400 text-xs sm:text-sm">
                {aiswebError} - O app continuará funcionando com dados limitados.
              </AlertDescription>
            </Alert>}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
            <nav className="grid grid-cols-2 gap-2 border-b border-border-dark pb-3 sm:gap-3" aria-label="Menu do plano de voo">
              <button type="button" aria-pressed={['formulario-icao', 'planejar', 'resultados', 'notam'].includes(activeTab)} onClick={() => setActiveTab('formulario-icao')} className={`flex min-h-[68px] items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-sm font-bold transition-colors ${['formulario-icao', 'planejar', 'resultados', 'notam'].includes(activeTab) ? 'border-sky-400/70 bg-sky-500 text-slate-950 shadow-lg shadow-sky-950/20' : 'border-border-dark bg-surface-dark text-slate-400 hover:text-white'}`}><FilePlus2 className="h-5 w-5 shrink-0" /><span>Criar Plano de Voo<br className="sm:hidden" /> Completo</span></button>
              <button type="button" aria-pressed={activeTab === 'aerodromos'} onClick={() => setActiveTab('aerodromos')} className={`flex min-h-[68px] items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-sm font-bold transition-colors ${activeTab === 'aerodromos' ? 'border-sky-400/70 bg-sky-500 text-slate-950' : 'border-border-dark bg-surface-dark text-slate-400 hover:text-white'}`}><MapPin className="h-5 w-5 shrink-0" /><span>Informações<br className="sm:hidden" /> Aeródromo</span></button>
              <button type="button" aria-pressed={activeTab === 'meteorologia'} onClick={() => setActiveTab('meteorologia')} className={`flex min-h-[68px] items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-sm font-bold transition-colors ${activeTab === 'meteorologia' ? 'border-sky-400/70 bg-sky-500 text-slate-950' : 'border-border-dark bg-surface-dark text-slate-400 hover:text-white'}`}><CloudRain className="h-5 w-5 shrink-0" /><span>Meteorologia</span></button>
              <button type="button" aria-pressed={activeTab === 'planos-salvos'} onClick={() => setActiveTab('planos-salvos')} className={`flex min-h-[68px] items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-sm font-bold transition-colors ${activeTab === 'planos-salvos' ? 'border-sky-400/70 bg-sky-500 text-slate-950' : 'border-border-dark bg-surface-dark text-slate-400 hover:text-white'}`}><FolderOpen className="h-5 w-5 shrink-0" /><span>Planos de Voo<br className="sm:hidden" /> Salvos</span><span className="ml-1 text-xs">{savedPlanCount}</span></button>
            </nav>
            {['formulario-icao', 'planejar', 'resultados', 'notam'].includes(activeTab) && <div className="flex items-center gap-1 overflow-x-auto border-b border-border-dark" role="tablist" aria-label="Plano de voo completo">
              <button type="button" role="tab" aria-selected={activeTab === 'formulario-icao'} onClick={() => setActiveTab('formulario-icao')} className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold ${activeTab === 'formulario-icao' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'}`}><FilePlus2 className="h-4 w-4" /> Formulário ICAO</button>
              <button type="button" role="tab" aria-selected={activeTab === 'planejar'} onClick={() => setActiveTab('planejar')} className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold ${activeTab === 'planejar' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400'}`}><Route className="h-4 w-4" /> Criar rotas</button>
              {activeTab === 'resultados' && <button type="button" onClick={() => setActiveTab('resultados')} className="px-2 text-xs font-semibold text-slate-400">Resultados</button>}
              {activeTab === 'notam' && <button type="button" onClick={() => setActiveTab('notam')} className="px-2 text-xs font-semibold text-slate-400">NOTAMs</button>}
            </div>}
            <TabsList className="hidden">
              <TabsTrigger value="formulario-icao" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0">
                <FileText className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                <span>ICAO</span>
              </TabsTrigger>
              <TabsTrigger value="planos-salvos" className="hidden">Planos salvos ICAO</TabsTrigger>
              <TabsTrigger value="planejar" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0">
                <Calculator className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Planejar</span>
              </TabsTrigger>
              <TabsTrigger value="resultados" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0">
                <Route className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Resultados</span>
              </TabsTrigger>
              <TabsTrigger value="notam" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0 relative">
                <Shield className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">NOTAMs</span>
                {validation && validation.warnings.length > 0 && <Badge className="absolute top-0 right-0 -mt-1 -mr-1 text-xs bg-red-500/20 text-red-400 border-red-500/50 p-0.5 w-4 h-4 flex items-center justify-center text-xs">
                    {validation.warnings.length}
                  </Badge>}
              </TabsTrigger>
              <TabsTrigger value="aerodromos" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0">
                <Radio className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Aeródromos</span>
              </TabsTrigger>
              <TabsTrigger value="cartas" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0 hidden sm:flex">
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Cartas</span>
              </TabsTrigger>
              <TabsTrigger value="meteorologia" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0 hidden sm:flex">
                <CloudRain className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Meteorologia</span>
              </TabsTrigger>
              <TabsTrigger value="salvos" className="data-[state=active]:bg-primary/20 text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-0 hidden sm:flex">
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Salvos ({flightPlans.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="formulario-icao" forceMount className="space-y-3 sm:space-y-4">
              <PlanoIcaoMobile key={fplResetKey} onSaved={() => setActiveTab('planos-salvos')} />
            </TabsContent>
            <TabsContent value="planos-salvos" className="space-y-3 sm:space-y-4">
              <PlanoIcaoMobile mode="saved" onCountChange={setSavedPlanCount} />
            </TabsContent>
            {/* TAB: Planejar */}
            <TabsContent value="planejar" className="space-y-3 sm:space-y-4">
              <Card className="bg-surface-dark border-border-dark p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Navigation className="w-4 sm:w-5 h-4 sm:h-5 text-primary flex-shrink-0" />
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Informações de Voo</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  {/* Origem */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Aeródromo de Origem *</Label>
                    <div className="mt-2 sm:mt-1">
                      <AerodromeCombobox aerodromes={aerodromes} value={formData.origin} onChange={val => setFormData({
                      ...formData,
                      origin: val
                    })} placeholder="Buscar origem..." disabled={isLoadingAerodromes} />
                    </div>
                    {originNotams.length > 0 && <div className="mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-warning" />
                        <span className="text-xs text-warning">{originNotams.length} NOTAM(s) ativo(s)</span>
                      </div>}
                  </div>

                  {/* Destino */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Aeródromo de Destino *</Label>
                    <div className="mt-2 sm:mt-1">
                      <AerodromeCombobox aerodromes={aerodromes} value={formData.destination} onChange={val => setFormData({
                      ...formData,
                      destination: val
                    })} placeholder="Buscar destino..." disabled={isLoadingAerodromes} />
                    </div>
                    {destNotams.length > 0 && <div className="mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-warning" />
                        <span className="text-xs text-warning">{destNotams.length} NOTAM(s) ativo(s)</span>
                      </div>}
                  </div>

                  {/* Alternativa */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Alternativa</Label>
                    <div className="mt-2 sm:mt-1">
                      <AerodromeCombobox aerodromes={aerodromes} value={formData.alternate} onChange={val => setFormData({
                      ...formData,
                      alternate: val
                    })} placeholder="Buscar alternativa..." disabled={isLoadingAerodromes} />
                    </div>
                    {altNotams.length > 0 && <div className="mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-warning" />
                        <span className="text-xs text-warning">{altNotams.length} NOTAM(s) ativo(s)</span>
                      </div>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {/* Aeronave */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Aeronave *</Label>
                    <select value={formData.aircraftId} onChange={e => handleAircraftChange(e.target.value)} className="w-full mt-2 sm:mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground text-xs sm:text-sm h-9 sm:h-10" disabled={isLoadingAeronaves}>
                      <option value="">Selecione</option>
                      {aeronaves.map(ac => <option key={ac.id} value={ac.id}>
                          {ac.registration} - {ac.model}
                        </option>)}
                    </select>
                  </div>

                  {/* Matrícula */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Matrícula</Label>
                    <Input value={formData.registration} onChange={e => setFormData({
                    ...formData,
                    registration: e.target.value.toUpperCase()
                  })} placeholder="PT-ABC" className="mt-2 sm:mt-1 bg-background border-border text-foreground text-xs sm:text-sm h-9 sm:h-10" />
                  </div>

                  {/* Regra de Voo */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Regra de Voo</Label>
                    <select value={formData.flightRule} onChange={e => setFormData({
                    ...formData,
                    flightRule: e.target.value as 'V' | 'I' | 'Y' | 'Z'
                  })} className="w-full mt-2 sm:mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground text-xs sm:text-sm h-9 sm:h-10">
                      <option value="V">VFR</option>
                      <option value="I">IFR</option>
                      <option value="Y">IFR/VFR</option>
                      <option value="Z">VFR/IFR</option>
                    </select>
                  </div>

                  {/* Passageiros */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Passageiros</Label>
                    <Input type="number" value={formData.passengers} onChange={e => setFormData({
                    ...formData,
                    passengers: parseInt(e.target.value) || 1
                  })} min="1" className="mt-2 sm:mt-1 bg-background border-border text-foreground text-xs sm:text-sm h-9 sm:h-10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  {/* Velocidade de Cruzeiro */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Velocidade Cruzeiro (kt)</Label>
                    <Input value={formData.cruiseSpeed} onChange={e => setFormData({
                    ...formData,
                    cruiseSpeed: e.target.value
                  })} placeholder="180" className="mt-2 sm:mt-1 bg-background border-border text-foreground text-xs sm:text-sm h-9 sm:h-10" />
                  </div>

                  {/* Data/Hora */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Data/Hora de Partida</Label>
                    <Input type="datetime-local" value={formData.departure} onChange={e => setFormData({
                    ...formData,
                    departure: e.target.value
                  })} className="mt-2 sm:mt-1 bg-background border-border text-foreground text-xs sm:text-sm h-9 sm:h-10" />
                  </div>

                  {/* Rota */}
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Rota</Label>
                    <Input value={formData.route} onChange={e => setFormData({
                    ...formData,
                    route: e.target.value.toUpperCase()
                  })} placeholder="DCT ou via pontos" className="mt-2 sm:mt-1 bg-background border-border text-foreground text-xs sm:text-sm h-9 sm:h-10" />
                  </div>
                </div>

                <Button onClick={calculateFlightPlan} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm h-9 sm:h-10" disabled={!formData.origin || !formData.destination || isValidating}>
                  {isValidating ? <>
                      <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                      <span className="hidden sm:inline">Validando...</span>
                      <span className="sm:hidden">Calc...</span>
                    </> : <>
                      <Calculator className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Calcular e Validar</span>
                      <span className="sm:hidden">Calcular</span>
                    </>}
                </Button>
              </Card>
            </TabsContent>

            {/* TAB: Resultados - CONTINUAÇÃO NO PRÓXIMO ARQUIVO */}
            <TabsContent value="resultados" className="space-y-4">
              {calculations ? <>
                  {/* Status do Plano */}
                  <Card className="bg-surface-dark border-border-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Status do Plano</h2>
                      </div>
                      {validation && <Badge variant="outline" className={validation.valid ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"}>
                          {validation.valid ? <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Plano Válido
                            </> : <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Atenção Necessária
                            </>}
                        </Badge>}
                    </div>

                    {/* Warnings */}
                    {validation && validation.warnings.length > 0 && <Alert className="mb-4 bg-yellow-500/10 border-yellow-500/50">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <AlertDescription className="text-yellow-400">
                          <div className="font-semibold mb-1">{validation.warnings.length} alerta(s) encontrado(s):</div>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {validation.warnings.slice(0, 3).map((warning, idx) => <li key={idx}>{warning}</li>)}
                            {validation.warnings.length > 3 && <li className="text-yellow-300">+ {validation.warnings.length - 3} outros alertas (veja aba NOTAMs)</li>}
                          </ul>
                        </AlertDescription>
                      </Alert>}

                    {/* Warnings de Altitude */}
                    {calculations.altitudeWarnings.length > 0 && <Alert className="mb-4 bg-orange-500/10 border-orange-500/50">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <AlertDescription className="text-orange-400">
                          <div className="font-semibold mb-1">Atenção - Altitude:</div>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {calculations.altitudeWarnings.map((warning, idx) => <li key={idx}>{warning}</li>)}
                          </ul>
                        </AlertDescription>
                      </Alert>}

                    <div className="flex items-center justify-between py-6">
                      <div className="text-center">
                        <MapPin className="w-6 h-6 text-green-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-foreground">{formData.origin}</p>
                        <p className="text-sm text-muted-foreground">{getAerodromeByCode(formData.origin)?.name}</p>
                        {validation && !validation.originStatus.operational && <Badge className="mt-1 bg-red-500/20 text-red-400 border-red-500/50">
                            <XCircle className="w-3 h-3 mr-1" />
                            Não Operacional
                          </Badge>}
                      </div>

                      <div className="flex-1 mx-4 border-t border-dashed border-primary/50 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-dark px-3">
                          <span className="text-primary font-bold">{calculations.distance} NM</span>
                        </div>
                      </div>

                      <div className="text-center">
                        <MapPin className="w-6 h-6 text-red-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-foreground">{formData.destination}</p>
                        <p className="text-sm text-muted-foreground">{getAerodromeByCode(formData.destination)?.name}</p>
                        {validation && !validation.destinationStatus.operational && <Badge className="mt-1 bg-red-500/20 text-red-400 border-red-500/50">
                            <XCircle className="w-3 h-3 mr-1" />
                            Não Operacional
                          </Badge>}
                      </div>
                    </div>
                  </Card>

                  {/* Mapa e Detalhes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Mapa */}
                    <Card className="bg-surface-dark border-border-dark p-3 sm:p-4 h-[300px] sm:h-[400px]">
                      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <MapPin className="w-3 sm:w-4 h-3 sm:h-4 text-primary flex-shrink-0" />
                        Rota
                      </h3>
                      <FlightRouteMap points={routePoints} className="h-[240px] sm:h-[340px]" />
                    </Card>

                    {/* Detalhes */}
                    <div className="space-y-3 sm:space-y-4">
                      <Card className="bg-surface-dark border-border-dark p-3 sm:p-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-primary flex-shrink-0" />
                          <span>Tempo e Navegação</span>
                        </h3>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tempo Estimado:</span>
                            <span className="text-foreground font-mono">{calculations.ete}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Proa Magnética:</span>
                            <span className="text-foreground font-mono">{calculations.bearing}°</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Altitude Sugerida:</span>
                            <span className="text-foreground font-mono font-bold text-primary">{calculations.suggestedAlt}</span>
                          </div>
                          {calculations.alternatives.length > 0 && <div className="pt-2 border-t border-border-dark">
                              <span className="text-muted-foreground text-xs block mb-1">Alternativas:</span>
                              <div className="flex flex-wrap gap-1">
                                {calculations.alternatives.map((alt, idx) => <Badge key={idx} variant="outline" className="text-xs">
                                    {alt}
                                  </Badge>)}
                              </div>
                            </div>}
                        </div>
                      </Card>

                      <Card className="bg-surface-dark border-border-dark p-3 sm:p-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Fuel className="w-3 sm:w-4 h-3 sm:h-4 text-primary flex-shrink-0" />
                          <span>Combustível</span>
                        </h3>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Consumo Estimado:</span>
                            <span className="text-foreground font-mono">{calculations.fuelRequired} L</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reserva (45%):</span>
                            <span className="text-foreground font-mono">{calculations.fuelReserve} L</span>
                          </div>
                          <div className="flex justify-between border-t border-border-dark pt-2">
                            <span className="text-muted-foreground font-semibold">Total Necessário:</span>
                            <span className="text-primary font-mono font-bold">{calculations.totalFuel} L</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Ações */}
                  <Card className="bg-surface-dark border-border-dark p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button onClick={savePlan} variant="outline" className="border-border-dark text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-auto">
                        <Save className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline">Salvar Plano</span>
                        <span className="sm:hidden">Salvar</span>
                      </Button>
                      <Button variant="outline" className="border-border-dark text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-auto" disabled>
                        <Download className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline">Exportar PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </Button>
                      <Button onClick={() => setActiveTab('notam')} variant="outline" className="border-border-dark text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-auto">
                        <Shield className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline">Ver NOTAMs</span>
                        <span className="sm:hidden">NOTAMs</span>
                      </Button>
                    </div>
                  </Card>
                </> : <Card className="bg-surface-dark border-border-dark p-12 text-center">
                  <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Preencha os dados e calcule o plano de voo</p>
                </Card>}
            </TabsContent>

            {/* TAB: NOTAMs */}
            <TabsContent value="notam" className="space-y-3 sm:space-y-4">
              {validation ? <>
                  {Object.entries(validation.notams).map(([icao, notams]) => <Card key={icao} className="bg-surface-dark border-border-dark p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-primary" />
                          <h3 className="text-white font-semibold">{icao}</h3>
                        </div>
                        <Badge variant="outline">
                          {notams.length} NOTAM{notams.length !== 1 ? 'S' : ''}
                        </Badge>
                      </div>

                      {notams.length === 0 ? <p className="text-slate-400 text-sm">Nenhum NOTAM ativo</p> : <div className="space-y-2">
                          {notams.map((notam, idx) => <div key={idx} className={`p-3 rounded-lg border ${notam.priority === 'critical' ? 'bg-red-500/10 border-red-500/50' : notam.priority === 'high' ? 'bg-orange-500/10 border-orange-500/50' : notam.priority === 'medium' ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-blue-500/10 border-blue-500/50'}`}>
                              <div className="flex items-start gap-2">
                                {renderNOTAMBadge(notam.priority)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs text-slate-400">{notam.number}</span>
                                    <Badge variant="outline" className={`text-xs ${notam.priority === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/50' : notam.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : notam.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-blue-500/20 text-blue-400 border-blue-500/50'}`}>
                                      {notam.priority.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="text-white text-sm mb-2">{notam.message}</p>
                                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                                    <span>Válido: {formatNOTAMDate(notam.startDate)} - {formatNOTAMDate(notam.endDate)}</span>
                                    {notam.schedule && <span>• {notam.schedule}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>)}
                        </div>}
                    </Card>)}

                  {/* Restrições de Espaço Aéreo */}
                  {validation.restrictions && validation.restrictions.length > 0 && <Card className="bg-surface-dark border-border-dark p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-orange-400" />
                        <h3 className="text-white font-semibold">Restrições de Espaço Aéreo na Rota</h3>
                      </div>
                      <div className="space-y-2">
                        {validation.restrictions.map((restriction, idx) => <div key={idx} className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-semibold">{restriction.name}</span>
                              <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                                {restriction.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-300 mb-1">{restriction.notes}</p>
                            <div className="text-xs text-slate-400">
                              Limites: {restriction.lowerLimit} - {restriction.upperLimit}
                              {restriction.schedule && ` • ${restriction.schedule}`}
                            </div>
                          </div>)}
                      </div>
                    </Card>}
                </> : <Card className="bg-surface-dark border-border-dark p-12 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Calcule o plano de voo para ver NOTAMs</p>
                </Card>}
            </TabsContent>

            {/* TAB: Aeródromos */}
            <TabsContent value="aerodromos" className="space-y-3 sm:space-y-4">
              <InformacoesAerodromoMobile />
            </TabsContent>

            {/* TAB: Cartas */}
            <TabsContent value="cartas" className="space-y-3 sm:space-y-4">
              <div className="flex justify-end mb-2">
                <Button onClick={fetchChartsData} disabled={isLoadingCharts || !formData.origin && !formData.destination} className="bg-primary hover:bg-primary/90 text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4">
                  {isLoadingCharts ? <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2 animate-spin" /> : <RefreshCw className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />}
                  <span className="hidden sm:inline">Atualizar</span>
                  <span className="sm:hidden">Atualizar</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Cartas Origem */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Cartas - {formData.origin || 'Origem'}
                  </h3>
                  {originCharts.length > 0 ? <div className="space-y-2">
                      {originCharts.map((chart, idx) => <div key={idx} className="bg-slate-900/30 border border-slate-700 rounded-lg p-3 hover:bg-slate-900/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-white font-semibold text-sm">{chart.title}</h4>
                              {chart.description && <p className="text-slate-400 text-xs mt-1">{chart.description}</p>}
                            </div>
                            <Badge variant="outline" className={`ml-2 flex-shrink-0 ${
                              chart.type === 'IFR' ? 'bg-red-500/20 border-red-500/50 text-red-300' :
                              chart.type === 'VFR' ? 'bg-green-500/20 border-green-500/50 text-green-300' :
                              'bg-blue-500/20 border-blue-500/50 text-blue-300'
                            }`}>
                              {chart.type}
                            </Badge>
                          </div>
                          {chart.edition && <p className="text-slate-500 text-xs mb-2">Edição: {chart.edition}</p>}
                          {chart.url ? <a href={chart.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-semibold">
                              <Download className="w-3 h-3" />
                              Download
                            </a> : <span className="text-slate-500 text-xs">Sem link disponível</span>}
                        </div>)}
                    </div> : <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 text-center text-slate-400">
                      {isLoadingCharts ? <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando...
                        </span> : <span>Nenhuma carta disponível</span>}
                    </div>}
                </div>

                {/* Cartas Destino */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Cartas - {formData.destination || 'Destino'}
                  </h3>
                  {destCharts.length > 0 ? <div className="space-y-2">
                      {destCharts.map((chart, idx) => <div key={idx} className="bg-slate-900/30 border border-slate-700 rounded-lg p-3 hover:bg-slate-900/50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-white font-semibold text-sm">{chart.title}</h4>
                              {chart.description && <p className="text-slate-400 text-xs mt-1">{chart.description}</p>}
                            </div>
                            <Badge variant="outline" className={`ml-2 flex-shrink-0 ${
                              chart.type === 'IFR' ? 'bg-red-500/20 border-red-500/50 text-red-300' :
                              chart.type === 'VFR' ? 'bg-green-500/20 border-green-500/50 text-green-300' :
                              'bg-blue-500/20 border-blue-500/50 text-blue-300'
                            }`}>
                              {chart.type}
                            </Badge>
                          </div>
                          {chart.edition && <p className="text-slate-500 text-xs mb-2">Edição: {chart.edition}</p>}
                          {chart.url ? <a href={chart.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-semibold">
                              <Download className="w-3 h-3" />
                              Download
                            </a> : <span className="text-slate-500 text-xs">Sem link disponível</span>}
                        </div>)}
                    </div> : <div className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 text-center text-slate-400">
                      {isLoadingCharts ? <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando...
                        </span> : <span>Nenhuma carta disponível</span>}
                    </div>}
                </div>
              </div>
            </TabsContent>

            {/* TAB: Meteorologia */}
            <TabsContent value="meteorologia" className="space-y-3 sm:space-y-4">
              <MeteorologiaMobile />
            </TabsContent>

            {/* TAB: Salvos */}
            <TabsContent value="salvos" className="space-y-3 sm:space-y-4">
              {loadingPlans ? <Card className="bg-surface-dark border-border-dark p-12 text-center">
                  <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Carregando planos...</p>
                </Card> : flightPlans.length === 0 ? <Card className="bg-surface-dark border-border-dark p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum plano de voo salvo ainda</p>
                </Card> : flightPlans.map(plan => <Card key={plan.id} className="bg-surface-dark border-border-dark p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Plane className="w-4 h-4 text-primary" />
                          <span className="text-foreground font-semibold">
                            {plan.departure_airport} → {plan.arrival_airport}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {new Date(plan.flight_date).toLocaleDateString('pt-BR')}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${plan.status === 'filed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : plan.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/50' : plan.status === 'completed' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : plan.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-gray-500/20 text-gray-400 border-gray-500/50'}`}>
                            {plan.status.toUpperCase()}
                          </Badge>
                          {plan.validation && !plan.validation.valid && <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Atenção
                            </Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>Piloto: {plan.pilot_in_command}</span>
                          <span className="mx-2">•</span>
                          <span>Distância: {plan.calculations?.distance || '--'} NM</span>
                          <span className="mx-2">•</span>
                          <span>Tempo: {plan.estimated_time || '--'}</span>
                          {plan.alternate_airport && <>
                              <span className="mx-2">•</span>
                              <span>Alt: {plan.alternate_airport}</span>
                            </>}
                        </div>
                        {plan.validation && plan.validation.warnings.length > 0 && <div className="mt-2 text-xs text-yellow-400">
                            {plan.validation.warnings.length} alerta(s) - Verifique NOTAMs
                          </div>}
                        <div className="mt-2 text-xs text-slate-500">
                          Criado em: {new Date(plan.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                    setFormData({
                      origin: plan.departure_airport,
                      destination: plan.arrival_airport,
                      alternate: plan.alternate_airport || '',
                      aircraftId: plan.aircraft_id || '',
                      registration: '',
                      flightRule: 'V',
                      cruiseAlt: plan.cruise_altitude || '',
                      cruiseSpeed: '',
                      departure: '',
                      passengers: 1,
                      route: plan.route || ''
                    });
                    if (plan.calculations) {
                      setCalculations(plan.calculations);
                    }
                    if (plan.validation) {
                      setValidation(plan.validation);
                    }
                    setActiveTab('planejar');
                    toast.success('Plano carregado para edição');
                  }} className="text-primary hover:text-primary/80 hover:bg-primary/10">
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>)}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de Restrições */}
      <Dialog open={!!restrictionsModal} onOpenChange={(open) => !open && setRestrictionsModal(null)}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Restrições e Observações - {restrictionsModal?.icao}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Todas as restrições operacionais e observações importantes para este aeródromo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {restrictionsModal?.restrictions.map((restriction, idx) => <div key={idx} className="bg-red-900/20 border-l-4 border-red-500 pl-4 py-3 rounded">
                <p className="text-slate-200 text-sm leading-relaxed">
                  <span className="text-red-400 font-semibold mr-2">•</span>
                  {restriction}
                </p>
              </div>)}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>;
}
