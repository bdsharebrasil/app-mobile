import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, CheckCircle2, CircleDollarSign, Clock3, ExternalLink,
  Eye, FileImage, FileText, ImagePlus, Info, Loader2, Plane, ReceiptText,
  RefreshCw, ShieldCheck, Trash2, X, XCircle, ChevronRight, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

// --- Componentes de UI Premium ---

const StatCard = ({ icon: Icon, label, value, valueClass = "" }: { icon: any, label: string, value: string | number, valueClass?: string }) => (
  <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm flex-1">
    <div className="text-muted-foreground/50 mb-1">
      <Icon size={20} strokeWidth={2} />
    </div>
    <span className={`text-xl font-bold tracking-tight leading-none ${valueClass || 'text-foreground'}`}>{value}</span>
    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide text-center mt-1">
      {label}
    </span>
  </div>
);

// --- Subcomponente: Tela de Revisão ---

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
  const scrollRef = useRef<HTMLElement | null>(null);

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
      const index = Number(attachment.indice_despesa);
      if (!Number.isFinite(index)) return;
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
    setPreviewLoading(true);
    try {
      const response = await fetch(`${BACKEND}${attachment.url_arquivo}`, {
        headers: { Authorization: `Bearer ${accessToken}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY },
      });
      if (!response.ok) throw new Error('Não foi possível abrir o comprovante.');
      const url = URL.createObjectURL(await response.blob());
      setPreview({ attachment, url });
    } catch (error) { toast.error('Falha ao abrir anexo.'); } finally { setPreviewLoading(false); }
  };

  const confirmDecision = async () => {
    const approvedDecision = decision === 'aprovar';
    if (!approvedDecision && !reason.trim()) { toast.error('Informe o motivo da rejeição.'); return; }
    const saved = await onDecide(report, approvedDecision, reason.trim(), rejectionImage || undefined);
    if (saved) { setDecision(null); setReason(''); setRejectionImage(null); }
  };

  const handleRejectionImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 5 MB.'); return; }
    setRejectionImage(file);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col overflow-hidden">
      
      {/* Overlapping Header nativo iOS-like */}
      <div className="bg-[#0A111F] pt-14 pb-24 px-5 shrink-0 relative">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center -ml-2 text-white active:opacity-70 transition-opacity">
            <ArrowLeft size={22} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Revisão de Despesas</span>
            <span className="text-white font-semibold">{report.numero_relatorio || 'Relatório'}</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        <div className="flex flex-col gap-1 items-center text-center">
          <h2 className="text-white text-2xl font-bold tracking-tight">{currency(totals.total)}</h2>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${approved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : rejected ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
              {status}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 -mt-10 relative z-10" ref={scrollRef}>
        
        {/* Informações Básicas (Grouped List) */}
        <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden divide-y divide-border/40 mb-6">
          <div className="flex justify-between items-center px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Plane size={16} className="text-muted-foreground" />
              <span className="text-[14px] font-medium text-muted-foreground">Voo</span>
            </div>
            <span className="text-[14px] font-semibold text-foreground">{report.numero_voo || '—'}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3.5">
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-muted-foreground" />
              <span className="text-[14px] font-medium text-muted-foreground">Aeronave</span>
            </div>
            <span className="text-[14px] font-semibold text-foreground">{report.aeronave_matricula || '—'}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-[14px] font-medium text-muted-foreground">Período</span>
            </div>
            <span className="text-[14px] font-semibold text-foreground">{date(report.data_inicio)} a {date(report.data_fim)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3.5">
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-muted-foreground" />
              <span className="text-[14px] font-medium text-muted-foreground">Tripulante</span>
            </div>
            <span className="text-[14px] font-semibold text-foreground">{report.tripulante_pos === 1 ? report.nome_tripulante || 'Tripulante 1' : report.nome_tripulante_2 || 'Tripulante 2'}</span>
          </div>
          {report.observacoes && (
            <div className="px-4 py-3.5 flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-foreground">Observações</span>
              <p className="text-[13px] text-muted-foreground">{report.observacoes}</p>
            </div>
          )}
        </div>

        {/* Segmented Control Abas */}
        <div className="flex w-full overflow-x-auto no-scrollbar bg-muted/40 p-1 rounded-[14px] mb-5 shadow-inner snap-x">
          {(['total', ...availableGroups] as ExpenseGroup[]).map((item) => (
            <button key={item} onClick={() => setGroup(item)} className={`snap-center shrink-0 flex flex-col items-center justify-center rounded-[10px] py-2 px-4 transition-all min-w-[100px] ${group === item ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wider mb-0.5">{groupLabel(item)}</span>
              <span className={`text-[15px] font-bold ${group === item ? (item === 'tripulante' ? 'text-emerald-500' : 'text-primary') : ''}`}>{currency(totals[item])}</span>
            </button>
          ))}
        </div>

        {/* Lista de Despesas (Grouped List) */}
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Despesas do Grupo: {groupLabel(group)}
          </h3>
          <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden divide-y divide-border/40">
            {selectedExpenses.length > 0 ? (
              selectedExpenseRows.map(({ expense, index }) => {
                const linkedAttachments = attachmentsByExpense.get(index) || [];
                return (
                  <div key={index} className="p-4 flex flex-col gap-3 group active:bg-muted/20 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 items-center mb-1">
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">{expenseCategory(expense)}</span>
                          {expense.data && <span className="text-[10px] text-muted-foreground">{date(expense.data)}</span>}
                        </div>
                        <p className="text-[15px] font-semibold text-foreground leading-snug">{expenseDescription(expense)}</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">Pago por: {payerLabel(expense)}</p>
                      </div>
                      <span className="text-[15px] font-bold text-foreground">{currency(amountOf(expense))}</span>
                    </div>
                    
                    {(linkedAttachments.length > 0 || expense.comprovante_url) && (
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pt-2">
                        {linkedAttachments.map((attachment) => (
                          <button key={attachment.id} onClick={() => openAttachment(attachment)} className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-xl px-3 py-2 text-[12px] font-medium text-foreground shrink-0 active:opacity-70">
                            {String(attachment.tipo_arquivo || '').startsWith('image/') ? <FileImage size={14} className="text-primary" /> : <FileText size={14} />}
                            <span className="max-w-[120px] truncate">{attachment.nome_arquivo || 'Comprovante'}</span>
                          </button>
                        ))}
                        {linkedAttachments.length === 0 && expense.comprovante_url && (
                          <a href={expense.comprovante_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-xl px-3 py-2 text-[12px] font-medium text-primary shrink-0 active:opacity-70">
                            <Eye size={14} /> Abrir anexo
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm font-medium">Nenhuma despesa neste grupo.</div>
            )}
          </div>
        </div>

        {/* Histórico de Ajustes */}
        {adjustmentRequests.length > 0 && (
          <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden mb-6">
            <AccordionItem value="history" className="border-0">
              <AccordionTrigger className="px-4 py-4 hover:no-underline text-[14px] font-semibold text-foreground">
                <div className="flex gap-2 items-center text-rose-500">
                  <Info size={16} /> Histórico de Ajustes ({adjustmentRequests.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 divide-y divide-border/40">
                {[...adjustmentRequests].reverse().map((req, i) => (
                  <div key={req.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {req.criado_em ? date(req.criado_em) : `Ajuste ${adjustmentRequests.length - i}`}
                    </p>
                    <p className="text-[13px] text-foreground leading-relaxed">{req.motivo}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

      {/* Floating Bottom Bar Actions */}
      <div className="fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur-xl border-t border-border/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-40">
        {canDecide ? (
          <div className="flex gap-3 max-w-4xl mx-auto">
            {!canRetryApprovalSync && (
              <Button disabled={busy} variant="outline" onClick={() => { setDecision('rejeitar'); setReason(''); setRejectionImage(null); }} className="flex-1 h-12 rounded-xl border-rose-500/20 text-rose-500 hover:bg-rose-500/10 font-semibold text-[15px]">
                Solicitar Ajuste
              </Button>
            )}
            <Button disabled={busy} onClick={() => { setDecision('aprovar'); }} className="flex-1 h-12 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-semibold text-[15px]">
              {canRetryApprovalSync ? 'Tentar novamente' : 'Aprovar Relatório'}
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 py-2 text-muted-foreground font-medium text-[14px]">
            {approved ? <CheckCircle2 size={18} className="text-emerald-500" /> : rejected ? <XCircle size={18} className="text-rose-500" /> : <Clock3 size={18} />}
            {approved ? 'Relatório Aprovado' : rejected ? 'Relatório em Ajuste' : 'Aguardando Revisão'}
          </div>
        )}
      </div>

      {/* Bottom Sheet Modais (Decisão) */}
      {decision && (
        <div className="fixed inset-0 z-[100] flex justify-center items-end bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-t-[32px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-full duration-300 border-t border-border/40">
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {decision === 'aprovar' ? 'Confirmar Aprovação' : 'Solicitar Ajuste'}
            </h2>
            
            {decision === 'aprovar' ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6">
                <p className="text-[14px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {canRetryApprovalSync ? 'Concluir sincronização.' : <>Você está aprovando este relatório e assumindo a responsabilidade pelas despesas vinculadas a você (<strong>{currency(totals.tripulante)}</strong>).</>}
                </p>
              </div>
            ) : (
              <div className="mb-6 space-y-4">
                <p className="text-[13px] text-muted-foreground">Detalhe o que precisa ser corrigido pelo usuário neste relatório.</p>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva o motivo do ajuste..." className="bg-background/50 border-border/60 rounded-xl h-28 text-[14px] p-3 resize-none" />
                
                <input ref={rejectionImageInput} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleRejectionImage} />
                {!rejectionImage ? (
                  <Button variant="outline" onClick={() => rejectionImageInput.current?.click()} className="w-full h-12 rounded-xl border-dashed border-border/60 text-muted-foreground font-semibold">
                    <ImagePlus size={16} className="mr-2" /> Anexar imagem (Opcional)
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 bg-muted/30 border border-border/40 rounded-xl p-2 pl-3">
                    <span className="flex-1 truncate text-[13px] font-medium text-foreground">{rejectionImage.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => setRejectionImage(null)} className="text-muted-foreground"><Trash2 size={16} /></Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => setDecision(null)} className="flex-1 h-12 rounded-xl font-semibold border-border/60 text-foreground">Cancelar</Button>
              <Button onClick={confirmDecision} disabled={busy || (decision === 'rejeitar' && !reason.trim())} className={`flex-1 h-12 rounded-xl font-semibold text-white ${decision === 'aprovar' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                {busy ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Visualizador de Imagem / Comprovante Modal */}
      {preview && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <p className="text-white text-sm font-semibold truncate max-w-[80%]">{preview.attachment.nome_arquivo}</p>
              <button onClick={() => setPreview(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:scale-95"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-hidden flex items-center justify-center rounded-2xl bg-white/5">
              {previewLoading ? <Loader2 className="animate-spin text-white" size={32} /> : 
                String(preview.attachment.tipo_arquivo || '').startsWith('image/') ? 
                  <img src={preview.url} className="max-w-full max-h-full object-contain rounded-xl" alt="Comprovante" />
                : <iframe src={preview.url} className="w-full h-full bg-white rounded-xl" title="Documento" />
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// --- Main Component: Relatório Viagem ---

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
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY, ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...init?.headers, },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Não foi possível concluir a solicitação.');
    return data;
  }, [session?.access_token]);

  const loadReports = useCallback(async (silent = false) => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await request(endpoint);
      setReports(Array.isArray(data.relatorios) ? data.relatorios : []);
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : 'Erro ao carregar relatórios.');
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
    } finally { setBusyId(null); }
  };

  const selectedReport = reports.find((report) => report.id === selectedId) || null;

  return (
    <MobileLayout hideTabBar={Boolean(selectedReport)}>
      {selectedReport ? (
        <ReportReviewScreen key={selectedReport.id} report={selectedReport} accessToken={session?.access_token} onClose={() => setSelectedId(null)} onDecide={decide} busy={busyId === selectedReport.id} />
      ) : (
        <div className="flex flex-col min-h-screen bg-background pb-24">
          
          {/* Overlapping Header nativo */}
          <div className="bg-[#0A111F] pt-14 pb-20 px-5 relative shrink-0">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center -ml-2 text-white active:opacity-70">
                <ArrowLeft size={22} />
              </button>
              <h1 className="text-white text-lg font-bold tracking-tight">Despesas de Viagem</h1>
              <button onClick={() => loadReports()} className="w-10 h-10 flex items-center justify-center -mr-2 text-white active:opacity-70">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className="text-white/60 text-[14px] text-center max-w-[280px] mx-auto leading-relaxed">
              Acompanhe aprovações e o status de pagamento dos seus relatórios.
            </p>
          </div>

          {/* Stats Flutuantes */}
          <div className="px-5 -mt-8 relative z-10">
            <div className="flex gap-3">
              <StatCard icon={Clock3} label="Pendentes" value={counts.pending} valueClass="text-amber-500" />
              <StatCard icon={CheckCircle2} label="Aprovados" value={counts.approved} valueClass="text-emerald-500" />
              <StatCard icon={CircleDollarSign} label="Pagos" value={counts.paid} valueClass="text-primary" />
            </div>
          </div>

          <div className="px-5 mt-6 space-y-4">
            {/* Segmented Control Nativel-like */}
            <div className="flex bg-muted/40 p-1 rounded-[14px] shadow-inner mb-2 w-full overflow-x-auto no-scrollbar">
              {(['Todos', 'Pendente', 'Aprovado', 'Pago'] as const).map((item) => (
                <button 
                  key={item} onClick={() => setFilter(item)}
                  className={`flex-1 min-w-[80px] rounded-[10px] py-2 text-[13px] font-semibold transition-all ${filter === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {item}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
            ) : filteredReports.length === 0 ? (
              <div className="py-12 bg-card rounded-2xl border border-border/40 text-center flex flex-col items-center shadow-sm">
                <ReceiptText size={32} className="text-muted-foreground/30 mb-3" />
                <p className="text-[14px] font-medium text-muted-foreground">Nenhum relatório encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => {
                  const pending = isPending(report);
                  const paid = report.pagamento_status === 'PAGO';
                  const needsFix = report.status === 'ajuste_necessario';
                  
                  return (
                    <div key={report.id} onClick={() => setSelectedId(report.id)} className="bg-card rounded-2xl border border-border/40 p-4 shadow-sm active:bg-muted/20 transition-colors flex flex-col cursor-pointer">
                      <div className="flex gap-4">
                        <div className={`mt-0.5 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${paid ? 'bg-primary/10 text-primary' : pending ? 'bg-amber-500/10 text-amber-500' : needsFix ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {paid ? <CircleDollarSign size={20} /> : pending ? <Clock3 size={20} /> : needsFix ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h2 className="text-[15px] font-bold text-foreground truncate mr-2">{report.numero_relatorio || 'Relatório'}</h2>
                            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-[13px] text-muted-foreground truncate">{report.cliente_nome || 'Cliente'} · {report.aeronave_matricula}</p>
                          <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wide mt-1 font-semibold">{date(report.data_inicio)} a {date(report.data_fim)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                        <span className="text-[15px] font-bold text-foreground">{currency(report.total_valor)}</span>
                        <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${paid ? 'bg-primary/10 text-primary' : pending ? 'bg-amber-500/10 text-amber-500' : needsFix ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {reportLabel(report)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
