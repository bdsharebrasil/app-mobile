import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ElementType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ChevronRight, CircleDollarSign, Clock3,
  ExternalLink, FileImage, FileText, ImagePlus, Info, Loader2,
  Plane, ReceiptText, RefreshCw, Trash2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { PremiumSheet } from '@/components/mobile/PremiumSheet';
import '@/components/mobile/premium-mobile.css';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND } from '@/config/api';

// --- Interfaces e Helpers mantidos idênticos para não quebrar a lógica ---
interface TravelExpense {
  id?: string; categoria?: string; category?: string; descricao?: string;
  description?: string; data?: string; valor?: number | string; amount?: number | string;
  pago_por?: string; paid_by?: string; observacoes?: string; comprovante_url?: string;
}

interface ExpenseAttachment {
  id: string; relatorio_despesa_viagem_id: string; indice_despesa?: number | string;
  nome_arquivo?: string | null; url_arquivo: string; tipo_arquivo?: string | null;
  tamanho_arquivo?: number | string | null; criado_em?: string | null;
}

type PreviewAttachment = Pick<ExpenseAttachment, 'id' | 'nome_arquivo' | 'url_arquivo' | 'tipo_arquivo'>;
type RejectionAttachment = PreviewAttachment & Pick<ExpenseAttachment, 'tamanho_arquivo' | 'criado_em'>;
interface AdjustmentRequest {
  id: string; tripulante_pos?: number | string; motivo: string; criado_em?: string | null; anexos?: RejectionAttachment[] | null;
}

