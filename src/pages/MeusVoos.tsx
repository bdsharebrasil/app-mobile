import { interpretarCafe } from '@/lib/cafe-manha';
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, ChevronRight, Clock3, FolderOpen,
  Hotel, Loader2, MapPin, MessageSquareText, Plane, RefreshCw, ReceiptText,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { FlightOperations } from "@/components/mobile/FlightOperations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAeronaves, type Aeronave } from "@/hooks/useAeronaves";
import { apiClient } from "@/lib/api-client";
import { formatBrasiliaTime, formatScheduledFlightTime, formatZuluTime } from "@/lib/flight-format";
import { flightListQueryKey, flightNeedsTimeCompletion } from "@/lib/flight-query-keys";

type Flight = {
  id: string;
  numero_voo: string | null;
  status: string;
  aeronave_id: string | null;
  matricula_registro: string | null;
  modelo: string | null;
  origem: string | null;
  destino: string | null;
  data_agendada: string;
  horario_previsto_agendamento: string | null;
  dias_duracao: number | null;
  numero_passageiros: number | null;
  piloto_id: string | null;
  copiloto_id: string | null;
};

type FlightDetailVoo = Flight & {
  data_fim: string | null;
  fabricante: string | null;
  cliente_razao_social: string | null;
  cliente_tipo: string | null;
  piloto_nome: string | null;
  copiloto_nome: string | null;
  voo_emprestado: string | null;
  mensagem: string | null;
  aprovado_em: string | null;
};

type FlightLeg = {
  id: string;
  numero: number;
  origem: string | null;
  destino: string | null;
  status: string | null;
  horario_ac: string | null;
  horario_dep: string | null;
  horario_pouso: string | null;
  horario_corte: string | null;
};

type FlightJourney = {
  id: string;
  data: string;
  funcao_tripulante: string | null;
  tripulante_nome: string | null;
  status: string | null;
  horario_apresentacao: string | null;
  horario_acionamento: string | null;
  horario_decolagem: string | null;
  horario_pouso: string | null;
  horario_corte: string | null;
  minutos_jornada: number | null;
  pernas: FlightLeg[];
};

type HotelReservation = {
  status?: string; hotel_telefone?:string; cafe_estado?:string; cafe_valor?:string; cafe_manha?:string;
  id: string;
  data_checkin: string;
  data_checkout: string;
  tipo_quarto: string | null;
  quantidade_hospedes: number | null;
  observacoes: string | null;
  hotel_nome: string | null;
  hotel_cidade: string | null;
  hotel_uf: string | null;
};

type FlightDetail = {
  voo: FlightDetailVoo;
  jornadas: FlightJourney[];
  hospedagens: HotelReservation[];
};

type FlightListResponse = { tripulante: { id: string; nome_completo: string; canac: string | null } | null; voos: Flight[] };
type VooComRelatorio = { solicitacao_id: string; relatorio_id: string | null; relatorio_status: string | null };
type VoosComRelatorios = { voos: VooComRelatorio[] };

const closedStatuses = new Set(["encerrada", "concluida"]);
const activeStatuses = new Set(["aprovada", "acionado", "decolado", "em_voo", "em voo", "em_rota", "em rota", "em_solo", "pousado"]);

