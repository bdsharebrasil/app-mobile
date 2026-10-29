import { useState } from 'react';
import { CloudSun, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

type Camada = 'temp' | 'clouds' | 'wind' | 'rain' | 'pressure' | 'visibility';
type Weather = { loc?: string; metar?: string; taf?: string; source?: string; observed_at?: string | null; temperature_c?: number | null; dew_point_c?: number | null; qnh_hpa?: number | null; wind?: { direction_deg?: number | null; speed_kt?: number | null; gust_kt?: number | null; variable?: boolean } | null };
type Airport = { icao?: string; coordinates?: { lat: number; lng: number } | null; name?: string; city?: string | null; state?: string | null };
const layers: Array<{ id: Camada; label: string }> = [{ id: 'temp', label: 'Temperatura' }, { id: 'clouds', label: 'Nuvens' }, { id: 'wind', label: 'Vento' }, { id: 'rain', label: 'Chuva' }, { id: 'pressure', label: 'Pressão' }, { id: 'visibility', label: 'Visibilidade' }];
const fieldClass = 'h-12 rounded-xl border-white/10 bg-[#0a1729] font-mono text-base tracking-widest text-white placeholder:text-slate-500';

export default function MeteorologiaMobile() {
  const [icao, setIcao] = useState('');
  const [consultado, setConsultado] = useState<{ icao: string; weather: Weather; airport: Airport } | null>(null);
  const [layer, setLayer] = useState<Camada>('temp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const consultar = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = icao.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) { setError('Informe um código ICAO de quatro letras, por exemplo SBGR.'); setConsultado(null); return; }
    setLoading(true); setError('');
    try {
      const [weather, ficha] = await Promise.all([
        apiClient.get<Weather>(`/api/weather/${encodeURIComponent(code)}`),
        apiClient.get<{ airport?: Airport }>(`/api/rotaer/${encodeURIComponent(code)}`),
      ]);
      setConsultado({ icao: code, weather, airport: ficha.airport ?? {} });
    } catch (cause) {
      setConsultado(null);
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a meteorologia do aeródromo.');
    } finally { setLoading(false); }
  };
  const coord = consultado?.airport.coordinates;
  const mapUrl = consultado && coord ? `https://embed.windy.com/embed.html?${new URLSearchParams({ type: 'map', location: 'coordinates', metricRain: 'mm', metricTemp: '°C', metricWind: 'kt', zoom: '8', overlay: layer, product: 'ecmwf', level: 'surface', lat: String(coord.lat), lon: String(coord.lng), detailLat: String(coord.lat), detailLon: String(coord.lng), marker: 'true' }).toString()}` : '';
  const wind = consultado?.weather.wind;
  const windValue = !wind?.speed_kt && wind?.speed_kt !== 0 ? '—' : `${wind.variable ? 'Variável' : `${wind.direction_deg ?? '—'}°`} · ${wind.speed_kt} kt${wind.gust_kt ? ` G${wind.gust_kt}` : ''}`;
  return <section className="space-y-4 text-white">
    <header><h2 className="mt-1 text-2xl font-extrabold">Meteorologia</h2><p className="mt-1 text-sm leading-5 text-slate-400">Consulte METAR e TAF e acompanhe as camadas meteorológicas no mapa.</p></header>
    <form onSubmit={(event) => void consultar(event)} className="space-y-3 rounded-2xl border border-white/10 bg-[#101e33] p-4">
      <label htmlFor="meteo-icao" className="text-xs font-bold uppercase tracking-wide text-slate-300">Código ICAO do aeródromo</label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input id="meteo-icao" value={icao} onChange={(event) => setIcao(event.target.value.toUpperCase())} maxLength={4} placeholder="Ex.: SBGR" className={fieldClass} /><Button type="submit" disabled={loading} className="min-h-12 rounded-xl bg-sky-500 px-4 font-bold text-slate-950 hover:bg-sky-400">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudSun className="mr-2 h-4 w-4" />}Consultar</Button></div>
    </form>
    {error && <p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-400/[.08] p-3 text-sm text-rose-100">{error}</p>}
    {consultado && <div className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-[#101e33] p-4"><p className="font-mono text-xs font-bold text-sky-300">{consultado.icao} · {consultado.weather.source || 'AISWEB/DECEA'}</p><h3 className="mt-1 text-lg font-bold">{consultado.airport.name || consultado.icao}</h3><p className="text-xs text-slate-400">{[consultado.airport.city, consultado.airport.state].filter(Boolean).join(' / ')}{consultado.weather.observed_at ? ` · Observado ${consultado.weather.observed_at}` : ''}</p></header>
      <div className="grid grid-cols-2 gap-2"><Metric label="Temperatura" value={consultado.weather.temperature_c == null ? '—' : `${consultado.weather.temperature_c} °C`} /><Metric label="Ponto de orvalho" value={consultado.weather.dew_point_c == null ? '—' : `${consultado.weather.dew_point_c} °C`} /><Metric label="Vento" value={windValue} /><Metric label="QNH" value={consultado.weather.qnh_hpa == null ? '—' : `${consultado.weather.qnh_hpa} hPa`} /></div>
      <div className="space-y-3"><DataBlock title="METAR · AISWEB/DECEA" value={consultado.weather.metar || 'METAR indisponível.'} /><DataBlock title="TAF · AISWEB/DECEA" value={consultado.weather.taf || 'TAF indisponível.'} /></div>
      <section className="space-y-3"><div><h3 className="text-base font-bold">Mapa meteorológico</h3></div><div className="flex gap-2 overflow-x-auto pb-1">{layers.map((item) => <button key={item.id} type="button" aria-pressed={layer === item.id} onClick={() => setLayer(item.id)} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold ${layer === item.id ? 'bg-sky-400 text-slate-950' : 'border border-white/10 bg-[#101e33] text-slate-300'}`}>{item.label}</button>)}</div>{mapUrl ? <iframe key={mapUrl} src={mapUrl} title={`Mapa meteorológico de ${consultado.icao}`} loading="lazy" className="h-[28rem] w-full rounded-2xl border border-white/10 bg-[#101e33]" /> : <p className="rounded-xl border border-white/10 bg-[#101e33] p-4 text-sm text-slate-400">A consulta não retornou coordenadas; não foi possível posicionar o mapa.</p>}</section>
    </div>}
  </section>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-2xl border border-white/10 bg-[#101e33] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words font-mono text-sm font-semibold text-sky-300">{value}</p></div>; }
function DataBlock({ title, value }: { title: string; value: string }) { return <section className="rounded-2xl border border-white/10 bg-[#101e33] p-4"><h3 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</h3><p className="break-words whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-100">{value}</p></section>; }