interface TravelReport {
  id: string; numero_relatorio: string; numero_voo?: string | null;
  cliente_nome?: string | null; aeronave_matricula?: string | null;
  nome_tripulante?: string | null; nome_tripulante_2?: string | null;
  tripulante_pos: 1 | 2; rota?: string | null; data_inicio?: string | null; data_fim?: string | null;
  observacoes?: string | null; despesas: TravelExpense[] | string | null;
  anexos?: ExpenseAttachment[] | null; anexos_rejeicao?: RejectionAttachment[] | string | null;
  historico_ajustes?: AdjustmentRequest[] | string | null; total_valor?: number | string;
  status: string; status_aprovacao_tripulante?: string | null; status_aprovacao_tripulante_2?: string | null;
  contas_apagar_tripulante_1_id?: string | null; contas_apagar_tripulante_2_id?: string | null;
  motivo_reprovacao_tripulante_1?: string | null; motivo_reprovacao_tripulante_2?: string | null;
  pagamento_status: 'PAGO' | 'PENDENTE' | 'NAO_PROGRAMADO';
  pagamento_valor?: number; pagamento_total?: number; data_pagamento?: string | null; pdf_url?: string | null;
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
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed as TravelExpense[] : []; } catch { return []; }
}
function parseRejectionAttachments(value: TravelReport['anexos_rejeicao']): RejectionAttachment[] {
  if (Array.isArray(value)) return value.filter((item) => Boolean(item?.id && item.url_arquivo));
  if (typeof value !== 'string') return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? (parsed as RejectionAttachment[]).filter((item) => Boolean(item?.id && item.url_arquivo)) : []; } catch { return []; }
}
function parseAdjustmentHistory(value: TravelReport['historico_ajustes']): AdjustmentRequest[] {
  if (Array.isArray(value)) return value.filter((item) => Boolean(item?.id && item.motivo?.trim()));
  if (typeof value !== 'string') return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? (parsed as AdjustmentRequest[]).filter((item) => Boolean(item?.id && item.motivo?.trim())) : []; } catch { return []; }
}
function normalizedPayer(expense: TravelExpense) {
  return String(expense.pago_por || expense.paid_by || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
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
  return ['aguardando_aprovacao', 'ajuste_concluido'].includes(normalize(report.status)) && !['aprovado', 'reprovado', 'rejeitado'].includes(approval);
}
function reportLabel(report: TravelReport) {
  const approval = normalize(report.tripulante_pos === 1 ? report.status_aprovacao_tripulante : report.status_aprovacao_tripulante_2);
  if (report.pagamento_status === 'PAGO') return 'Pago';
  if (isPending(report)) return normalize(report.status) === 'ajuste_concluido' ? 'Ajuste concluído · nova aprovação' : 'Pendente de aprovação';
  if (approval === 'aprovado' || ['aprovado', 'enviado_cliente'].includes(normalize(report.status))) return 'Aprovado';
  if (approval === 'reprovado' || approval === 'rejeitado' || report.status === 'ajuste_necessario') return 'Ajuste necessário';
  return String(report.status || '').replace(/_/g, ' ');
}
function groupLabel(group: ExpenseGroup) {
  return { total: 'Total da viagem', tripulante: 'Tripulante', cliente: 'Cliente', sharebrasil: 'Share Brasil', outros: 'Outras despesas' }[group];
}
function groupDescription(group: ExpenseGroup) {
  return { total: 'Todas as despesas da viagem', tripulante: 'Despesas atribuídas a você', cliente: 'Despesas pagas pelo cliente', sharebrasil: 'Despesas pagas pela Share Brasil', outros: 'Despesas atribuídas a outros pagadores' }[group];
}
function reportStatus(report: TravelReport) {
  const approval = normalize(report.tripulante_pos === 1 ? report.status_aprovacao_tripulante : report.status_aprovacao_tripulante_2);
  if (approval === 'aprovado') return 'Aprovado';
  if (approval === 'reprovado' || approval === 'rejeitado') return 'Reprovado';
  if (isPending(report)) return normalize(report.status) === 'ajuste_concluido' ? 'Ajuste concluído' : 'Pendente';
  if (report.status === 'ajuste_necessario') return 'Ajuste necessário';
  return String(report.status || 'Pendente').replace(/_/g, ' ');
}


function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="premium-section"><h2 className="premium-section-title">{title}</h2><div className="premium-group ios-lista">{children}</div></section>;
}
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="premium-info-row"><span>{label}</span><span>{value}</span></div>;
}
function badgeTone(report: TravelReport) {
  if (report.pagamento_status === 'PAGO') return 'paid';
  if (isPending(report)) return 'pending';
  if (['Reprovado', 'Ajuste necessário'].includes(reportStatus(report))) return 'danger';
  if (reportLabel(report) === 'Aprovado') return 'success';
  return 'pending';
}
function Badge({ report }: { report: TravelReport }) {
  return <span className={`premium-badge premium-badge--${badgeTone(report)}`}>{reportLabel(report)}</span>;
}
function safeLink(path?: string | null) {
  if (!path) return undefined;
  try {
    const url = new URL(path, BACKEND ? `${BACKEND.replace(/\/$/, '')}/` : window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}
function Stat({ icon: Icon, label, value }: { icon: ElementType; label: string; value: number }) {
  return <div className="premium-stat" style={{ marginTop: 23, marginBottom: 23, paddingTop: 14, paddingBottom: 14 }}><Icon size={20} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></div>;
}
function Empty({ title, description }: { title: string; description: string }) {
  return <div className="premium-empty"><ReceiptText size={32} aria-hidden="true" /><strong>{title}</strong><p>{description}</p></div>;
}

function ReportReviewScreen({ report, accessToken, onClose, onDecide, busy }: {
  report: TravelReport; accessToken?: string; onClose: () => void;
  onDecide: (report: TravelReport, approved: boolean, reason: string, rejectionImage?: File) => Promise<boolean>;
  busy: boolean;
}) {
  const expenses = useMemo(() => parseExpenses(report.despesas), [report.despesas]);
  const attachments = useMemo(() => Array.isArray(report.anexos) ? report.anexos : [], [report.anexos]);
  const adjustmentRequests = useMemo(() => {
    const history = parseAdjustmentHistory(report.historico_ajustes);
    if (history.length) return history;
    const legacy = [
      { position: 1, reason: report.motivo_reprovacao_tripulante_1 },
      { position: 2, reason: report.motivo_reprovacao_tripulante_2 },
    ].filter((item) => Boolean(item.reason?.trim()));
    return legacy.map((item, index) => ({
      id: `legacy-${report.id}-${item.position}`, tripulante_pos: item.position, motivo: item.reason!.trim(), criado_em: null,
      anexos: index === legacy.length - 1 ? parseRejectionAttachments(report.anexos_rejeicao) : [],
    }));
  }, [report]);

  const [group, setGroup] = useState<ExpenseGroup>('tripulante');
  const [decision, setDecision] = useState<Decision>(null);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<{ attachment: PreviewAttachment; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rejectionImage, setRejectionImage] = useState<File | null>(null);
  const [rejectionImagePreview, setRejectionImagePreview] = useState('');
  const rejectionImageInput = useRef<HTMLInputElement | null>(null);
  const mounted = useRef(true);
  const attachmentBusy = useRef(false);
  const decisionBusy = useRef(false);
  const [discardDecision, setDiscardDecision] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const approvalStatus = normalize(report.tripulante_pos === 1 ? report.status_aprovacao_tripulante : report.status_aprovacao_tripulante_2);
  const status = reportStatus(report);
  const approved = status === 'Aprovado';
  const rejected = status === 'Reprovado' || status === 'Ajuste necessário';

  const groupedExpenses = useMemo(() => {
    const grouped: Record<Exclude<ExpenseGroup, 'total'>, TravelExpense[]> = { tripulante: [], cliente: [], sharebrasil: [], outros: [] };
    expenses.forEach((expense) => grouped[groupForExpense(expense, report.tripulante_pos)].push(expense));
    return grouped;
  }, [expenses, report.tripulante_pos]);

  const payableId = report.tripulante_pos === 1 ? report.contas_apagar_tripulante_1_id : report.contas_apagar_tripulante_2_id;
  const expectedPayable = expenses.some((expense) => {
    const payer = normalizedPayer(expense);
    const crewPayers = report.tripulante_pos === 1 ? ['tripulante_1', 'tripulante1'] : ['tripulante_2', 'tripulante2'];
    return crewPayers.includes(payer) && Math.round(amountOf(expense) * 100) > 0;
  });
  
  const canRetryApprovalSync = approvalStatus === 'aprovado' && normalize(report.status) === 'aprovado' && expectedPayable && !String(payableId || '').trim();
  const canDecide = isPending(report) || canRetryApprovalSync;

  const attachmentsByExpense = useMemo(() => {
    const grouped = new Map<number, ExpenseAttachment[]>();
    attachments.forEach((attachment) => {
      if (attachment.indice_despesa == null || attachment.indice_despesa === '') return;
      const index = Number(attachment.indice_despesa);
      if (!Number.isInteger(index) || index < 0) return;
      const list = grouped.get(index) || [];
      list.push(attachment); grouped.set(index, list);
    });
    return grouped;
  }, [attachments]);

  const totals = useMemo(() => {
    const sum = (items: TravelExpense[]) => items.reduce((total, expense) => total + amountOf(expense), 0);
    return {
      total: sum(expenses), tripulante: sum(groupedExpenses.tripulante), cliente: sum(groupedExpenses.cliente),
      sharebrasil: sum(groupedExpenses.sharebrasil), outros: sum(groupedExpenses.outros),
    };
  }, [expenses, groupedExpenses]);

  const availableGroups = useMemo(() => (['tripulante', 'cliente', 'sharebrasil', 'outros'] as const).filter((item) => groupedExpenses[item].length > 0), [groupedExpenses]);
  const selectedExpenseRows = useMemo(() => expenses.map((expense, index) => ({ expense, index })).filter(({ expense }) => group === 'total' || groupForExpense(expense, report.tripulante_pos) === group), [expenses, group, report.tripulante_pos]);
  const selectedExpenses = useMemo(() => selectedExpenseRows.map(({ expense }) => expense), [selectedExpenseRows]);
  const selectedTotal = totals[group];

  useEffect(() => { if (group !== 'total' && !availableGroups.includes(group)) setGroup(availableGroups[0] || 'total'); }, [availableGroups, group]);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);
  useEffect(() => {
    if (!rejectionImage) { setRejectionImagePreview(''); return; }
    const url = URL.createObjectURL(rejectionImage);
    setRejectionImagePreview(url); return () => URL.revokeObjectURL(url);
  }, [rejectionImage]);

  const openAttachment = async (attachment: PreviewAttachment) => {
    if (!accessToken) { toast.error('Sessão expirada. Entre novamente.'); return; }
    if (attachmentBusy.current) return;
    attachmentBusy.current = true;
    setPreviewLoading(true);
    try {
      const response = await fetch(`${BACKEND}${attachment.url_arquivo}`, {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY },
      });
      if (!response.ok) throw new Error('Não foi possível abrir o comprovante.');
      const blob = await response.blob();
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob);
      setPreview({ attachment: { ...attachment, tipo_arquivo: attachment.tipo_arquivo || blob.type }, url });
    } catch { if (mounted.current) toast.error('Não foi possível abrir o comprovante. Tente novamente.'); } finally { attachmentBusy.current = false; if (mounted.current) setPreviewLoading(false); }
  };

  const confirmDecision = async () => {
    if (!decision || busy || decisionBusy.current) return;
    const approvedDecision = decision === 'aprovar';
    if (!approvedDecision && !reason.trim()) { toast.error('Informe o motivo da rejeição.'); return; }
    decisionBusy.current = true;
    try {
      const saved = await onDecide(report, approvedDecision, reason.trim(), rejectionImage || undefined);
      if (saved && mounted.current) { setDecision(null); setReason(''); setRejectionImage(null); }
    } finally { decisionBusy.current = false; }
  };

  const handleRejectionImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { toast.error('Escolha uma imagem JPEG ou PNG.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 5 MB.'); return; }
    setRejectionImage(file);
  };

  const closeDecision = () => { if (!busy) { setDecision(null); setReason(''); setRejectionImage(null); } };
  return <section className="premium-review ios-root" aria-label={`Revisão do relatório ${report.numero_relatorio}`}>
    <header className="premium-nav is-scrolled">
      <div className="premium-shell premium-nav-inner">
        <div className="premium-nav-start"><button type="button" disabled={busy} onClick={onClose} className="premium-icon-button ios-press" aria-label="Voltar para relatórios"><ArrowLeft size={22} /></button></div>
        <span className="premium-nav-title">Revisar relatório</span>
        <span />
      </div>
    </header>
    <div className="premium-review-scroll">
      <div className="premium-shell">
        <div className="premium-heading">
          <p className="premium-eyebrow">Despesas de viagem</p>
          <h1 className="premium-title" style={{ fontSize: 21.2 }}>{report.numero_relatorio || 'Relatório'}</h1>
          <p className="premium-subtitle">{report.rota || report.cliente_nome || 'Confira as despesas e os comprovantes.'}</p>
        </div>
        <div className="premium-review-grid">
          <aside className="premium-review-aside">
            <div className="premium-hero" style={{ marginBottom: 8, marginTop: -15, paddingTop: 1, paddingBottom: 1 }}>
              <p className="premium-hero-label">Total da viagem</p>
              <p className="premium-amount" style={{ fontSize: 25.6 }}>{currency(totals.total)}</p>
              <Badge report={report} />
              <p className="premium-hero-caption">Sua participação: {currency(totals.tripulante)}</p>
            </div>
            <Section title="Detalhes da viagem">
              <InfoRow label="Voo" value={report.numero_voo || '—'} />
              <InfoRow label="Aeronave" value={report.aeronave_matricula || '—'} />
              <InfoRow label="Cliente" value={report.cliente_nome || '—'} />
              <InfoRow label="Período" value={<>{date(report.data_inicio)}<br />a {date(report.data_fim)}</>} />
              <InfoRow label="Tripulante" value={report.tripulante_pos === 1 ? report.nome_tripulante || 'Tripulante 1' : report.nome_tripulante_2 || 'Tripulante 2'} />
            </Section>
            {report.observacoes && <Section title="Observações"><p className="p-4 text-[15px] whitespace-pre-wrap c-l2">{report.observacoes}</p></Section>}
            <Section title="Pagamento">
              <InfoRow label="Situação" value={report.pagamento_status === 'PAGO' ? 'Pago' : report.pagamento_status === 'PENDENTE' ? 'Pendente' : 'Não programado'} />
              {report.data_pagamento && <InfoRow label="Data" value={date(report.data_pagamento)} />}
              {report.pagamento_valor != null && <InfoRow label="Valor" value={currency(report.pagamento_valor)} />}
            </Section>
            {safeLink(report.pdf_url) && <a className="premium-attachment mb-6" href={safeLink(report.pdf_url)} target="_blank" rel="noreferrer"><FileText size={18} />Abrir relatório em PDF<ExternalLink size={15} /></a>}
          </aside>
          <div className="min-w-0">
            <section className="premium-section">
              <h2 className="premium-section-title">Despesas por pagador</h2>
              <div className="premium-chips" role="group" aria-label="Filtrar despesas por pagador">
                {(['total', ...availableGroups] as ExpenseGroup[]).map((item) => <button key={item} type="button" aria-pressed={group === item} onClick={(event) => { setGroup(item); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }); }}>{item === 'tripulante' ? 'Minhas despesas' : groupLabel(item)}</button>)}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3 py-4" style={{ letterSpacing: '2.8px', fontSize: 15 }}>
                <div><p className="text-[15px] font-semibold">{groupLabel(group)}</p><p className="c-l2 text-[13px]">{groupDescription(group)} · {selectedExpenses.length}</p></div>
                <strong className="premium-money">{currency(selectedTotal)}</strong>
              </div>
              {selectedExpenseRows.length ? <div className="premium-group ios-lista">
                {selectedExpenseRows.map(({ expense, index }) => {
                  const linkedAttachments = attachmentsByExpense.get(index) || [];
                  return <article key={expense.id || index} className="premium-expense">
                    <div className="premium-expense-top">
                      <div className="premium-expense-description">
                        <div className="premium-expense-meta"><span>{expenseCategory(expense)}</span>{expense.data && <span>{date(expense.data)}</span>}</div>
                        <strong>{expenseDescription(expense)}</strong>
                        <p>Pago por {payerLabel(expense)}</p>
                        {expense.observacoes && <p className="mt-2 whitespace-pre-wrap">{expense.observacoes}</p>}
                      </div>
                      <span className="premium-money">{currency(amountOf(expense))}</span>
                    </div>
                    {(linkedAttachments.length > 0 || safeLink(expense.comprovante_url)) && <div className="premium-attachments">
                      {linkedAttachments.map((attachment) => <button key={attachment.id} type="button" disabled={previewLoading} className="premium-attachment" onClick={() => void openAttachment(attachment)}>
                        {String(attachment.tipo_arquivo || '').startsWith('image/') ? <FileImage size={18} /> : <FileText size={18} />}
                        <span>Ver comprovante</span>
                      </button>)}
                      {!linkedAttachments.length && safeLink(expense.comprovante_url) && <a className="premium-attachment" href={safeLink(expense.comprovante_url)} target="_blank" rel="noreferrer"><ExternalLink size={18} />Abrir comprovante</a>}
                    </div>}
                  </article>;
                })}
              </div> : <Empty title="Nenhuma despesa neste grupo" description="Selecione outro pagador para continuar a revisão." />}
            </section>
            {previewLoading && <p role="status" className="c-l2 mb-4 flex items-center gap-2 text-[14px]"><Loader2 size={18} className="premium-spin" />Abrindo comprovante…</p>}
            {attachments.filter((attachment) => attachment.indice_despesa == null || attachment.indice_despesa === '').length > 0 && <Section title="Outros comprovantes"><div className="premium-attachments p-4">
              {attachments.filter((attachment) => attachment.indice_despesa == null || attachment.indice_despesa === '').map((attachment) => <button key={attachment.id} type="button" className="premium-attachment" disabled={previewLoading} onClick={() => void openAttachment(attachment)}><FileText size={18} /><span>{attachment.nome_arquivo || 'Comprovante'}</span></button>)}
            </div></Section>}
            {adjustmentRequests.length > 0 && <details className="premium-group premium-history mb-7">
              <summary>Histórico de ajustes · {adjustmentRequests.length}</summary>
              {[...adjustmentRequests].reverse().map((request, index) => <article key={request.id} className="premium-history-entry">
                <time>{request.criado_em ? date(request.criado_em) : `Ajuste ${adjustmentRequests.length - index}`}</time>
                <p>{request.motivo}</p>
                {!!request.anexos?.length && <div className="premium-attachments">{request.anexos.map((attachment) => <button key={attachment.id} type="button" className="premium-attachment" disabled={previewLoading} onClick={() => void openAttachment(attachment)}><FileImage size={18} /><span>{attachment.nome_arquivo || 'Anexo do ajuste'}</span></button>)}</div>}
              </article>)}
            </details>}
          </div>
        </div>
      </div>
    </div>
    <footer className="premium-bottom-bar">
      <div className="premium-shell">
        {canDecide ? <div className="premium-bottom-actions">
          {!canRetryApprovalSync && <button type="button" disabled={busy} className="premium-button premium-button--secondary" onClick={() => { setDecision('rejeitar'); setReason(''); setRejectionImage(null); }}>Solicitar ajuste</button>}
          <button type="button" disabled={busy} className="premium-button" onClick={() => setDecision('aprovar')}>{canRetryApprovalSync ? 'Tentar novamente' : 'Aprovar relatório'}</button>
        </div> : <p className="c-l2 flex items-center justify-center gap-2 py-3 text-[15px]">{approved ? <CheckCircle2 size={20} className="c-ok" /> : rejected ? <XCircle size={20} className="c-bad" /> : <Clock3 size={20} />}{approved ? 'Relatório aprovado' : rejected ? 'Relatório em ajuste' : status}</p>}
      </div>
    </footer>
    {decision && <PremiumSheet compacto titulo={decision === 'aprovar' ? 'Aprovar relatório' : 'Solicitar ajuste'} bloqueado={busy}
      aoFechar={closeDecision} antesDeFechar={() => {
        if (decision === 'rejeitar' && (reason.trim() || rejectionImage)) { setDiscardDecision(true); return false; }
        return true;
      }}
      footer={<div className="premium-bottom-actions">
        <button type="button" disabled={busy} className="premium-button premium-button--secondary" onClick={() => {
          if (decision === 'rejeitar' && (reason.trim() || rejectionImage)) setDiscardDecision(true); else closeDecision();
        }}>Cancelar</button>
        <button type="button" disabled={busy || (decision === 'rejeitar' && !reason.trim())} className={`premium-button ${decision === 'rejeitar' ? 'premium-button--danger' : ''}`} onClick={() => void confirmDecision()}>
          {busy ? <><Loader2 size={18} className="premium-spin" />Enviando…</> : decision === 'aprovar' ? 'Confirmar aprovação' : 'Enviar solicitação'}
        </button>
      </div>}>
      {decision === 'aprovar' ? <div className="premium-notice">
        <CheckCircle2 size={28} className="c-tint mb-3" />
        <p>{canRetryApprovalSync ? 'Vamos tentar concluir a sincronização desta aprovação.' : <>Ao confirmar, você aprova as despesas vinculadas a você, no valor de <strong className="c-l1">{currency(totals.tripulante)}</strong>.</>}</p>
      </div> : <>
        <p className="c-l2 text-[15px] mb-5">Explique o que precisa ser corrigido para que o financeiro possa revisar o relatório.</p>
        <label htmlFor="motivo-ajuste" className="premium-field-label">Motivo do ajuste</label>
        <textarea id="motivo-ajuste" value={reason} required maxLength={2000} onChange={(event) => setReason(event.target.value)} placeholder="Descreva o que precisa de ajuste…" className="premium-textarea" />
        <p className="c-l3 text-right text-[12px] mt-2">{reason.length}/2000</p>
        <input ref={rejectionImageInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleRejectionImage} />
        {!rejectionImage ? <button type="button" className="premium-button premium-button--secondary w-full mt-5" onClick={() => rejectionImageInput.current?.click()}><ImagePlus size={20} />Anexar imagem</button> : <div className="premium-group mt-5 p-3">
          {rejectionImagePreview && <img src={rejectionImagePreview} className="premium-preview-image" alt="Imagem anexada ao ajuste" />}
          <div className="flex min-w-0 items-center gap-3 mt-2"><span className="c-l2 flex-1 min-w-0 truncate text-[13px]">{rejectionImage.name}</span><button type="button" className="premium-icon-button" aria-label="Remover imagem" onClick={() => setRejectionImage(null)}><Trash2 size={20} /></button></div>
        </div>}
        <p className="c-l2 text-[13px] mt-3">Opcional. JPEG ou PNG de até 5 MB.</p>
      </>}
    </PremiumSheet>}
    {discardDecision && <PremiumSheet compacto titulo="Descartar solicitação?" aoFechar={() => setDiscardDecision(false)}>
      <p className="premium-notice">O motivo e a imagem ainda não foram enviados.</p>
      <button type="button" className="premium-button premium-button--danger w-full" onClick={() => { setDiscardDecision(false); closeDecision(); }}>Descartar alterações</button>
    </PremiumSheet>}
    {preview && <PremiumSheet titulo={preview.attachment.nome_arquivo || 'Comprovante'} rotuloEsquerda={null} aoFechar={() => setPreview(null)}>
      {String(preview.attachment.tipo_arquivo || '').startsWith('image/') ? <img src={preview.url} className="premium-preview-image" alt="Comprovante da despesa" /> : <>
        <a className="premium-attachment mb-4" href={preview.url} target="_blank" rel="noreferrer"><ExternalLink size={18} />Abrir documento em outra aba</a>
        <iframe src={preview.url} title="Comprovante da despesa" className="premium-preview-pdf" />
      </>}
    </PremiumSheet>}
  </section>;
}

