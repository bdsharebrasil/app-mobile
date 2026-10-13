import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Eye,
  FileImage,
  FileText,
  Info,
  Loader2,
  Plane,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND } from '@/config/api';

interface TravelExpense {
  id?: string;
  categoria?: string;
  category?: string;
  descricao?: string;
  description?: string;
  data?: string;
  valor?: number | string;
  amount?: number | string;
  pago_por?: string;
  paid_by?: string;
  observacoes?: string;
  comprovante_url?: string;
}

interface ExpenseAttachment {
  id: string;
  relatorio_despesa_viagem_id: string;
  indice_despesa?: number | string;
  nome_arquivo?: string | null;
  url_arquivo: string;
  tipo_arquivo?: string | null;
  tamanho_arquivo?: number | string | null;
  criado_em?: string | null;
}

interface TravelReport {
  id: string;
  numero_relatorio: string;
  numero_voo?: string | null;
  cliente_nome?: string | null;
  aeronave_matricula?: string | null;
  nome_tripulante?: string | null;
  nome_tripulante_2?: string | null;
  tripulante_pos: 1 | 2;
  rota?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  observacoes?: string | null;
  despesas: TravelExpense[] | string | null;
  anexos?: ExpenseAttachment[] | null;
  total_valor?: number | string;
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

type ExpenseGroup = 'total' | 'tripulante' | 'cliente' | 'sharebrasil' | 'outros';
type Decision = 'aprovar' | 'rejeitar' | null;

const endpoint = '/api/financeiro/relatorios-despesa-viagem/minhas';
const currency = (value: number | string | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const date = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const normalize = (value?: string | null) => String(value || '').toLowerCase();
const amountOf = (expense: TravelExpense) => Number(expense.valor ?? expense.amount ?? 0) || 0;
const expenseDescription = (expense: TravelExpense) => expense.descricao || expense.description || 'Despesa sem descrição';
const expenseCategory = (expense: TravelExpense) => expense.categoria || expense.category || 'Outros';

function parseExpenses(value: TravelReport['despesas']): TravelExpense[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as TravelExpense[] : [];
  } catch {
    return [];
  }
}

function normalizedPayer(expense: TravelExpense) {
  return String(expense.pago_por || expense.paid_by || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function groupForExpense(expense: TravelExpense, position: 1 | 2): Exclude<ExpenseGroup, 'total'> {
  const payer = normalizedPayer(expense);
  if (payer === 'cliente' || payer === 'client') return 'cliente';
  if (['share', 'sharebrasil', 'share_brasil'].includes(payer)) return 'sharebrasil';
  const crew = position === 1 ? 'tripulante_1' : 'tripulante_2';
  if (payer === crew || payer === crew.replace('_', '') || (position === 1 && payer === 'tripulante')) return 'tripulante';
  return 'outros';
}

function payerLabel(expense: TravelExpense) {
  const payer = normalizedPayer(expense);
  if (payer === 'cliente' || payer === 'client') return 'Cliente';
  if (['share', 'sharebrasil', 'share_brasil'].includes(payer)) return 'Share Brasil';
  if (payer === 'tripulante' || payer === 'tripulante_1' || payer === 'tripulante1') return 'Tripulante 1';
  if (payer === 'tripulante_2' || payer === 'tripulante2') return 'Tripulante 2';
  return 'Não informado';
}

function isPending(report: TravelReport) {
  const approval = normalize(report.tripulante_pos === 1 ? report.status_aprovacao_tripulante : report.status_aprovacao_tripulante_2);
  return normalize(report.status) === 'aguardando_aprovacao' && !['aprovado', 'reprovado', 'rejeitado'].includes(approval);
}

function reportLabel(report: TravelReport) {
  const approval = normalize(report.tripulante_pos === 1 ? report.status_aprovacao_tripulante : report.status_aprovacao_tripulante_2);
  if (report.pagamento_status === 'PAGO') return 'Pago';
  if (isPending(report)) return 'Pendente de aprovação';
  if (approval === 'aprovado' || ['aprovado', 'enviado_cliente'].includes(normalize(report.status))) return 'Aprovado';
  if (approval === 'reprovado' || approval === 'rejeitado' || report.status === 'ajuste_necessario') return 'Rejeitado / ajuste necessário';
  return String(report.status || '').replace(/_/g, ' ');
}

function groupLabel(group: ExpenseGroup) {
  return {
    total: 'Total da viagem',
    tripulante: 'Tripulante',
    cliente: 'Cliente',
    sharebrasil: 'Share Brasil',
    outros: 'Outras despesas',
  }[group];
}

function groupDescription(group: ExpenseGroup) {
  return {
    total: 'Todas as despesas da viagem',
    tripulante: 'Despesas atribuídas a você',
    cliente: 'Despesas pagas pelo cliente',
    sharebrasil: 'Despesas pagas pela Share Brasil',
    outros: 'Despesas atribuídas a outros pagadores',
  }[group];
}

function reportStatus(report: TravelReport) {
  const approval = normalize(report.tripulante_pos === 1 ? report.status_aprovacao_tripulante : report.status_aprovacao_tripulante_2);
  if (approval === 'aprovado') return 'Aprovado';
  if (approval === 'reprovado' || approval === 'rejeitado') return 'Reprovado';
  if (isPending(report)) return 'Pendente';
  if (report.status === 'ajuste_necessario') return 'Ajuste necessário';
  return String(report.status || 'Pendente').replace(/_/g, ' ');
}

function ReportReviewScreen({
  report,
  accessToken,
  onClose,
  onDecide,
  busy,
}: {
  report: TravelReport;
  accessToken?: string;
  onClose: () => void;
  onDecide: (report: TravelReport, approved: boolean, reason: string) => Promise<boolean>;
  busy: boolean;
}) {
  const expenses = useMemo(() => parseExpenses(report.despesas), [report.despesas]);
  const attachments = useMemo(() => Array.isArray(report.anexos) ? report.anexos : [], [report.anexos]);
  const [group, setGroup] = useState<ExpenseGroup>('tripulante');
  const [reviewedGroups, setReviewedGroups] = useState<Exclude<ExpenseGroup, 'total'>[]>([]);
  const [decision, setDecision] = useState<Decision>(null);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<{ attachment: ExpenseAttachment; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const scrollRef = useRef<HTMLElement | null>(null);
  const canDecide = isPending(report);
  const status = reportStatus(report);
  const approved = status === 'Aprovado';
  const rejected = status === 'Reprovado' || status === 'Ajuste necessário';

  const groupedExpenses = useMemo(() => {
    const grouped: Record<Exclude<ExpenseGroup, 'total'>, TravelExpense[]> = {
      tripulante: [], cliente: [], sharebrasil: [], outros: [],
    };
    expenses.forEach((expense) => grouped[groupForExpense(expense, report.tripulante_pos)].push(expense));
    return grouped;
  }, [expenses, report.tripulante_pos]);

  const attachmentsByExpense = useMemo(() => {
    const grouped = new Map<number, ExpenseAttachment[]>();
    attachments.forEach((attachment) => {
      const index = Number(attachment.indice_despesa);
      if (!Number.isFinite(index)) return;
      const list = grouped.get(index) || [];
      list.push(attachment);
      grouped.set(index, list);
    });
    return grouped;
  }, [attachments]);

  const totals = useMemo(() => {
    const sum = (items: TravelExpense[]) => items.reduce((total, expense) => total + amountOf(expense), 0);
    return {
      total: sum(expenses),
      tripulante: sum(groupedExpenses.tripulante),
      cliente: sum(groupedExpenses.cliente),
      sharebrasil: sum(groupedExpenses.sharebrasil),
      outros: sum(groupedExpenses.outros),
    };
  }, [expenses, groupedExpenses]);

  const availableGroups = useMemo(
    () => (['tripulante', 'cliente', 'sharebrasil', 'outros'] as const).filter((item) => groupedExpenses[item].length > 0),
    [groupedExpenses],
  );
  const selectedExpenseRows = useMemo(
    () => expenses
      .map((expense, index) => ({ expense, index }))
      .filter(({ expense }) => group === 'total' || groupForExpense(expense, report.tripulante_pos) === group),
    [expenses, group, report.tripulante_pos],
  );
  const selectedExpenses = useMemo(() => selectedExpenseRows.map(({ expense }) => expense), [selectedExpenseRows]);
  const allGroupsReviewed = availableGroups.every((item) => reviewedGroups.includes(item));
  const selectedTotal = totals[group];

  useEffect(() => {
    if (group !== 'total' && !availableGroups.includes(group)) {
      setGroup(availableGroups[0] || 'total');
    }
  }, [availableGroups, group]);

  const markGroupReviewed = useCallback(() => {
    if (group === 'total') return;
    setReviewedGroups((current) => current.includes(group) ? current : [...current, group]);
  }, [group]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const frame = requestAnimationFrame(() => {
      if (element.scrollHeight <= element.clientHeight + 48) markGroupReviewed();
    });
    return () => cancelAnimationFrame(frame);
  }, [group, markGroupReviewed, selectedExpenses.length]);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview?.url]);

  const selectGroup = (selected: ExpenseGroup) => {
    setGroup(selected);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const openAttachment = async (attachment: ExpenseAttachment) => {
    if (!accessToken) {
      toast.error('Sessão expirada. Entre novamente.');
      return;
    }
    setPreviewError('');
    setPreviewLoading(true);
    try {
      const response = await fetch(`${BACKEND}${attachment.url_arquivo}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível abrir o comprovante.');
      }
      const url = URL.createObjectURL(await response.blob());
      setPreview({ attachment, url });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Não foi possível abrir o comprovante.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDecision = async () => {
    const approvedDecision = decision === 'aprovar';
    if (!approvedDecision && !reason.trim()) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }
    const saved = await onDecide(report, approvedDecision, reason.trim());
    if (saved) {
      setDecision(null);
      setReason('');
    }
  };

  const approvalReason = report.tripulante_pos === 1
    ? report.motivo_reprovacao_tripulante_1
    : report.motivo_reprovacao_tripulante_2;

  const statusClasses = canDecide
    ? 'border-amber-300/20 bg-amber-300/10 text-amber-200'
    : approved
      ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
      : rejected
        ? 'border-rose-300/20 bg-rose-300/10 text-rose-200'
        : 'border-white/10 bg-white/[0.05] text-slate-300';

  const renderExpense = (expense: TravelExpense, index: number) => {
    const linkedAttachments = attachmentsByExpense.get(index) || [];
    return <article key={`${expense.id || 'despesa'}-${index}`} className="border-b border-white/10 px-4 py-4 last:border-b-0 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-sky-200">{expenseCategory(expense)}</span>
            {expense.data && <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-400">{date(expense.data)}</span>}
          </div>
          <p className="mt-3 break-words text-sm font-extrabold text-white">{expenseDescription(expense)}</p>
          <p className="mt-1 text-xs text-slate-400">Pago por {payerLabel(expense)}</p>
          {expense.observacoes && <p className="mt-2 break-words text-xs leading-relaxed text-slate-500">{expense.observacoes}</p>}
        </div>
        <strong className="shrink-0 text-sm font-black text-white sm:text-base">{currency(amountOf(expense))}</strong>
      </div>
      {linkedAttachments.length > 0 && <div className="mt-3 space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Comprovantes</p>
        <div className="flex flex-wrap gap-2">
          {linkedAttachments.map((attachment) => <button key={attachment.id} type="button" onClick={() => void openAttachment(attachment)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:border-sky-300/30 hover:bg-white/[0.07]">
            {String(attachment.tipo_arquivo || '').startsWith('image/') ? <FileImage size={15} className="shrink-0 text-sky-300" /> : <FileText size={15} className="shrink-0 text-slate-300" />}
            <span className="min-w-0 max-w-[190px] truncate">{attachment.nome_arquivo || 'Comprovante'}</span>
            <Eye size={14} className="shrink-0 text-slate-500" />
          </button>)}
        </div>
      </div>}
      {linkedAttachments.length === 0 && expense.comprovante_url && <a className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-200 underline" href={expense.comprovante_url} target="_blank" rel="noreferrer"><Eye size={14} />Abrir comprovante</a>}
    </article>;
  };

  return <>
    <div className="fixed inset-0 z-[80] bg-[#060b14] text-white">
      <main
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          if (element.scrollTop + element.clientHeight >= element.scrollHeight - 48) markGroupReviewed();
        }}
        className="absolute inset-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto w-full max-w-4xl px-3 pb-48 pt-3 sm:px-6 sm:pb-52 sm:pt-6">
          <header className="mb-4 flex items-center gap-3 sm:mb-6">
            <button type="button" onClick={onClose} aria-label="Voltar aos relatórios" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200"><ArrowLeft size={19} /></button>
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-sky-200"><Plane size={22} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300">Share Brasil</p>
              <h1 className="truncate text-base font-extrabold tracking-tight text-white sm:text-xl">Revisão de despesas</h1>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${statusClasses}`}>{status}</span>
          </header>

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
            <div className="border-b border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/15 bg-sky-300/[0.08] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-sky-200"><ShieldCheck size={13} />Revisão do relatório</span>
                  <h2 className="mt-3 break-words text-xl font-extrabold tracking-tight text-white sm:text-2xl">Relatório {report.numero_relatorio || '—'}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">Revise os grupos de despesas e abra os comprovantes antes de aprovar ou solicitar ajustes.</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 sm:min-w-[160px] sm:text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200/70">{groupLabel(group)}</p>
                  <p className="mt-1 text-xl font-black text-emerald-100">{currency(selectedTotal)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Voo</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white"><Plane size={14} className="text-sky-300" />{report.numero_voo || '—'}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Aeronave</p><p className="mt-1 text-sm font-bold text-white">{report.aeronave_matricula || '—'}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Período</p><p className="mt-1 text-sm font-bold text-white">{date(report.data_inicio)} a {date(report.data_fim)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tripulante</p><p className="mt-1 break-words text-sm font-bold text-white">{report.tripulante_pos === 1 ? report.nome_tripulante || 'Tripulante 1' : report.nome_tripulante_2 || 'Tripulante 2'}</p></div>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rota</p><p className="mt-1 break-words text-sm font-bold text-white">{report.rota || '—'}</p></div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
              {(['total', ...availableGroups] as ExpenseGroup[]).map((item) => <button key={item} type="button" onClick={() => selectGroup(item)} aria-pressed={group === item} className={`p-4 text-left transition hover:bg-white/[0.045] ${group === item ? 'bg-sky-400/[0.10] ring-1 ring-inset ring-sky-300/25' : 'bg-[#0b111c]'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{groupLabel(item)}</p>
                <p className={`mt-1 text-base font-black ${item === 'tripulante' ? 'text-emerald-200' : item === 'cliente' ? 'text-sky-200' : 'text-white'}`}>{currency(totals[item])}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">{item === 'total' ? expenses.length : groupedExpenses[item].length} despesa(s)</p>
              </button>)}
            </div>
            {report.observacoes && <div className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-slate-400 sm:px-5"><strong className="text-slate-300">Observações:</strong> {report.observacoes}</div>}
          </section>

          {report.pdf_url && <a href={report.pdf_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-[#0b111c] px-4 text-sm font-bold text-sky-200"><FileText size={16} />Abrir relatório PDF<ExternalLink size={14} /></a>}

          <section className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:mt-5">
            <div className="flex items-start gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-sky-200">{group === 'total' ? <Plane size={18} /> : group === 'cliente' ? <ReceiptText size={18} /> : group === 'sharebrasil' ? <ShieldCheck size={18} /> : group === 'outros' ? <Info size={18} /> : <CircleDollarSign size={18} />}</span>
              <div className="min-w-0"><h2 className="text-sm font-extrabold tracking-tight text-white sm:text-base">{groupDescription(group)} ({selectedExpenses.length})</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">Total deste grupo: {currency(selectedTotal)}</p></div>
            </div>
            {selectedExpenses.length > 0
              ? selectedExpenseRows.map(({ expense, index }) => renderExpense(expense, index))
              : <p className="px-4 py-5 text-sm text-slate-500 sm:px-5">Nenhuma despesa neste grupo.</p>}
          </section>

          {!canDecide && <section className={`mt-4 rounded-3xl border p-4 sm:p-5 ${approved ? 'border-emerald-300/15 bg-emerald-300/[0.05]' : rejected ? 'border-rose-300/15 bg-rose-300/[0.05]' : 'border-white/10 bg-[#0b111c]'}`}>
            <div className="flex items-start gap-3">
              {approved ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={23} /> : rejected ? <XCircle className="mt-0.5 shrink-0 text-rose-300" size={23} /> : <Clock3 className="mt-0.5 shrink-0 text-slate-400" size={23} />}
              <div className="min-w-0"><p className={`text-base font-extrabold ${approved ? 'text-emerald-200' : rejected ? 'text-rose-200' : 'text-slate-200'}`}>{approved ? 'Sua aprovação foi registrada' : rejected ? 'Este relatório foi rejeitado' : `Status: ${status}`}</p>
                {rejected && approvalReason && <p className="mt-2 break-words rounded-xl border border-white/10 bg-black/10 p-3 text-xs leading-relaxed text-rose-100"><strong>Motivo:</strong> {approvalReason}</p>}
                <p className="mt-2 text-xs leading-relaxed text-slate-500">Este relatório não está mais disponível para uma nova decisão.</p>
              </div>
            </div>
          </section>}
        </div>
      </main>

      {canDecide && <div className="fixed inset-x-0 bottom-0 z-[85] border-t border-white/10 bg-[#07101c]/95 shadow-[0_-18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-4xl px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
          <div className="mb-2 flex items-center justify-between gap-3 px-1 text-[10px] font-extrabold uppercase tracking-wider"><span className={allGroupsReviewed ? 'text-emerald-300' : 'text-amber-300'}>{allGroupsReviewed ? 'Todos os grupos foram revisados' : 'Revise cada grupo até o final para liberar a aprovação'}</span><span className="text-slate-400">{currency(totals.tripulante)}</span></div>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" disabled={busy} onClick={() => { setReason(''); setDecision('rejeitar'); }} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-white/[0.03] px-3 text-sm font-extrabold text-rose-200 transition disabled:opacity-50"><X size={17} />Rejeitar</button>
            <button type="button" disabled={busy || !allGroupsReviewed} onClick={() => { setReason(''); setDecision('aprovar'); }} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3 text-sm font-extrabold text-[#04120c] shadow-[0_8px_24px_rgba(16,185,129,0.22)] transition disabled:cursor-not-allowed disabled:opacity-35"><Check size={17} />Aprovar relatório</button>
          </div>
        </div>
      </div>}

      {decision && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="travel-decision-title" className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0b111c] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white shadow-2xl sm:rounded-3xl sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Confirmação</p><h2 id="travel-decision-title" className="mt-1 text-lg font-black tracking-tight">{decision === 'aprovar' ? 'Aprovar este relatório?' : 'Rejeitar este relatório?'}</h2></div><button type="button" onClick={() => setDecision(null)} aria-label="Fechar" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-slate-300"><X size={18} /></button></div>
          {decision === 'aprovar' ? <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={20} /><p className="text-sm leading-relaxed text-emerald-100">Você confirma a aprovação do relatório no valor de <strong>{currency(totals.tripulante)}</strong> atribuídos a você.</p></div></div> : <div className="mt-4"><div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.06] p-4 text-xs leading-relaxed text-rose-100">Para rejeitar, informe o que precisa ser corrigido no relatório.</div><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: Despesa de alimentação informada com valor incorreto." className="mt-3 min-h-28 resize-y rounded-2xl border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-slate-500" autoFocus /></div>}
          <div className="mt-4 grid grid-cols-2 gap-2.5"><button type="button" disabled={busy} onClick={() => setDecision(null)} className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm font-extrabold text-slate-200 disabled:opacity-50">Cancelar</button><button type="button" disabled={busy || (decision === 'rejeitar' && !reason.trim())} onClick={() => void confirmDecision()} className={`min-h-12 rounded-2xl px-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${decision === 'aprovar' ? 'bg-emerald-500 text-[#04120c]' : 'bg-rose-500 text-white'}`}>{busy ? <Loader2 className="mx-auto animate-spin" size={18} /> : decision === 'aprovar' ? 'Confirmar aprovação' : 'Confirmar rejeição'}</button></div>
        </section>
      </div>}

      {(preview || previewLoading || previewError) && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6">
        <section className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] text-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-slate-300">{preview && String(preview.attachment.tipo_arquivo || '').startsWith('image/') ? <FileImage size={17} /> : <FileText size={17} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{preview?.attachment.nome_arquivo || 'Comprovante'}</p><p className="truncate text-[11px] text-slate-500">{report.numero_relatorio}</p></div><button type="button" onClick={() => { setPreview(null); setPreviewError(''); }} aria-label="Fechar comprovante" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-slate-300"><X size={18} /></button></div>
          <div className="min-h-0 flex-1 overflow-auto bg-[#050a12] p-2 sm:p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {previewLoading && <div className="flex min-h-[50dvh] items-center justify-center"><Loader2 className="animate-spin text-sky-300" size={32} /></div>}
            {!previewLoading && previewError && <p className="flex min-h-[50dvh] items-center justify-center px-6 text-sm text-rose-200">{previewError}</p>}
            {!previewLoading && preview && String(preview.attachment.tipo_arquivo || '').startsWith('image/') && <div className="flex min-h-[55dvh] items-center justify-center rounded-2xl bg-black/20 p-2 sm:p-4"><img src={preview.url} alt={preview.attachment.nome_arquivo || 'Comprovante'} className="max-h-[78dvh] w-auto max-w-full rounded-xl object-contain" /></div>}
            {!previewLoading && preview && (preview.attachment.tipo_arquivo === 'application/pdf' || preview.attachment.nome_arquivo?.toLowerCase().endsWith('.pdf')) && <iframe title={preview.attachment.nome_arquivo || 'Comprovante PDF'} src={preview.url} className="h-[75dvh] w-full rounded-xl bg-white" />}
            {!previewLoading && preview && !String(preview.attachment.tipo_arquivo || '').startsWith('image/') && preview.attachment.tipo_arquivo !== 'application/pdf' && !preview.attachment.nome_arquivo?.toLowerCase().endsWith('.pdf') && <div className="flex min-h-[50dvh] flex-col items-center justify-center rounded-2xl bg-white/[0.03] p-6 text-center"><FileText size={44} className="text-slate-600" /><p className="mt-3 text-sm font-bold">Arquivo disponível</p><p className="mt-1 text-xs text-slate-500">Use o botão abaixo para abrir o comprovante.</p></div>}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5"><span className="truncate text-[11px] text-slate-500">Comprovante do relatório</span>{preview && <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-slate-200">Abrir em nova guia<ExternalLink size={14} /></a>}</div>
        </section>
      </div>}
    </div>
  </>;
}

export default function RelatorioViagem() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [reports, setReports] = useState<TravelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Pago'>('Todos');
  const [busyId, setBusyId] = useState<string | null>(null);

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
    if (!response.ok) throw new Error(data.message || data.error || 'Não foi possível concluir a solicitação.');
    return data;
  }, [session?.access_token]);

  const loadReports = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await request(endpoint);
      setReports(Array.isArray(data.relatorios) ? data.relatorios : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar seus relatórios.');
    } finally {
      setLoading(false);
    }
  }, [request, session?.access_token]);
  useEffect(() => { void loadReports(); }, [loadReports]);

  const filteredReports = useMemo(() => reports.filter((report) => {
    if (filter === 'Pendente') return isPending(report);
    if (filter === 'Pago') return report.pagamento_status === 'PAGO';
    if (filter === 'Aprovado') return !isPending(report) && reportLabel(report) === 'Aprovado' && report.pagamento_status !== 'PAGO';
    return true;
  }), [filter, reports]);
  const counts = useMemo(() => ({
    pending: reports.filter(isPending).length,
    approved: reports.filter((report) => reportLabel(report) === 'Aprovado' && report.pagamento_status !== 'PAGO').length,
    paid: reports.filter((report) => report.pagamento_status === 'PAGO').length,
  }), [reports]);

  const decide = async (report: TravelReport, approved: boolean, reason: string) => {
    setBusyId(report.id);
    try {
      await request(`/api/financeiro/relatorios-despesa-viagem/${encodeURIComponent(report.id)}/aprovacao`, {
        method: 'POST',
        body: JSON.stringify({ tripulante_pos: report.tripulante_pos, aprovado: approved, observacoes: reason }),
      });
      toast.success(approved ? 'Relatório aprovado.' : 'Relatório rejeitado e enviado para ajuste.');
      await loadReports();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível registrar sua decisão.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const selectedReport = reports.find((report) => report.id === selectedId) || null;

  return <MobileLayout hideTabBar={Boolean(selectedReport)}>
    {selectedReport ? <ReportReviewScreen key={selectedReport.id} report={selectedReport} accessToken={session?.access_token} onClose={() => setSelectedId(null)} onDecide={decide} busy={busyId === selectedReport.id} /> : <main className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
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
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" aria-label="Carregando" /></div> : filteredReports.length === 0
        ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />Nenhum relatório encontrado neste filtro.</CardContent></Card>
        : <div className="space-y-3">{filteredReports.map((report) => {
          const pending = isPending(report);
          const paid = report.pagamento_status === 'PAGO';
          return <Card key={report.id}><CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-muted p-2">{paid ? <CircleDollarSign className="h-4 w-4 text-green-600" /> : pending ? <Clock3 className="h-4 w-4 text-amber-600" /> : <FileText className="h-4 w-4 text-primary" />}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{report.numero_relatorio || 'Relatório de viagem'}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paid ? 'bg-green-100 text-green-800' : pending ? 'bg-amber-100 text-amber-800' : report.status === 'ajuste_necessario' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{reportLabel(report)}</span></div>
                <p className="mt-1 text-sm text-muted-foreground">{report.cliente_nome || 'Cliente'} · {report.aeronave_matricula || 'Aeronave'}</p><p className="text-xs text-muted-foreground">{report.rota || 'Trecho não informado'} · {date(report.data_inicio)} a {date(report.data_fim)}</p></div>
              <Button variant="outline" size="sm" onClick={() => setSelectedId(report.id)} aria-label={`Abrir relatório ${report.numero_relatorio}`}><Eye className="mr-1 h-4 w-4" />Abrir</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><p className="font-semibold">Total: {currency(report.total_valor)}</p>{report.pagamento_status !== 'NAO_PROGRAMADO' && <p className="text-sm">{paid ? `Pagamento quitado: ${currency(report.pagamento_valor)}` : `Quitado: ${currency(report.pagamento_valor)} · pendente: ${currency(Math.max(0, Number(report.pagamento_total || 0) - Number(report.pagamento_valor || 0)))}`}</p>}</div>
          </CardContent></Card>;
        })}</div>}
    </main>}
  </MobileLayout>;
}
