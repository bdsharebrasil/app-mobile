import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, CircleDollarSign, Clock3, Eye, FileText, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND } from '@/config/api';

interface TravelExpense {
  categoria?: string;
  descricao?: string;
  valor?: number | string;
  pago_por?: string;
  comprovante_url?: string;
}
interface TravelReport {
  id: string;
  numero_relatorio: string;
  cliente_nome?: string;
  aeronave_matricula?: string;
  nome_tripulante?: string;
  nome_tripulante_2?: string;
  tripulante_pos: 1 | 2;
  rota?: string;
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  despesas: TravelExpense[];
  total_valor?: number;
  status: string;
  status_aprovacao_tripulante?: string | null;
  status_aprovacao_tripulante_2?: string | null;
  motivo_reprovacao_tripulante_1?: string | null;
  motivo_reprovacao_tripulante_2?: string | null;
  pagamento_status: 'PAGO' | 'PENDENTE' | 'NAO_PROGRAMADO';
  pagamento_valor?: number;
  pagamento_total?: number;
  data_pagamento?: string | null;
  pdf_url?: string | null;
}

const endpoint = '/api/financeiro/relatorios-despesa-viagem/minhas';
const currency = (value: number | string | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const date = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const norm = (value?: string | null) => String(value || '').toLowerCase();
const isApproved = (report: TravelReport) => ['aprovado', 'enviado_cliente'].includes(norm(report.status));

function isPending(report: TravelReport) {
  const approval = norm(report.tripulante_pos === 1 ? report.status_aprovacao_tripulante : report.status_aprovacao_tripulante_2);
  return report.status === 'aguardando_aprovacao' && !['aprovado', 'reprovado'].includes(approval);
}
function reportLabel(report: TravelReport) {
  if (report.pagamento_status === 'PAGO') return 'Pago';
  if (isPending(report)) return 'Pendente de aprovação';
  if (isApproved(report) || report.pagamento_status === 'PENDENTE') return 'Aprovado';
  if (report.status === 'ajuste_necessario') return 'Rejeitado / ajuste necessário';
  return report.status.replace(/_/g, ' ');
}

export default function RelatorioViagem() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [reports, setReports] = useState<TravelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Pago'>('Todos');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});

  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente.');
    const response = await fetch(`${BACKEND}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.');
    return data;
  }, [session?.access_token]);

  const loadReports = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await request(endpoint);
      setReports(Array.isArray(data.relatorios) ? data.relatorios : []);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar seus relatórios.');
    } finally {
      setLoading(false);
    }
  }, [request, session?.access_token]);
  useEffect(() => { void loadReports(); }, [loadReports]);

  const filteredReports = useMemo(() => reports.filter((report) => {
    if (filter === 'Pendente') return isPending(report);
    if (filter === 'Pago') return report.pagamento_status === 'PAGO';
    if (filter === 'Aprovado') return !isPending(report) && isApproved(report) && report.pagamento_status !== 'PAGO';
    return true;
  }), [filter, reports]);
  const counts = useMemo(() => ({
    pending: reports.filter(isPending).length,
    approved: reports.filter((r) => isApproved(r) && r.pagamento_status !== 'PAGO').length,
    paid: reports.filter((r) => r.pagamento_status === 'PAGO').length,
  }), [reports]);

  const decide = async (report: TravelReport, aprovado: boolean) => {
    const reason = rejectionReason[report.id]?.trim() || '';
    if (!aprovado && !reason) { toast.error('Informe o motivo da rejeição.'); return; }
    setBusyId(report.id);
    try {
      await request(`/api/financeiro/relatorios-despesa-viagem/${encodeURIComponent(report.id)}/aprovacao`, {
        method: 'POST',
        body: JSON.stringify({ tripulante_pos: report.tripulante_pos, aprovado, observacoes: reason }),
      });
      toast.success(aprovado ? 'Relatório aprovado.' : 'Relatório rejeitado e enviado para ajuste.');
      setRejectionReason((current) => ({ ...current, [report.id]: '' }));
      await loadReports();
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível registrar sua decisão.');
    } finally { setBusyId(null); }
  };

  return <MobileLayout>
    <main className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar ao início"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="min-w-0 flex-1"><h1 className="text-xl font-bold sm:text-2xl">Despesas de viagem</h1><p className="text-sm text-muted-foreground">Acompanhe aprovações e pagamentos dos seus relatórios.</p></div>
        <Button variant="outline" size="icon" onClick={() => void loadReports()} disabled={loading} aria-label="Atualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
      </header>
      <section className="grid grid-cols-3 gap-2" aria-label="Resumo dos relatórios">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pendentes</p><p className="mt-1 text-xl font-bold">{counts.pending}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Aprovados</p><p className="mt-1 text-xl font-bold">{counts.approved}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pagos</p><p className="mt-1 text-xl font-bold">{counts.paid}</p></CardContent></Card>
      </section>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar relatórios">
        {(['Todos', 'Pendente', 'Aprovado', 'Pago'] as const).map((item) => <Button key={item} size="sm" variant={filter === item ? 'default' : 'outline'} onClick={() => setFilter(item)}>{item}</Button>)}
      </nav>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando" /></div> : filteredReports.length === 0 ?
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />Nenhum relatório encontrado neste filtro.</CardContent></Card> :
        <div className="space-y-3">{filteredReports.map((report) => {
          const canDecide = isPending(report);
          const expanded = expandedId === report.id;
          const paid = report.pagamento_status === 'PAGO';
          const reason = report.tripulante_pos === 1 ? report.motivo_reprovacao_tripulante_1 : report.motivo_reprovacao_tripulante_2;
          return <Card key={report.id}><CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-muted p-2">{paid ? <CircleDollarSign className="h-4 w-4 text-green-600" /> : canDecide ? <Clock3 className="h-4 w-4 text-amber-600" /> : <FileText className="h-4 w-4 text-primary" />}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{report.numero_relatorio || 'Relatório de viagem'}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paid ? 'bg-green-100 text-green-800' : canDecide ? 'bg-amber-100 text-amber-800' : report.status === 'ajuste_necessario' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{reportLabel(report)}</span></div>
                <p className="mt-1 text-sm text-muted-foreground">{report.cliente_nome || 'Cliente'} · {report.aeronave_matricula || 'Aeronave'}</p><p className="text-xs text-muted-foreground">{report.rota || 'Trecho não informado'} · {date(report.data_inicio)} a {date(report.data_fim)}</p></div>
              <Button variant="ghost" size="icon" onClick={() => setExpandedId(expanded ? null : report.id)} aria-label={expanded ? 'Recolher detalhes' : 'Ver detalhes'}>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><p className="font-semibold">Total: {currency(report.total_valor)}</p>{report.pagamento_status !== 'NAO_PROGRAMADO' && <p className="text-sm">{paid ? `Pagamento quitado: ${currency(report.pagamento_valor)}` : `Quitado: ${currency(report.pagamento_valor)} · pendente: ${currency(Math.max(0, Number(report.pagamento_total || 0) - Number(report.pagamento_valor || 0)))}`}</p>}</div>
            {expanded && <div className="mt-4 space-y-3 border-t pt-4">
              {report.observacoes && <p className="whitespace-pre-wrap text-sm"><strong>Observações:</strong> {report.observacoes}</p>}
              <div className="space-y-2"><h3 className="text-sm font-semibold">Despesas</h3>{report.despesas?.length ? report.despesas.map((expense, index) => <div key={`${report.id}-${index}`} className="flex items-start justify-between gap-3 rounded-md bg-muted/50 p-3 text-sm"><div><p className="font-medium">{expense.categoria || 'Despesa'}{expense.pago_por ? ` · ${expense.pago_por}` : ''}</p><p className="text-muted-foreground">{expense.descricao || '—'}</p>{expense.comprovante_url && <a className="mt-1 inline-flex items-center gap-1 text-primary underline" href={expense.comprovante_url} target="_blank" rel="noreferrer"><Eye className="h-3 w-3" />Comprovante</a>}</div><span className="whitespace-nowrap font-medium">{currency(expense.valor)}</span></div>) : <p className="text-sm text-muted-foreground">Nenhum item detalhado.</p>}</div>
              {canDecide && <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-3"><p className="text-sm font-medium">Este relatório aguarda sua decisão.</p><Textarea value={rejectionReason[report.id] || ''} onChange={(event) => setRejectionReason((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="Motivo obrigatório caso rejeite" rows={2} aria-label="Motivo da rejeição" /><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void decide(report, true)} disabled={busyId === report.id}><Check className="mr-1 h-4 w-4" />Aprovar</Button><Button size="sm" variant="destructive" onClick={() => void decide(report, false)} disabled={busyId === report.id || !(rejectionReason[report.id] || '').trim()}><X className="mr-1 h-4 w-4" />Rejeitar</Button>{busyId === report.id && <Loader2 className="h-4 w-4 animate-spin self-center" />}</div></div>}
              {report.status === 'ajuste_necessario' && reason && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800"><strong>Motivo do ajuste:</strong> {reason}</p>}
              {report.pdf_url && <a className="inline-flex items-center gap-2 text-sm text-primary underline" href={report.pdf_url} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" />Abrir relatório PDF</a>}
            </div>}
          </CardContent></Card>;
        })}</div>}
    </main>
  </MobileLayout>;
}