export default function RelatorioViagem() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [reports, setReports] = useState<TravelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Todos' | 'Pendente' | 'Aprovado' | 'Pago'>('Todos');
  const [loadError, setLoadError] = useState('');
  const inFlightDecision = useRef(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente.');
    const response = await fetch(`${BACKEND}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY, ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...init?.headers, },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Não foi possível concluir a solicitação.');
    return data;
  }, [session?.access_token]);

  const loadReports = useCallback(async (silent = false) => {
    if (!session?.access_token) { setLoading(false); setLoadError('Entre novamente para consultar seus relatórios.'); return; }
    setLoading(true);
    setLoadError('');
    try {
      const data = await request(endpoint);
      setReports(Array.isArray(data.relatorios) ? data.relatorios : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar relatórios.';
      setLoadError(message);
      if (!silent) toast.error(message);
    } finally { setLoading(false); }
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

  const decide = async (report: TravelReport, approved: boolean, reason: string, rejectionImage?: File) => {
    if (inFlightDecision.current) return false;
    inFlightDecision.current = true;
    setBusyId(report.id);
    try {
      const body = new FormData();
      body.set('tripulante_pos', String(report.tripulante_pos));
      body.set('aprovado', String(approved));
      body.set('observacoes', reason);
      if (rejectionImage) body.set('anexo_rejeicao', rejectionImage, rejectionImage.name);
      await request(`/api/financeiro/relatorios-despesa-viagem/${encodeURIComponent(report.id)}/aprovacao`, { method: 'POST', body });
      toast.success(approved ? 'Relatório aprovado.' : 'Ajuste solicitado.');
      await loadReports(); return true;
    } catch (error) {
      await loadReports(true); toast.error('Não foi possível registrar decisão.'); return false;
    } finally { inFlightDecision.current = false; setBusyId(null); }
  };

  const selectedReport = reports.find((report) => report.id === selectedId) || null;

  return <MobileLayout hideTabBar={Boolean(selectedReport)}>
    <div className="ios-root">
      {selectedReport ? <ReportReviewScreen key={selectedReport.id} report={selectedReport} accessToken={session?.access_token} onClose={() => setSelectedId(null)} onDecide={decide} busy={busyId === selectedReport.id} /> : <main className="premium-page">
        <header className="premium-nav is-scrolled"><div className="premium-shell premium-nav-inner">
          <div className="premium-nav-start"><button type="button" onClick={() => navigate('/')} className="premium-icon-button ios-press" aria-label="Voltar ao início"><ArrowLeft size={22} /></button></div>
          <span className="premium-nav-title">Financeiro</span>
          <div className="premium-nav-end"><button type="button" disabled={loading} onClick={() => void loadReports()} className="premium-icon-button ios-press" aria-label="Atualizar relatórios"><RefreshCw size={20} className={loading ? 'premium-spin' : ''} /></button></div>
        </div></header>
        <div className="premium-shell">
          <div className="premium-heading"><p className="premium-eyebrow">Share Brasil · Tripulação</p><h1 className="premium-title">Seus relatórios.</h1></div>
          <div className="premium-stats" aria-label="Resumo dos relatórios" style={{ gap: 26, marginBottom: -1, paddingTop: 2, paddingBottom: 2, marginTop: -31 }}>
            <Stat icon={Clock3} label="Pendentes" value={counts.pending} />
            <Stat icon={CheckCircle2} label="Aprovados" value={counts.approved} />
            <Stat icon={CircleDollarSign} label="Pagos" value={counts.paid} />
          </div>
          <div className="premium-segments mb-6" role="group" aria-label="Filtrar relatórios por situação">
            {(['Todos', 'Pendente', 'Aprovado', 'Pago'] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === 'Pendente' ? 'Pendentes' : item === 'Aprovado' ? 'Aprovados' : item === 'Pago' ? 'Pagos' : item}</button>)}
          </div>
          {loadError && <div role="alert" className="premium-notice"><Info size={20} className="mb-2" /><p>{loadError}</p><button type="button" disabled={loading} className="premium-text-button mt-2" onClick={() => void loadReports()}>Tentar novamente</button></div>}
          {loading && reports.length === 0 ? <div role="status" className="premium-empty"><Loader2 size={28} className="premium-spin" /><p>Carregando seus relatórios…</p></div> : !filteredReports.length ? (!loadError && <Empty title="Nenhum relatório por aqui" description={filter === 'Todos' ? 'Seus relatórios aparecerão aqui quando estiverem disponíveis.' : 'Tente selecionar outra situação no filtro acima.'} />) : <>
            <p className="premium-section-title" role="status">{filteredReports.length} {filteredReports.length === 1 ? 'relatório' : 'relatórios'}{loading ? ' · Atualizando…' : ''}</p>
            <div className="premium-card-grid">
              {filteredReports.map((report) => <button key={report.id} type="button" className="premium-report-card ios-press" onClick={() => setSelectedId(report.id)} aria-label={`Abrir ${report.numero_relatorio || 'relatório'}, ${reportLabel(report)}`}>
                <div className="premium-card-top"><span className="premium-card-icon"><Plane size={22} /></span><div className="premium-card-copy"><strong>{report.numero_relatorio || 'Relatório de viagem'}</strong><p>{report.cliente_nome || 'Cliente'} · {report.aeronave_matricula || 'Aeronave'}</p><p>{date(report.data_inicio)} a {date(report.data_fim)}</p></div><ChevronRight size={18} className="c-l3 shrink-0 mt-1" /></div>
                <div className="premium-card-bottom"><span className="premium-money">{currency(report.total_valor ?? parseExpenses(report.despesas).reduce((sum, expense) => sum + amountOf(expense), 0))}</span><Badge report={report} /></div>
              </button>)}
            </div>
          </>}
        </div>
      </main>}
    </div>
  </MobileLayout>;
}