function dateLabel(value?: string | null) {
  if (!value) return "Data não informada";
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function aircraftLabel(flight: Flight) {
  return [flight.matricula_registro, flight.modelo].filter(Boolean).join(" · ") || "Aeronave não informada";
}

function statusLabel(status: string) {
  const normalized = String(status || "").trim().toLowerCase();
  if (closedStatuses.has(normalized)) return "Concluído";
  if (["decolado", "em_voo", "em voo", "em_rota", "em rota"].includes(normalized)) return "Em voo";
  if (["acionado", "em_solo", "pousado"].includes(normalized)) return normalized === "acionado" ? "Acionado" : "Em solo";
  return "Aprovado";
}

function FlightCard({ flight, onClick }: { flight: Flight; onClick: () => void }) {
  const needsTimes = flightNeedsTimeCompletion(flight.status);
  return (
    <button type="button" onClick={onClick} className={`group w-full min-h-11 rounded-2xl border bg-[#101e33] p-4 text-left transition hover:border-emerald-300/30 active:scale-[0.99] ${needsTimes ? "border-amber-300/40" : "border-white/10"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-bold tracking-tight text-white">{flight.numero_voo || "Voo sem número"}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${closedStatuses.has(String(flight.status).toLowerCase()) ? "bg-sky-300/10 text-sky-200" : "bg-emerald-300/10 text-emerald-200"}`}>{statusLabel(flight.status)}</span>
      </div>
      <p className="mt-1 truncate text-sm text-slate-300">{aircraftLabel(flight)}</p>
      {needsTimes && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200"><Clock3 className="h-3 w-3" />Completar horários</span>}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3 text-xs text-slate-400">
        <span className="flex min-w-0 items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-300" /><span className="truncate">{dateLabel(flight.data_agendada)}</span></span>
        <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-300" /><span className="truncate">{flight.origem || "—"} → {flight.destino || "—"}</span></span>
      </div>
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.025] px-6 py-11 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-slate-400"><Plane className="h-6 w-6" /></div>
    <h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p>
  </div>;
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
  const text = value == null || value === "" ? "Não informado" : String(value);
  return <div className="flex items-start justify-between gap-4 border-t border-white/[0.07] py-3">
    <span className="text-xs text-slate-500">{label}</span><span className="max-w-[62%] break-words text-right text-sm text-slate-200">{text}</span>
  </div>;
}

export default function MeusVoos() {
  const { flightId, year, aircraftId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const listQuery = useQuery({ queryKey: flightListQueryKey, queryFn: () => apiClient.get<FlightListResponse>("/api/colaborador/meus-voos") });
  const detailQuery = useQuery({
    queryKey: [...flightListQueryKey, "detalhe", flightId],
    queryFn: () => apiClient.get<FlightDetail>(`/api/colaborador/meus-voos/${encodeURIComponent(flightId || "")}`),
    enabled: Boolean(flightId),
  });
  const { aeronaves } = useAeronaves();
  const relatoriosVoosQuery = useQuery({
    queryKey: ['relatorios-despesa-meus-voos'],
    queryFn: () => apiClient.get<VoosComRelatorios>('/api/financeiro/relatorios-despesa-viagem/meus-voos'),
    enabled: Boolean(flightId),
  });
  const flights = listQuery.data?.voos ?? [];
  const approvedFlights = flights.filter((item) => activeStatuses.has(String(item.status).trim().toLowerCase()));
  const completedFlights = flights.filter((item) => closedStatuses.has(String(item.status).toLowerCase()));
  const detail = detailQuery.data;
  const aeronaveDoVoo = aeronaves.find((item) => item.id === detail?.voo?.aeronave_id) as (Aeronave & { url_imagem?: string | null }) | undefined;
  const fotoAeronave = detail?.voo?.url_imagem || aeronaveDoVoo?.url_imagem || aeronaveDoVoo?.image_url || null;
  const vooComRelatorio = relatoriosVoosQuery.data?.voos.find((item) => item.solicitacao_id === flightId);
  const isFolder = Boolean(year && aircraftId);

  const goBack = () => navigate((location.state as { from?: string } | null)?.from || "/meus-voos");
  const openFlight = (id: string) => navigate(`/meus-voos/${encodeURIComponent(id)}`, { state: { from: `${location.pathname}${location.search}` } });

  if (flightId) {
    const flight = detail?.voo;
    return (
      <MobileLayout>
        <main className="meus-voos-page min-h-[calc(100dvh-5.5rem)] bg-[#071326] pb-28 text-white">
          <div className="mx-auto max-w-[430px] px-4 pt-2">
            <button onClick={goBack} className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-slate-300 transition active:bg-white/[0.06]"><ArrowLeft className="h-4 w-4" /> Voltar</button>
            {detailQuery.isLoading ? <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-emerald-300" /> Carregando dados do voo…</div> : detailQuery.isError || !flight ? (
              <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/[0.07] p-5 text-center"><p className="text-sm text-rose-100">Não foi possível abrir este voo.</p><button onClick={() => void detailQuery.refetch()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Tentar novamente</button></div>
            ) : (
              <>
                <div className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Detalhes do voo</div>

                <section className="relative mt-3 overflow-hidden rounded-[26px] border border-emerald-900/60 bg-[#101e33] shadow-xl shadow-black/30">
                  <div className="relative h-[112px] bg-gradient-to-br from-[#103b3b] via-[#122b3c] to-[#101d34]">
                    {fotoAeronave && <>
                      <img src={fotoAeronave} alt={`Foto da aeronave ${flight.matricula_registro || ""}`} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/75" />
                    </>}
                    <div className="absolute left-1/2 top-0 h-10 w-20 -translate-x-1/2 rounded-b-[40px] bg-[#071326]" />
                    <div className="absolute inset-x-5 top-4 flex items-start justify-between text-xs">
                      <span className="font-semibold text-white">Voo {flight.numero_voo || "—"}</span>
                      <span className="text-white/60">{flight.matricula_registro || "—"}</span>
                    </div>
                    <span className="absolute bottom-3 right-4 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">{statusLabel(flight.status)}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-5 pt-4">
                    <div className="min-w-0">
                      <p className="mt-0.5 truncate text-[28px] font-bold leading-none tracking-tight text-white">{flight.origem || "—"}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 pb-0.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-white/30 text-emerald-300"><Plane className="h-4 w-4" /></span>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="mt-0.5 truncate text-[28px] font-bold leading-none tracking-tight text-white">{flight.destino || "—"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/[0.08] px-5 py-3 text-xs font-semibold tabular-nums text-slate-400"><span>{formatZuluTime(flight.horario_previsto_agendamento)}</span><span>{formatBrasiliaTime(flight.horario_previsto_agendamento)}</span></div>
                </section>

                <section className="mt-4 rounded-2xl border border-white/10 bg-[#101e33] px-4 pb-1">
                  <h2 className="flex items-center gap-2 py-3 text-sm font-semibold text-white"><CalendarDays className="h-4 w-4 text-emerald-300" /> Agendamento</h2>
                  <DetailRow label="Data de início" value={dateLabel(flight.data_agendada)} />
                  <DetailRow label="Data de término" value={dateLabel(flight.data_fim)} />
                  <DetailRow label="Horário previsto" value={formatScheduledFlightTime(flight.horario_previsto_agendamento)} />
                  <DetailRow label="Passageiros" value={flight.numero_passageiros} />
                  <DetailRow label="Cliente" value={flight.cliente_razao_social} />
                  <DetailRow label="Piloto" value={flight.piloto_nome} />
                  <DetailRow label="Copiloto" value={flight.copiloto_nome} />
                  <DetailRow label="Voo emprestado" value={flight.voo_emprestado} />
                </section>

                <div className="mt-4">
                  <FlightOperations flight={flight} />
                </div>

                {vooComRelatorio && <button type="button" onClick={() => navigate('/financeiro/despesas-viagem', { state: { solicitacao_id: vooComRelatorio.solicitacao_id } })} className="mt-4 flex min-h-14 w-full items-center justify-between gap-3 rounded-full bg-[#3D9C7D] py-2 pl-6 pr-2 text-left text-[#08110F] active:scale-[0.99]">
                  <span className="min-w-0"><span className="block text-[15px] font-bold">{vooComRelatorio.relatorio_id ? 'Continuar relatório de despesas' : 'Criar relatório de despesas'}</span><span className="block text-xs font-medium opacity-70">Registre os gastos deste voo</span></span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#08110F] text-white"><ReceiptText className="h-4 w-4" /></span>
                </button>}

                <section className="mt-4 rounded-2xl border border-white/10 bg-[#101e33] p-4">
                  <div className="mb-2 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200"><Hotel className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">Hospedagem</h2><p className="text-xs text-slate-500">Reservas que coincidem com o período do voo.</p></div></div>
                  {detail.hospedagens.length ? <div className="mt-3 space-y-2">{detail.hospedagens.map((hotel) => <div key={hotel.id} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="font-semibold text-slate-100">{hotel.hotel_nome || "Hotel"}</p><p className="mt-1 text-xs text-slate-400">{dateLabel(hotel.data_checkin)} – {dateLabel(hotel.data_checkout)}{hotel.hotel_cidade ? ` · ${hotel.hotel_cidade}${hotel.hotel_uf ? `/${hotel.hotel_uf}` : ""}` : ""}</p><p className="mt-1 text-xs text-slate-500">{hotel.tipo_quarto || "Quarto não especificado"} · {hotel.quantidade_hospedes || 1} hóspedes</p><p className="mt-2 text-xs text-slate-300">Café da manhã: {hotel.cafe_estado ? ({INCLUIDO:'Incluído na diária',A_PARTE:'Pago à parte',NAO_OFERECE:'Não oferece',A_CONFIRMAR:'A confirmar'} as Record<string,string>)[hotel.cafe_estado] : interpretarCafe(hotel.cafe_manha).rotulo}{hotel.cafe_valor ? ' · R$ '+hotel.cafe_valor : ''}</p>{hotel.status==='SOLICITADA'&&<p className="mt-1 text-xs text-sky-200">Solicitação enviada pelo sistema · consulte a confirmação no briefing</p>}{hotel.hotel_telefone&&<a className="mt-2 inline-flex min-h-11 items-center text-xs text-sky-200 underline" href={'tel:'+hotel.hotel_telefone.replace(/[^+\d]/g,'')}>Ligar para o hotel · {hotel.hotel_telefone}</a>}{hotel.observacoes && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{hotel.observacoes}</p>}</div>)}</div> : <p className="mt-3 text-sm text-slate-400">Nenhuma reserva de hospedagem encontrada no período.</p>}
                </section>

                <section className="mt-4 rounded-2xl border border-white/10 bg-[#101e33] p-4">
                  <div className="mb-3 flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-semibold text-white">Observações</h2></div>
                  {flight.mensagem ? <p className="whitespace-pre-wrap break-words rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-sm leading-6 text-slate-300">{flight.mensagem}</p> : <p className="text-sm text-slate-400">Não há observações para este voo.</p>}
                </section>
              </>
            )}
          </div>
        </main>
      </MobileLayout>
    );
  }

  if (listQuery.isLoading) return <MobileLayout><main className="meus-voos-page min-h-[calc(100dvh-5.5rem)] bg-[#071326] px-4 pb-28 pt-5 text-white"><div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-emerald-300" /> Carregando seus voos…</div></main></MobileLayout>;
  if (listQuery.isError) return <MobileLayout><main className="meus-voos-page min-h-[calc(100dvh-5.5rem)] bg-[#071326] px-4 pb-28 pt-5 text-white"><div className="mx-auto max-w-[430px] rounded-2xl border border-rose-300/20 bg-rose-400/[0.07] p-5 text-center"><p className="text-sm text-rose-100">Não foi possível carregar seus voos.</p><button onClick={() => void listQuery.refetch()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Tentar novamente</button></div></main></MobileLayout>;

  if (isFolder) {
    const folderFlights = completedFlights.filter((item) => {
      const itemYear = (item.data_agendada || "").slice(0, 4);
      const itemAircraft = item.aeronave_id || "sem-aeronave";
      return itemYear === year && itemAircraft === aircraftId;
    });
    const aircraft = folderFlights[0];
    return <MobileLayout><main className="meus-voos-page min-h-[calc(100dvh-5.5rem)] bg-[#071326] px-4 pb-28 pt-2 text-white"><div className="mx-auto max-w-[430px]">
      <button onClick={() => navigate("/meus-voos?tab=concluidos")} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-slate-300 transition active:bg-white/[0.06]"><ArrowLeft className="h-4 w-4" /> Voltar para concluídos</button>
      <header className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Pasta de voos</p><h1 className="mt-1 text-2xl font-bold">{year} · {aircraft ? aircraftLabel(aircraft) : "Aeronave"}</h1><p className="mt-1 text-sm text-slate-400">{folderFlights.length} {folderFlights.length === 1 ? "voo concluído" : "voos concluídos"}</p></header>
      {folderFlights.length ? <div className="space-y-3">{folderFlights.map((flight) => <FlightCard key={flight.id} flight={flight} onClick={() => openFlight(flight.id)} />)}</div> : <EmptyState title="Pasta sem voos" description="Não encontramos voos concluídos nesta combinação de ano e aeronave." />}
    </div></main></MobileLayout>;
  }

  const folders = completedFlights.reduce<Record<string, Record<string, Flight[]>>>((acc, flight) => {
    const folderYear = (flight.data_agendada || "").slice(0, 4) || "Sem ano";
    const folderAircraft = flight.aeronave_id || "sem-aeronave";
    acc[folderYear] ||= {};
    acc[folderYear][folderAircraft] ||= [];
    acc[folderYear][folderAircraft].push(flight);
    return acc;
  }, {});
  const activeTab = new URLSearchParams(location.search).get("tab") === "concluidos" ? "concluidos" : "aprovados";
  const crewName = listQuery.data?.tripulante?.nome_completo;

  return (
    <MobileLayout>
      <main className="meus-voos-page min-h-[calc(100dvh-5.5rem)] bg-[#071326] px-4 pb-28 pt-5 text-white">
        <div className="mx-auto max-w-[430px]">
          <header className="mb-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Área do tripulante</p>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight">Minha Agenda de Voos</h1>
            <p className="mt-1 text-sm text-slate-400">{crewName ? `Olá, ${crewName.split(" ")[0]}. Acompanhe sua programação.` : "Acompanhe sua programação e histórico."}</p>
          </header>

          {!listQuery.data?.tripulante ? <EmptyState title="Perfil de tripulante não vinculado" description="Não encontramos um cadastro de tripulante associado ao seu usuário." /> : (
            <Tabs value={activeTab} onValueChange={(tab) => navigate(tab === "concluidos" ? "/meus-voos?tab=concluidos" : "/meus-voos?tab=aprovados")}>
              <TabsList className="mb-5 grid h-auto w-full grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                <TabsTrigger value="aprovados" className="min-h-11 rounded-xl py-3 text-sm font-semibold text-slate-400 data-[state=active]:bg-[#3D9C7D] data-[state=active]:text-[#08110F]">Agenda <span className="ml-1.5 rounded-full bg-black/10 px-2 py-0.5 text-[10px]">{approvedFlights.length}</span></TabsTrigger>
                <TabsTrigger value="concluidos" className="min-h-11 rounded-xl py-3 text-sm font-semibold text-slate-400 data-[state=active]:bg-[#3D9C7D] data-[state=active]:text-[#08110F]">Concluídos <span className="ml-1.5 rounded-full bg-black/10 px-2 py-0.5 text-[10px]">{completedFlights.length}</span></TabsTrigger>
              </TabsList>

              <TabsContent value="aprovados" className="mt-0 space-y-3">
                {approvedFlights.length ? approvedFlights.map((flight) => <FlightCard key={flight.id} flight={flight} onClick={() => openFlight(flight.id)} />) : <EmptyState title="Nenhum voo aprovado" description="Quando uma solicitação de reserva for aprovada em seu nome, ela aparecerá aqui." />}
              </TabsContent>

              <TabsContent value="concluidos" className="mt-0 space-y-5">
                {completedFlights.length ? Object.entries(folders).sort(([a], [b]) => b.localeCompare(a)).map(([folderYear, aircraftFolders]) => <section key={folderYear}>
                  <div className="mb-2 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-bold text-slate-100">{folderYear}</h2><span className="text-xs text-slate-500">{Object.values(aircraftFolders).reduce((sum, items) => sum + items.length, 0)} voos</span></div>
                  <div className="space-y-2">{Object.entries(aircraftFolders).sort(([, a], [, b]) => aircraftLabel(a[0]).localeCompare(aircraftLabel(b[0]))).map(([folderAircraft, items]) => <button key={`${folderYear}-${folderAircraft}`} type="button" onClick={() => navigate(`/meus-voos/concluidos/${encodeURIComponent(folderYear)}/${encodeURIComponent(folderAircraft)}`, { state: { from: `${location.pathname}${location.search}` } })} className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#101e33] p-4 text-left transition hover:border-emerald-300/30 active:scale-[0.99]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><FolderOpen className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{aircraftLabel(items[0])}</span><span className="mt-1 block text-xs text-slate-500">{items.length} {items.length === 1 ? "voo concluído" : "voos concluídos"}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-emerald-200" /></button>)}</div>
                </section>) : <EmptyState title="Nenhum voo concluído" description="Os voos finalizados aparecerão organizados por ano e aeronave." />}
              </TabsContent>
            </Tabs>
          )}
          {listQuery.isFetching && <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Atualizando</p>}
        </div>
      </main>
    </MobileLayout>
  );
}
