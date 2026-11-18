import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, FileText, Plane, RefreshCw, Loader2, Wallet } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import '@/components/mobile/premium-mobile.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SalaryPayment {
  id: string;
  created_at: string | null;
  data_pagamento: string | null;
  base_salary_holerite: number | null;
  horas_voo: string | null;
  ferias: number | null;
  decimo_terceiro_parcela1: number | null;
  decimo_terceiro_parcela2: number | null;
  benefit: string | null;
  banco: string | null;
  holerite_url: string | null;
  comprovante_url: string | null;
  obs: string | null;
  obs2: string | null;
}

const currency = (value: number | string | null | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const dateOf = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`) : null;

const monthLabel = (payment: SalaryPayment) => {
  const date = dateOf(payment.data_pagamento) || (payment.created_at ? new Date(payment.created_at) : null);
  return date ? date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Pagamento';
};

export default function FolhaPagamento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const paymentsQuery = useQuery({
    queryKey: ['folha-pagamento', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamento_salario_funcionario')
        .select('*')
        .eq('user_profile', userId)
        .order('data_pagamento', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as SalaryPayment[];
    },
  });

  const payments = paymentsQuery.data ?? [];
  const latest = payments[0];
  const totalBase = useMemo(() => payments.reduce((sum, payment) => sum + Number(payment.base_salary_holerite || 0), 0), [payments]);

  return <MobileLayout>
    <div className="ios-root">
      <main className="premium-page">
        <header className="premium-nav is-scrolled"><div className="premium-shell premium-nav-inner">
          <div className="premium-nav-start"><button type="button" onClick={() => navigate('/')} className="premium-icon-button ios-press" aria-label="Voltar ao início"><ArrowLeft size={22} /></button></div>
          <span className="premium-nav-title">Financeiro</span>
          <div className="premium-nav-end"><button type="button" disabled={paymentsQuery.isFetching} onClick={() => void paymentsQuery.refetch()} className="premium-icon-button ios-press" aria-label="Atualizar folha de pagamento"><RefreshCw size={20} className={paymentsQuery.isFetching ? 'premium-spin' : ''} /></button></div>
        </div></header>

        <div className="premium-shell">
          <div className="premium-heading"><p className="premium-eyebrow">Share Brasil · Tripulação</p><h1 className="premium-title">Folha de pagamento</h1></div>

          <div className="premium-card-grid mb-6">
            <button type="button" className="premium-report-card ios-press" onClick={() => navigate('/financeiro/relatorios-viagem')}>
              <div className="premium-card-top">
                <span className="premium-card-icon"><Plane size={22} /></span>
                <div className="premium-card-copy"><strong>Reembolsos de viagem</strong><p>Relatórios de despesas de voo</p></div>
                <ChevronRight size={18} className="c-l3 shrink-0 mt-1" />
              </div>
            </button>
          </div>

          {paymentsQuery.isError && <div role="alert" className="premium-notice"><p>Não foi possível carregar sua folha de pagamento.</p><button type="button" className="premium-text-button mt-2" onClick={() => void paymentsQuery.refetch()}>Tentar novamente</button></div>}

          {paymentsQuery.isLoading ? <div role="status" className="premium-empty"><Loader2 size={28} className="premium-spin" /><p>Carregando sua folha…</p></div>
            : !payments.length ? <div className="premium-empty"><Wallet size={28} /><p>Nenhum pagamento registrado até o momento.</p></div>
            : <>
              {latest && <div className="premium-stats mb-6" aria-label="Resumo da folha">
                <div><p className="premium-section-title">Último pagamento</p><p className="premium-money">{monthLabel(latest)}</p></div>
                <div><p className="premium-section-title">Salário base acumulado</p><p className="premium-money">{currency(totalBase)}</p></div>
              </div>}

              <p className="premium-section-title" role="status">{payments.length} {payments.length === 1 ? 'pagamento' : 'pagamentos'}</p>
              <div className="premium-card-grid">
                {payments.map((payment) => <article key={payment.id} className="premium-report-card">
                  <div className="premium-card-top">
                    <span className="premium-card-icon"><Wallet size={22} /></span>
                    <div className="premium-card-copy">
                      <strong className="capitalize">{monthLabel(payment)}</strong>
                      {payment.banco && <p>{payment.banco}</p>}
                      {payment.horas_voo && <p>Horas voadas: {payment.horas_voo}h</p>}
                    </div>
                  </div>
                  <dl className="premium-card-bottom flex-wrap gap-x-6 gap-y-2">
                    {payment.base_salary_holerite != null && <div><dt>Salário base</dt><dd className="premium-money">{currency(payment.base_salary_holerite)}</dd></div>}
                    {payment.ferias != null && <div><dt>Férias</dt><dd className="premium-money">{currency(payment.ferias)}</dd></div>}
                    {payment.decimo_terceiro_parcela1 != null && <div><dt>13º 1ª parcela</dt><dd className="premium-money">{currency(payment.decimo_terceiro_parcela1)}</dd></div>}
                    {payment.decimo_terceiro_parcela2 != null && <div><dt>13º 2ª parcela</dt><dd className="premium-money">{currency(payment.decimo_terceiro_parcela2)}</dd></div>}
                    {payment.benefit && <div><dt>Benefícios</dt><dd>{payment.benefit}</dd></div>}
                  </dl>
                  {(payment.holerite_url || payment.comprovante_url) && <div className="flex gap-3 pt-2">
                    {payment.holerite_url && <a href={payment.holerite_url} target="_blank" rel="noreferrer" className="premium-text-button inline-flex items-center gap-1"><FileText size={16} />Holerite</a>}
                    {payment.comprovante_url && <a href={payment.comprovante_url} target="_blank" rel="noreferrer" className="premium-text-button inline-flex items-center gap-1"><FileText size={16} />Comprovante</a>}
                  </div>}
                  {(payment.obs || payment.obs2) && <p className="text-sm">{[payment.obs, payment.obs2].filter(Boolean).join(' · ')}</p>}
                </article>)}
              </div>
            </>}
        </div>
      </main>
    </div>
  </MobileLayout>;
}
