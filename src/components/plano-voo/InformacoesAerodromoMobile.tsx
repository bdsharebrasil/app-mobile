import { useMemo, useState } from 'react';
import { Loader2, MapPin, Search, ExternalLink, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { BACKEND } from '@/config/api';

type Weather = { metar?: string; taf?: string; source?: string };
type Chart = { title?: string; tipo?: string; descricao?: string; url?: string };
type Notam = { id: string; number?: string | null; type?: string | null; message?: string; start?: string | null; end?: string | null };
type Airport = { icao?: string; name?: string; city?: string | null; state?: string | null; elevation?: string | number | null; coordinates?: { lat: number; lng: number } | null; runways?: any[]; frequencies?: any[]; restrictions?: any[]; operational?: Record<string, unknown>; contact?: Record<string, unknown>; raw_data?: Record<string, any> };
type Report = { weather?: Weather; charts: Chart[]; notams: Notam[]; solar?: { date?: string; sunrise?: string; sunset?: string }[]; airport?: Airport; errors: string[] };
const categories = ['Todas', 'REA', 'Visual', 'IFR', 'Aeródromo', 'Outras'] as const;
type Category = typeof categories[number];
const inputClass = 'h-12 rounded-xl border-white/10 bg-[#0a1729] font-mono text-base tracking-widest text-white placeholder:text-slate-500';

async function loadReport(icao: string): Promise<Report> {
  const errors: string[] = [];
  const safe = async <T,>(label: string, request: () => Promise<T>): Promise<T | undefined> => {
    try { return await request(); } catch (error) { errors.push(`${label}: ${error instanceof Error ? error.message : 'indisponível'}`); return undefined; }
  };
  const [weather, notamsResponse, chartsResponse, solarResponse, airportResponse] = await Promise.all([
    safe('Meteorologia', () => apiClient.get<Weather>(`/api/weather/${encodeURIComponent(icao)}`)),
    safe('NOTAM', () => apiClient.get<{ notams?: Notam[] }>(`/api/notam/${encodeURIComponent(icao)}`)),
    safe('Cartas', () => apiClient.get<{ charts?: Chart[] }>(`/api/charts/${encodeURIComponent(icao)}`)),
    safe('Nascer/pôr do sol', () => apiClient.get<{ solar?: Report['solar'] }>(`/api/solar/${encodeURIComponent(icao)}`)),
    safe('Ficha do aeródromo', () => apiClient.get<{ airport?: Airport }>(`/api/rotaer/${encodeURIComponent(icao)}`)),
  ]);
  return { weather, notams: notamsResponse?.notams ?? [], charts: chartsResponse?.charts ?? [], solar: solarResponse?.solar ?? [], airport: airportResponse?.airport, errors };
}
function classify(chart: Chart): Category {
  const text = `${chart.tipo ?? ''} ${chart.title ?? ''} ${chart.descricao ?? ''}`.toUpperCase();
  if (/\bREA\b|ROTA ESPECIAL|ESPECIAL DE AERONAVES/.test(text)) return 'REA';
  if (/\bADC\b|\bAPDC\b|\bGMC\b|\bPDC\b|AERODROME CHART|ESTACIONAMENTO|P[ÁA]TIO/.test(text)) return 'Aeródromo';
  if (/\bVAC\b|VISUAL|\bVFR\b|\bREH\b|\bCIRCUITO\b/.test(text)) return 'Visual';
  if (/\bIAC\b|\bSID\b|\bSTAR\b|\bIFR\b|\bENRC?\b|\bARC\b|\bILS\b|RNAV|\bVOR\b|\bNDB\b|APPROACH|APROXIMA/.test(text)) return 'IFR';
  return 'Outras';
}
function detailText(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}
function previewUrl(url: string, download = false) { return `${BACKEND}/api/charts/preview?url=${encodeURIComponent(url)}${download ? '&download=1' : ''}`; }

export default function InformacoesAerodromoMobile() {
  const [icao, setIcao] = useState('');
  const [searched, setSearched] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<Category>('Todas');
  const [chartSearch, setChartSearch] = useState('');
  const charts = useMemo(() => (report?.charts ?? []).filter((chart) => (category === 'Todas' || classify(chart) === category) && `${chart.tipo ?? ''} ${chart.title ?? ''} ${chart.descricao ?? ''}`.toLocaleUpperCase('pt-BR').includes(chartSearch.trim().toLocaleUpperCase('pt-BR'))), [report?.charts, category, chartSearch]);
  const runSearch = async (code: string) => {
    setLoading(true); setError(''); setSearched(code); setReport(null); setCategory('Todas'); setChartSearch('');
    try { setReport(await loadReport(code)); } catch (cause) { setReport(null); setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os dados do aeródromo.'); }
    finally { setLoading(false); }
  };
  const search = async (event: React.FormEvent) => {
    event.preventDefault(); const code = icao.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) { setError('Informe um código ICAO de quatro letras, por exemplo SBGR.'); setReport(null); return; }
    await runSearch(code);
  };
  const airport = report?.airport;
  const runways = Array.isArray(airport?.runways) ? airport.runways : [];
  const frequencies = Array.isArray(airport?.frequencies) ? airport.frequencies : [];
  const rawFicha = airport?.raw_data?.rotaer ?? airport?.raw_data ?? {};
  const ignored = new Set(['icao', 'icaoCode', 'AeroCode', 'name', 'nome', 'city', 'cidade', 'state', 'uf', 'elevation', 'altitude', 'coordinates', 'coordenadas', 'runways', 'pistas', 'frequencies', 'frequencias']);
  const details = [['Restrições', airport?.restrictions], ['Procedimentos operacionais', airport?.operational?.opea], ['Obstáculos', airport?.operational?.obstacles], ['Iluminação', airport?.operational?.other_lighting], ['Energia secundária', airport?.operational?.secondary_power], ['Regulamentos locais', airport?.operational?.local_regulations], ['Contato', airport?.contact], ...Object.entries(rawFicha).filter(([key, value]) => !ignored.has(key) && value != null && value !== '')].map(([label, value]) => [String(label), detailText(value)] as const).filter(([, value]) => value);
  const sunrise = report?.solar?.[0];
  return <section className="space-y-4 text-white">
    <header><h2 className="mt-1 text-2xl font-extrabold">Informações do aeródromo</h2><p className="mt-1 text-sm leading-5 text-slate-400">Consulte a ficha ROTAER, meteorologia, NOTAMs, cartas, pistas, frequências e horários solares.</p></header>
    <form onSubmit={(event) => void search(event)} className="space-y-3 rounded-2xl border border-white/10 bg-[#101e33] p-4"><label htmlFor="airport-icao" className="text-xs font-bold uppercase tracking-wide text-slate-300">Código ICAO</label><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Input id="airport-icao" value={icao} onChange={(event) => setIcao(event.target.value.toUpperCase())} maxLength={4} placeholder="Ex.: SBGR" className={inputClass} /><Button type="submit" disabled={loading} className="min-h-12 rounded-xl bg-sky-500 px-4 font-bold text-slate-950 hover:bg-sky-400">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Consultar</Button></div></form>
    {error && <p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-400/[.08] p-3 text-sm text-rose-100">{error}</p>}
    {loading && <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#101e33] p-8 text-sm text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /> Consultando AISWEB/DECEA…</div>}
    {report && <div className="space-y-3">
      <section className="rounded-2xl border border-white/10 bg-[#101e33] p-4"><p className="font-mono text-xs font-bold text-sky-300">{searched} · AISWEB/DECEA</p><h3 className="mt-1 text-lg font-bold">{airport?.name || searched}</h3><p className="text-xs text-slate-400">{[airport?.city, airport?.state].filter(Boolean).join(' / ') || 'Localização não informada'}</p></section>
      <div className="grid grid-cols-2 gap-2"><InfoCell label="Elevação" value={airport?.elevation == null ? '—' : `${airport.elevation} ft`} /><InfoCell label="Coordenadas" value={airport?.coordinates ? `${Number(airport.coordinates.lat).toFixed(4)}, ${Number(airport.coordinates.lng).toFixed(4)}` : '—'} /><InfoCell label="Nascer do sol" value={sunrise?.sunrise || '—'} /><InfoCell label="Pôr do sol" value={sunrise?.sunset || '—'} /></div>
      <div className="space-y-2"><DataBlock title="METAR · AISWEB/DECEA" value={report.weather?.metar || 'Sem METAR disponível.'} /><DataBlock title="TAF · AISWEB/DECEA" value={report.weather?.taf || 'Sem TAF disponível.'} /></div>
      <DataBlock title="Pistas e frequências"><div className="space-y-3">{runways.length === 0 && frequencies.length === 0 && <p className="text-xs text-slate-400">Sem dados de pista publicados na consulta.</p>}{runways.length > 0 && <div><p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Pistas</p><ul className="space-y-2">{runways.map((item, index) => <li key={`r${index}`} className="rounded-xl bg-black/15 p-3 font-mono text-xs">{[item?.ident ?? item?.designator ?? item?.designacao ?? item?.rwy, item?.length ?? item?.comprimento, item?.width ?? item?.largura, item?.surface ?? item?.piso].filter(Boolean).join(' · ') || detailText(item)}</li>)}</ul></div>}{frequencies.length > 0 && <div><p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Frequências</p><ul className="space-y-2">{frequencies.map((item, index) => <li key={`f${index}`} className="rounded-xl bg-black/15 p-3 font-mono text-xs text-slate-300">{[item?.type ?? item?.tipo ?? item?.servico, item?.frequency ?? item?.freq ?? item?.frequencia].filter(Boolean).join(' ') || detailText(item)}</li>)}</ul></div>}</div></DataBlock>
      {details.length > 0 && <details className="rounded-2xl border border-white/10 bg-[#101e33] p-4"><summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold">Dados adicionais publicados pelo AISWEB/ROTAER</summary><dl className="mt-2 grid gap-2">{details.map(([label, value], index) => <div key={`${label}-${index}`} className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-3"><dt className="text-[10px] font-semibold uppercase text-slate-400">{label}</dt><dd className="mt-1 break-words whitespace-pre-wrap font-mono text-xs text-slate-200">{value}</dd></div>)}</dl></details>}
      <DataBlock title={`NOTAM (${report.notams.length})`}>{report.notams.length ? <ul className="max-h-80 space-y-2 overflow-y-auto">{report.notams.map((item) => <li key={item.id} className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="font-mono text-[11px] text-sky-300">{[item.number, item.type].filter(Boolean).join(' · ')}</p><p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-200">{item.message || 'Sem descrição.'}</p>{(item.start || item.end) && <p className="mt-2 font-mono text-[10px] text-slate-400">{item.start || '—'} → {item.end || '—'}</p>}</li>)}</ul> : <p className="text-xs text-slate-400">Nenhum NOTAM em vigor retornado.</p>}</DataBlock>
      <DataBlock title={`Cartas (${charts.length} de ${report.charts.length})`}><div className="space-y-3"><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold ${category === item ? 'bg-sky-400 text-slate-950' : 'border border-white/10 text-slate-300'}`}>{item}</button>)}</div><Input value={chartSearch} onChange={(event) => setChartSearch(event.target.value)} placeholder="Pesquisar carta" className="h-11 rounded-xl border-white/10 bg-[#0a1729] text-white" />{charts.length ? <ul className="space-y-2">{charts.map((chart, index) => <li key={`${chart.url || chart.title}-${index}`} className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-sm font-semibold">{chart.title || 'Carta'}</p><p className="mt-1 text-xs text-slate-400">{[chart.tipo, chart.descricao].filter(Boolean).join(' · ')}</p>{chart.url && <div className="mt-3 flex gap-2"><a href={previewUrl(chart.url)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-sky-500 px-3 text-xs font-bold text-slate-950"><ExternalLink className="h-4 w-4" /> Ver</a><a href={previewUrl(chart.url, true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-200"><Download className="h-4 w-4" /> Baixar</a></div>}</li>)}</ul> : <p className="text-xs text-slate-400">{report.charts.length ? 'Nenhuma carta corresponde ao filtro escolhido.' : 'Nenhuma carta retornada para este aeródromo.'}</p>}</div></DataBlock>
      {report.errors.length > 0 && <p className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-[11px] leading-5 text-slate-400">Alguns dados não foram retornados: {report.errors.join(' · ')}</p>}
      <Button type="button" variant="outline" onClick={() => { setIcao(searched); void runSearch(searched); }} className="min-h-11 w-full rounded-xl border-white/10 bg-[#101e33] text-slate-200"><RefreshCw className="mr-2 h-4 w-4" /> Atualizar consulta</Button>
    </div>}
    {!report && !loading && !error && <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center"><MapPin className="mx-auto h-8 w-8 text-slate-500" /><p className="mt-3 text-sm text-slate-300">Informe um código ICAO para consultar a ficha completa.</p></div>}
  </section>;
}
function InfoCell({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-2xl border border-white/10 bg-[#101e33] p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words font-mono text-xs font-semibold text-slate-100">{value}</p></div>; }
function DataBlock({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-[#101e33] p-4"><h3 className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</h3>{typeof children === 'string' ? <p className="break-words whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-100">{children}</p> : children}</section>; }
