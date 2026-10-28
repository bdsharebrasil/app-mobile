import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, ElementType, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bed, CalendarDays, Camera, Car, Check, ChevronLeft, ChevronRight, CircleDollarSign,
  CircleEllipsis, Clock3, FileImage, FileText, Fuel, Loader2, Paperclip, Plane, Plus,
  ReceiptText, RefreshCw, Trash2, Upload, User, Utensils, WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { apiClient } from '@/lib/api-client';
import {
  listarRascunhosViagem, lerRascunhoViagem, lerVoosViagem, salvarRascunhoViagem,
  salvarVoosViagem, type AnexoPendenteViagem, type AnexoViagemLocal,
  type DespesaViagemLocal, type RegistroRelatorioViagem, type RelatorioViagemLocal,
  type VooRelatorioLocal,
} from '@/lib/rascunhoDespesasViagem';

/* ───────────────────────── Constantes e utilitários ───────────────────────── */

const raiz = '/api/financeiro/relatorios-despesa-viagem';

const categorias: Array<{ valor: string; Icone: ElementType; cor: string }> = [
  { valor: 'Alimentação', Icone: Utensils, cor: '#FF9F0A' },
  { valor: 'Hospedagem', Icone: Bed, cor: '#BF5AF2' },
  { valor: 'Transporte', Icone: Car, cor: '#0A84FF' },
  { valor: 'Combustível', Icone: Fuel, cor: '#FF453A' },
  { valor: 'Outros', Icone: CircleEllipsis, cor: '#8E8E93' },
];

const moeda = (valor: number | string | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
const dataHoje = () => { const data = new Date(); return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`; };
const dataVisivel = (valor?: string | null) => valor ? new Date(`${valor.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const haptico = (ms: number | number[] = 10) => { try { navigator.vibrate?.(ms); } catch { /* sem suporte */ } };

const despesasDaLista = (valor: RelatorioViagemLocal['despesas'], relatorioId = 'relatorio'): DespesaViagemLocal[] => {
  let lista: unknown = valor;
  if (typeof valor === 'string') {
    try { lista = JSON.parse(valor); } catch { return []; }
  }
  if (!Array.isArray(lista)) return [];
  return lista.filter((item) => item && typeof item === 'object').map((item, indice) => ({
    ...item,
    id: String(item.id || `${relatorioId}-despesa-${indice}`),
  })) as DespesaViagemLocal[];
};
const categoriaNormalizada = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const categoriaDe = (nome: string) => categorias.find((item) => categoriaNormalizada(item.valor) === categoriaNormalizada(nome)) || categorias[categorias.length - 1];
const pagadorNome = (pagador: string, relatorio: RelatorioViagemLocal) => {
  if (pagador === 'cliente') return 'Cliente';
  if (pagador === 'sharebrasil') return 'Share Brasil';
  if (pagador === 'tripulante_1') return relatorio.nome_tripulante || 'Tripulante 1';
  if (pagador === 'tripulante_2') return relatorio.nome_tripulante_2 || 'Tripulante 2';
  return 'Tripulante';
};
const posicaoPaga = (pagador: string, posicao: 1 | 2) => pagador === `tripulante_${posicao}`;
const despesasEmOrdem = (relatorio: RelatorioViagemLocal) => despesasDaLista(relatorio.despesas, relatorio.id)
  .map((despesa, indice) => ({ despesa, indice }))
  .sort((a, b) => b.despesa.data.localeCompare(a.despesa.data));
const urlArquivoTripulante = (relatorioId: string, anexoId: string) => `${raiz}/${encodeURIComponent(relatorioId)}/anexos-tripulante/${encodeURIComponent(anexoId)}/arquivo`;

const statusInfo = (status?: string | null): { rotulo: string; cor: string } => {
  switch (status) {
    case undefined: case null: case '': return { rotulo: 'Sem relatório', cor: '#8E8E93' };
    case 'rascunho': return { rotulo: 'Em andamento', cor: '#0A84FF' };
    case 'aguardando_aprovacao': return { rotulo: 'Aguardando', cor: '#FF9F0A' };
    case 'ajuste_concluido': return { rotulo: 'Ajuste concluído', cor: '#FF9F0A' };
    case 'ajuste_necessario': return { rotulo: 'Ajuste necessário', cor: '#FF453A' };
    default: { const texto = status.replace(/_/g, ' '); return { rotulo: texto.charAt(0).toUpperCase() + texto.slice(1), cor: '#30D158' }; }
  }
};

function totaisDoRelatorio(despesas: DespesaViagemLocal[], posicao: 1 | 2) {
  const totais = { geral: 0, eu: 0, outro: 0, cliente: 0, share: 0 };
  despesas.forEach((despesa) => {
    const valor = Math.round(Number(despesa.valor || 0) * 100) / 100;
    totais.geral += valor;
    if (posicaoPaga(despesa.pago_por, posicao)) totais.eu += valor;
    else if (despesa.pago_por === 'tripulante_1' || despesa.pago_por === 'tripulante_2') totais.outro += valor;
    else if (despesa.pago_por === 'cliente') totais.cliente += valor;
    else if (despesa.pago_por === 'sharebrasil') totais.share += valor;
  });
  return totais;
}

function novoId(): string {
  return globalThis.crypto?.randomUUID?.() || `despesa-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function comprimirComprovante(arquivo: File): Promise<File> {
  if (arquivo.type === 'application/pdf') return arquivo;
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha uma imagem ou um arquivo PDF.');
  const imagem = await createImageBitmap(arquivo).catch(() => null);
  if (!imagem) throw new Error('Não foi possível abrir esta imagem. Escolha outro arquivo.');
  const escala = Math.min(1, 1600 / Math.max(imagem.width, imagem.height));
  const largura = Math.max(1, Math.round(imagem.width * escala));
  const altura = Math.max(1, Math.round(imagem.height * escala));
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext('2d');
  if (!contexto) throw new Error('Não foi possível preparar a imagem.');
  contexto.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  const blob = await new Promise<Blob | null>((resolver) => tela.toBlob(resolver, 'image/jpeg', 0.72));
  if (!blob) throw new Error('Não foi possível comprimir a imagem.');
  const nome = arquivo.name.replace(/\.[^.]+$/, '') || 'comprovante';
  return new File([blob], `${nome}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

function formatarValorDigitado(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (!digitos) return '';
  return (Number(digitos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function valorDigitadoEmReais(valor: string) {
  const digitos = valor.replace(/\D/g, '');
  return digitos ? Number(digitos) / 100 : 0;
}

/* ───────────────────────── Sistema visual (estilo iOS) ─────────────────────────
   Todas as cores/raios ficam em variáveis CSS. Para trocar o tema, mude só aqui. */

const estilosGlobais = `
.ios-root{--tint:#0A84FF;--ok:#30D158;--warn:#FF9F0A;--bad:#FF453A;--bg:#000;--card:#1C1C1E;--sheet:#1C1C1E;
  --sep:rgba(84,84,88,.55);--l1:#fff;--l2:rgba(235,235,245,.6);--l3:rgba(235,235,245,.3);--fill:rgba(118,118,128,.24);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;
  color:var(--l1);background:var(--bg);letter-spacing:-.01em}
.ios-root button,.ios-root [role=tab]{touch-action:manipulation;font-family:inherit}
.ios-root input,.ios-root textarea{font-size:17px;font-family:inherit;color:inherit;outline:none;border-radius:0;letter-spacing:-.01em}
.ios-root input:not([type=date]),.ios-root textarea{-webkit-appearance:none;appearance:none}
.ios-root ::placeholder{color:var(--l3)}
.c-l1{color:var(--l1)}.c-l2{color:var(--l2)}.c-l3{color:var(--l3)}.c-tint{color:var(--tint)}.c-bad{color:var(--bad)}.c-ok{color:var(--ok)}
.bg-c{background:var(--card)}.bg-tint{background:var(--tint)}.bg-fill{background:var(--fill)}
.ios-lista>*+*{border-top:.5px solid var(--sep)}
.ios-press{transition:transform .18s cubic-bezier(.32,.72,0,1),opacity .18s ease}
.ios-press:active{transform:scale(.97);opacity:.85}
.ios-row{transition:background .15s ease}
.ios-row:active{background:rgba(255,255,255,.07)}
@keyframes ios-sheet-in{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes ios-fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.ios-root *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;

const EASE = 'cubic-bezier(.32,.72,0,1)';

function useRolou(limite = 36) {
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > limite);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, [limite]);
  return rolou;
}

function IconeApp({ Icone, cor, tamanho = 30 }: { Icone: ElementType; cor: string; tamanho?: number }) {
  return <span className="flex shrink-0 items-center justify-center" style={{ width: tamanho, height: tamanho, background: cor, borderRadius: tamanho * 0.28 }}>
    <Icone className="text-white" style={{ width: tamanho * 0.58, height: tamanho * 0.58 }} strokeWidth={2.2} />
  </span>;
}

function Selo({ status }: { status?: string | null }) {
  const { rotulo, cor } = statusInfo(status);
  return <span className="shrink-0 rounded-full px-2 py-[3px] text-[11px] font-semibold" style={{ color: cor, background: `${cor}26` }}>{rotulo}</span>;
}

function Grupo({ titulo, rodape, children }: { titulo?: string; rodape?: ReactNode; children: ReactNode }) {
  return <section className="mb-6">
    {titulo && <h3 className="c-l2 px-4 pb-1.5 text-[13px] uppercase tracking-wide">{titulo}</h3>}
    <div className="bg-c ios-lista overflow-hidden rounded-[12px]">{children}</div>
    {rodape && <p className="c-l2 px-4 pt-1.5 text-[13px] leading-snug">{rodape}</p>}
  </section>;
}

function LinhaValor({ rotulo, valor, cor }: { rotulo: string; valor: ReactNode; cor?: string }) {
  return <div className="flex min-h-[44px] items-center justify-between gap-4 px-4 py-2">
    <span className="flex min-w-0 items-center gap-2.5 text-[17px]">
      {cor && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor }} />}
      <span className="truncate">{rotulo}</span>
    </span>
    <span className="c-l2 max-w-[55%] truncate text-right text-[17px] tabular-nums">{valor}</span>
  </div>;
}

function BotaoCirculo({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={rotulo} onClick={onClick} className="ios-press bg-fill c-tint flex h-[34px] w-[34px] items-center justify-center rounded-full">{children}</button>;
}

function BarraNavegacao({ rolou, titulo, esquerda, direita }: { rolou: boolean; titulo: string; esquerda?: ReactNode; direita?: ReactNode }) {
  return <header className="sticky top-0 z-30" style={{
    paddingTop: 'env(safe-area-inset-top)',
    background: rolou ? 'rgba(0,0,0,.72)' : 'transparent',
    backdropFilter: rolou ? 'saturate(180%) blur(22px)' : 'none',
    WebkitBackdropFilter: rolou ? 'saturate(180%) blur(22px)' : 'none',
    borderBottom: `.5px solid ${rolou ? 'var(--sep)' : 'transparent'}`,
    transition: 'background .2s ease, border-color .2s ease',
  }}>
    <div className="mx-auto grid h-11 max-w-xl grid-cols-[1fr_auto_1fr] items-center px-4">
      <div className="flex justify-start">{esquerda}</div>
      <h1 className="max-w-[48vw] truncate text-[17px] font-semibold" style={{ opacity: rolou ? 1 : 0, transition: 'opacity .2s ease' }}>{titulo}</h1>
      <div className="flex justify-end">{direita}</div>
    </div>
  </header>;
}

function Segmentado<T extends string>({ opcoes, valor, aoMudar }: { opcoes: Array<{ valor: T; rotulo: string }>; valor: T; aoMudar: (valor: T) => void }) {
  const indice = Math.max(0, opcoes.findIndex((item) => item.valor === valor));
  return <div role="tablist" className="bg-fill relative flex rounded-[9px] p-[2px]">
    <span aria-hidden className="absolute bottom-[2px] left-[2px] top-[2px] rounded-[7px] bg-[#636366] shadow-md" style={{ width: `calc((100% - 4px) / ${opcoes.length})`, transform: `translateX(${indice * 100}%)`, transition: `transform .32s ${EASE}` }} />
    {opcoes.map((item) => <button key={item.valor} type="button" role="tab" aria-selected={item.valor === valor} onClick={() => { haptico(6); aoMudar(item.valor); }} className="relative z-10 min-h-[32px] flex-1 px-2 text-[13px] font-semibold">{item.rotulo}</button>)}
  </div>;
}

function Vazio({ Icone, titulo, texto }: { Icone: ElementType; titulo: string; texto?: string }) {
  return <div className="px-6 py-14 text-center">
    <Icone className="c-l3 mx-auto mb-3 h-10 w-10" strokeWidth={1.6} />
    <p className="text-[17px] font-semibold">{titulo}</p>
    {texto && <p className="c-l2 mt-1 text-[15px]">{texto}</p>}
  </div>;
}

/* Folha modal (sheet) com arraste para fechar */
function Folha({ titulo, rotuloEsquerda = 'Cancelar', acaoDireita, aoFechar, children }: {
  titulo: string;
  rotuloEsquerda?: string | null;
  acaoDireita?: { rotulo: string; onClick: (fechar: () => void) => void; desabilitado?: boolean; carregando?: boolean };
  aoFechar: () => void;
  children: ReactNode;
}) {
  const [saindo, setSaindo] = useState(false);
  const [arraste, setArraste] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const inicioY = useRef(0);

  const fechar = useCallback(() => {
    if (saindo) return;
    setSaindo(true);
    window.setTimeout(aoFechar, 280);
  }, [aoFechar, saindo]);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => { if (evento.key === 'Escape') fechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [fechar]);

  return <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={titulo}>
    <div className="absolute inset-0 bg-black/50" onClick={fechar} style={{ animation: 'ios-fade .3s ease', opacity: saindo ? 0 : 1, transition: 'opacity .28s ease' }} />
    <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col overflow-hidden rounded-t-[14px]" style={{
      height: 'calc(100dvh - env(safe-area-inset-top) - 12px)',
      background: 'var(--sheet)',
      '--card': '#2C2C2E',
      transform: saindo ? 'translateY(100%)' : `translateY(${arraste}px)`,
      transition: arrastando ? 'none' : `transform .3s ${EASE}`,
      animation: `ios-sheet-in .45s ${EASE}`,
    } as CSSProperties}>
      <div className="shrink-0" onTouchStart={(evento) => { inicioY.current = evento.touches[0].clientY; setArrastando(true); }}
        onTouchMove={(evento) => setArraste(Math.max(0, evento.touches[0].clientY - inicioY.current))}
        onTouchEnd={() => { setArrastando(false); if (arraste > 110) fechar(); else setArraste(0); }}>
        <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-white/25" />
        <div className="grid h-[52px] grid-cols-[1fr_auto_1fr] items-center px-4">
          {rotuloEsquerda ? <button type="button" onClick={fechar} className="c-tint h-11 justify-self-start pr-3 text-[17px]">{rotuloEsquerda}</button> : <span />}
          <h2 className="max-w-[46vw] truncate text-[17px] font-semibold">{titulo}</h2>
          {acaoDireita ? <button type="button" disabled={acaoDireita.desabilitado || acaoDireita.carregando} onClick={() => acaoDireita.onClick(fechar)} className="c-tint flex h-11 items-center justify-self-end pl-3 text-[17px] font-semibold disabled:opacity-40">
            {acaoDireita.carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : acaoDireita.rotulo}
          </button> : <span />}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {children}
      </div>
    </div>
  </div>;
}

/* Action sheet estilo iOS (confirmações e seletores) */
function FolhaAcoes({ titulo, mensagem, opcoes, aoCancelar }: {
  titulo?: string; mensagem?: string;
  opcoes: Array<{ rotulo: string; destrutivo?: boolean; selecionado?: boolean; onClick: () => void }>;
  aoCancelar: () => void;
}) {
  return <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={titulo || 'Opções'}>
    <div className="absolute inset-0 bg-black/40" onClick={aoCancelar} style={{ animation: 'ios-fade .25s ease' }} />
    <div className="absolute inset-x-0 bottom-0 mx-auto max-w-xl px-2" style={{ animation: `ios-sheet-in .38s ${EASE}`, paddingBottom: 'max(.5rem, env(safe-area-inset-bottom))' }}>
      <div className="ios-lista overflow-hidden rounded-[14px] bg-[rgba(44,44,46,.96)]" style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        {(titulo || mensagem) && <div className="px-4 py-3 text-center">
          {titulo && <p className="c-l2 text-[13px] font-semibold">{titulo}</p>}
          {mensagem && <p className="c-l2 text-[13px]">{mensagem}</p>}
        </div>}
        {opcoes.map((opcao) => <button key={opcao.rotulo} type="button" onClick={opcao.onClick} className={`ios-row flex h-[57px] w-full items-center justify-center gap-2 text-[20px] ${opcao.destrutivo ? 'c-bad' : 'c-tint'} ${opcao.selecionado ? 'font-semibold' : ''}`}>
          {opcao.selecionado && <Check className="h-5 w-5" strokeWidth={2.6} />}{opcao.rotulo}
        </button>)}
      </div>
      <button type="button" onClick={aoCancelar} className="c-tint ios-press mt-2 h-[57px] w-full rounded-[14px] bg-[#2C2C2E] text-[20px] font-semibold">Cancelar</button>
    </div>
  </div>;
}

/* Linha com deslizar para excluir */
function LinhaDeslizavel({ habilitado, aoExcluir, children }: { habilitado: boolean; aoExcluir: () => void; children: ReactNode }) {
  const LARGURA = 88;
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const inicio = useRef({ x: 0, y: 0, base: 0 });
  const eixo = useRef<'h' | 'v' | null>(null);

  if (!habilitado) return <>{children}</>;

  const fechar = () => { setAberto(false); setDeslocamento(0); };

  return <div className="relative overflow-hidden">
    <button type="button" onClick={() => { fechar(); aoExcluir(); }} aria-label="Excluir despesa" tabIndex={aberto ? 0 : -1} className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 text-[13px] font-semibold text-white" style={{ width: LARGURA, background: 'var(--bad)' }}>
      <Trash2 className="h-5 w-5" />Excluir
    </button>
    <div className="bg-c relative" style={{ transform: `translateX(${deslocamento}px)`, transition: arrastando ? 'none' : `transform .3s ${EASE}` }}
      onClickCapture={(evento) => { if (aberto) { evento.stopPropagation(); evento.preventDefault(); fechar(); } }}
      onTouchStart={(evento) => { inicio.current = { x: evento.touches[0].clientX, y: evento.touches[0].clientY, base: aberto ? -LARGURA : 0 }; eixo.current = null; }}
      onTouchMove={(evento) => {
        const dx = evento.touches[0].clientX - inicio.current.x;
        const dy = evento.touches[0].clientY - inicio.current.y;
        if (!eixo.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) eixo.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        if (eixo.current !== 'h') return;
        setArrastando(true);
        setDeslocamento(Math.min(0, Math.max(-LARGURA * 1.4, inicio.current.base + dx)));
      }}
      onTouchEnd={() => {
        if (eixo.current === 'h') {
          const abrir = deslocamento < -LARGURA / 2;
          setAberto(abrir);
          setDeslocamento(abrir ? -LARGURA : 0);
          if (abrir) haptico(8);
        }
        setArrastando(false);
        eixo.current = null;
      }}>
      {children}
    </div>
  </div>;
}

/* ───────────────────────── Lista de relatórios ───────────────────────── */

function GrupoRelatorios({ titulo, itens, aoAbrir }: { titulo: string; itens: RelatorioViagemLocal[]; aoAbrir: (relatorio: RelatorioViagemLocal) => void }) {
  if (!itens.length) return null;
  return <Grupo titulo={`${titulo} · ${itens.length}`}>
    {itens.map((relatorio) => <button key={relatorio.id} type="button" onClick={() => aoAbrir(relatorio)} className="ios-row flex w-full items-center gap-3 px-4 py-3 text-left">
      <IconeApp Icone={ReceiptText} cor={statusInfo(relatorio.status).cor} tamanho={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold">{relatorio.numero_relatorio || 'Relatório de despesas'}</span>
        <span className="c-l2 block truncate text-[13px]">{relatorio.numero_voo || 'Voo'} · {relatorio.aeronave_matricula || 'Aeronave'} · {dataVisivel(relatorio.data_inicio)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[15px] font-semibold tabular-nums">{moeda(totaisDoRelatorio(despesasDaLista(relatorio.despesas, relatorio.id), relatorio.tripulante_pos).geral)}</span>
        <Selo status={relatorio.status} />
      </span>
      <ChevronRight className="c-l3 h-4 w-4 shrink-0" strokeWidth={2.6} />
    </button>)}
  </Grupo>;
}

/* ───────────────────────── Formulário de despesa ───────────────────────── */

function FormularioDespesa({
  relatorio, inicial, anexo, aoCancelar, aoSalvar, aoExcluir,
}: {
  relatorio: RelatorioViagemLocal;
  inicial?: DespesaViagemLocal;
  anexo?: AnexoViagemLocal;
  aoCancelar: () => void;
  aoSalvar: (despesa: DespesaViagemLocal, arquivo: File | null, anexoAnterior?: string, adicionarOutra?: boolean) => Promise<void>;
  aoExcluir: (despesa: DespesaViagemLocal) => void;
}) {
  const [categoria, setCategoria] = useState(inicial?.categoria || '');
  const [data, setData] = useState(inicial?.data || dataHoje());
  const [valor, setValor] = useState(inicial ? Number(inicial.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
  const [pagador, setPagador] = useState(inicial?.pago_por || 'eu');
  const [descricao, setDescricao] = useState(inicial?.descricao || '');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previsualizacao, setPrevisualizacao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erroComprovante, setErroComprovante] = useState('');
  const [erroDescricao, setErroDescricao] = useState('');
  const [seletorPagador, setSeletorPagador] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const topoRef = useRef<HTMLDivElement>(null);
  const outraPosicao = relatorio.tripulante_pos === 1 ? 2 : 1;
  const nomeOutro = outraPosicao === 1 ? relatorio.nome_tripulante : relatorio.nome_tripulante_2;
  const anexoAtual = arquivo ? null : anexo;
  const idAnexoAtual = anexoAtual?.id;
  const tipoArquivoAnexo = arquivo?.type || anexoAtual?.tipo_arquivo || '';
  const nomeArquivoAnexo = arquivo?.name || anexoAtual?.nome_arquivo || 'Comprovante anexado';
  const valorNumerico = valorDigitadoEmReais(valor);
  const podeSalvar = Boolean(categoria) && Boolean(data) && valorNumerico > 0 && !carregando;

  const pagadorAtual = pagador === `tripulante_${relatorio.tripulante_pos}` ? 'eu' : pagador;
  const opcoesPagador = [
    { valor: 'eu', rotulo: 'Eu' },
    ...(relatorio.tripulante_id_2 ? [{ valor: `tripulante_${outraPosicao}`, rotulo: nomeOutro || `Tripulante ${outraPosicao}` }] : []),
    { valor: 'cliente', rotulo: 'Cliente' },
    { valor: 'sharebrasil', rotulo: 'Share Brasil' },
  ];
  const rotuloPagador = opcoesPagador.find((item) => item.valor === pagadorAtual)?.rotulo || 'Eu';

  useEffect(() => {
    let cancelado = false;
    let urlTemporaria = '';
    if (arquivo) {
      urlTemporaria = URL.createObjectURL(arquivo);
      setPrevisualizacao(urlTemporaria);
    } else if (idAnexoAtual) {
      apiClient.getBlob(urlArquivoTripulante(relatorio.id, idAnexoAtual)).then((blob) => {
        const urlCarregada = URL.createObjectURL(blob);
        if (cancelado) { URL.revokeObjectURL(urlCarregada); return; }
        urlTemporaria = urlCarregada;
        setPrevisualizacao(urlTemporaria);
      }).catch(() => { if (!cancelado) setPrevisualizacao(''); });
    } else {
      setPrevisualizacao('');
    }
    return () => { cancelado = true; if (urlTemporaria) URL.revokeObjectURL(urlTemporaria); };
  }, [arquivo, idAnexoAtual, relatorio.id]);

  const selecionarArquivo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const selecionado = evento.target.files?.[0];
    evento.target.value = '';
    if (!selecionado) return;
    try {
      const comprimido = await comprimirComprovante(selecionado);
      setArquivo(comprimido);
      setErroComprovante('');
      haptico(8);
    } catch (erro) {
      setErroComprovante(erro instanceof Error ? erro.message : 'Não foi possível preparar o comprovante.');
    }
  };

  const salvar = async (adicionarOutra = false) => {
    if (!podeSalvar) return;
    const descricaoLimpa = descricao.trim();
    if (!descricaoLimpa) { setErroDescricao('A descrição da despesa é obrigatória.'); haptico([30, 40, 30]); return; }
    setCarregando(true);
    try {
      await aoSalvar({
        id: inicial?.id || novoId(), categoria, data, valor: valorNumerico,
        pago_por: pagador === 'eu' ? `tripulante_${relatorio.tripulante_pos}` : pagador,
        descricao: descricaoLimpa,
      }, arquivo, anexo?.id, adicionarOutra);
      if (adicionarOutra) {
        setCategoria(''); setData(dataHoje()); setValor(''); setPagador('eu'); setDescricao(''); setErroDescricao(''); setArquivo(null);
        topoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } finally { setCarregando(false); }
  };

  return <>
    <Folha titulo={inicial ? 'Editar despesa' : 'Nova despesa'} aoFechar={aoCancelar}
      acaoDireita={{ rotulo: 'Salvar', desabilitado: !podeSalvar, carregando, onClick: () => { void salvar(false); } }}>
      <div ref={topoRef} />

      {/* Valor em destaque */}
      <label htmlFor="valor-despesa" className="block pb-6 pt-4 text-center">
        <span className="c-l2 block text-[13px]">Valor da despesa</span>
        <span className="mt-1 flex items-baseline justify-center gap-1.5">
          <span className="c-l2 text-[24px] font-medium">R$</span>
          <input id="valor-despesa" inputMode="numeric" enterKeyHint="done" autoComplete="off" type="text" value={valor} autoFocus={!inicial}
            onChange={(evento) => setValor(formatarValorDigitado(evento.target.value))} placeholder="0,00" aria-label="Valor da despesa em reais"
            className="bg-transparent text-center text-[48px] font-bold tabular-nums tracking-tight" style={{ width: `${Math.max(valor.length, 4) + 0.5}ch`, maxWidth: '70vw' }} />
        </span>
      </label>

      {/* Categoria */}
      <Grupo titulo="Categoria">
        <div className="grid grid-cols-3 gap-2 p-3">
          {categorias.map((item) => {
            const ativo = categoria === item.valor;
            return <button type="button" key={item.valor} aria-pressed={ativo} onClick={() => { setCategoria(item.valor); haptico(8); }}
              className="ios-press flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-[12px] px-1 py-3 text-[13px]"
              style={{ border: `1.5px solid ${ativo ? item.cor : 'transparent'}`, background: ativo ? `${item.cor}22` : 'rgba(255,255,255,.04)' }}>
              <IconeApp Icone={item.Icone} cor={item.cor} tamanho={32} />
              <span className={ativo ? 'font-semibold' : 'c-l2'}>{item.valor}</span>
            </button>;
          })}
        </div>
      </Grupo>

      {/* Data e pagador */}
      <Grupo titulo="Detalhes">
        <label htmlFor="data-despesa" className="flex min-h-[48px] items-center justify-between gap-3 px-4">
          <span className="flex items-center gap-3"><IconeApp Icone={CalendarDays} cor="#FF453A" tamanho={29} /><span className="text-[17px]">Data</span></span>
          <input id="data-despesa" type="date" value={data} onChange={(evento) => setData(evento.target.value)} className="c-tint min-w-0 bg-transparent text-right" style={{ colorScheme: 'dark' }} />
        </label>
        <button type="button" onClick={() => setSeletorPagador(true)} className="ios-row flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left">
          <span className="flex items-center gap-3"><IconeApp Icone={User} cor="#30D158" tamanho={29} /><span className="text-[17px]">Pago por</span></span>
          <span className="c-l2 flex min-w-0 items-center gap-1 text-[17px]"><span className="max-w-[42vw] truncate">{rotuloPagador}</span><ChevronRight className="c-l3 h-4 w-4 shrink-0" strokeWidth={2.6} /></span>
        </button>
      </Grupo>

      {/* Descrição */}
      <Grupo titulo="Descrição" rodape={erroDescricao
        ? <span role="alert" id="erro-descricao-despesa" className="c-bad">{erroDescricao}</span>
        : 'Obrigatória. A data pode ser diferente do período do voo; o financeiro poderá revisar o cabeçalho.'}>
        <div className="px-4 py-3">
          <textarea id="descricao-despesa" required aria-required="true" aria-invalid={Boolean(erroDescricao)} aria-describedby={erroDescricao ? 'erro-descricao-despesa' : undefined}
            value={descricao} onChange={(evento) => { setDescricao(evento.target.value); setErroDescricao(''); }} maxLength={500} rows={3}
            placeholder="Ex.: refeição da tripulação" className="w-full resize-none bg-transparent leading-snug" />
          <p className="c-l3 text-right text-[12px] tabular-nums">{descricao.length}/500</p>
        </div>
      </Grupo>

      {/* Comprovante */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(evento) => void selecionarArquivo(evento)} />
      <input ref={arquivoRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(evento) => void selecionarArquivo(evento)} />
      <Grupo titulo="Comprovante" rodape={erroComprovante ? <span role="alert" className="c-bad">{erroComprovante}</span> : 'Foto, imagem da galeria ou PDF.'}>
        <button type="button" onClick={() => cameraRef.current?.click()} className="ios-row flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left">
          <span className="flex items-center gap-3"><IconeApp Icone={Camera} cor="#0A84FF" tamanho={29} /><span className="text-[17px]">Tirar foto</span></span>
          <ChevronRight className="c-l3 h-4 w-4" strokeWidth={2.6} />
        </button>
        <button type="button" onClick={() => arquivoRef.current?.click()} className="ios-row flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left">
          <span className="flex items-center gap-3"><IconeApp Icone={Upload} cor="#5E5CE6" tamanho={29} /><span className="text-[17px]">Galeria ou arquivo</span></span>
          <ChevronRight className="c-l3 h-4 w-4" strokeWidth={2.6} />
        </button>
        {(arquivo || anexoAtual) && <div className="p-3">
          <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-[10px] bg-black/30">
            {previsualizacao && tipoArquivoAnexo.startsWith('image/') ? <img src={previsualizacao} alt="Prévia da imagem do comprovante" className="max-h-64 w-full object-contain" />
              : previsualizacao && tipoArquivoAnexo === 'application/pdf' ? <iframe src={previsualizacao} title="Prévia do comprovante em PDF" className="h-56 w-full bg-white" />
                : <div className="c-l2 flex flex-col items-center gap-2 py-6">{tipoArquivoAnexo === 'application/pdf' ? <FileText className="h-8 w-8" /> : <FileImage className="h-8 w-8" />}<span className="text-[13px]">Carregando prévia…</span></div>}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="c-l2 min-w-0 flex-1 truncate text-[13px]">{nomeArquivoAnexo}</span>
            {arquivo && <button type="button" onClick={() => setArquivo(null)} aria-label="Remover comprovante selecionado" className="c-bad h-9 shrink-0 px-1 text-[15px]">Remover</button>}
          </div>
        </div>}
      </Grupo>

      {!inicial && <Grupo>
        <button type="button" disabled={!podeSalvar} onClick={() => void salvar(true)} className="ios-row c-tint h-[50px] w-full text-[17px] disabled:opacity-40">Salvar e adicionar outra</button>
      </Grupo>}

      {inicial && <Grupo>
        <button type="button" onClick={() => aoExcluir(inicial)} className="ios-row c-bad h-[50px] w-full text-[17px]">Excluir despesa</button>
      </Grupo>}
    </Folha>

    {seletorPagador && <FolhaAcoes titulo="Pago por"
      opcoes={opcoesPagador.map((item) => ({ rotulo: item.rotulo, selecionado: item.valor === pagadorAtual, onClick: () => { setPagador(item.valor); setSeletorPagador(false); haptico(8); } }))}
      aoCancelar={() => setSeletorPagador(false)} />}
  </>;
}

/* ───────────────────────── Tela principal ───────────────────────── */

export default function DespesasViagem() {
  const navegar = useNavigate();
  const localizacao = useLocation();
  const [voos, setVoos] = useState<VooRelatorioLocal[]>([]);
  const [relatorios, setRelatorios] = useState<RelatorioViagemLocal[]>([]);
  const [relatoriosPendentes, setRelatoriosPendentes] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [avisoOffline, setAvisoOffline] = useState(!navigator.onLine);
  const [relatorioAtual, setRelatorioAtual] = useState<RelatorioViagemLocal | null>(null);
  const [formulario, setFormulario] = useState<{ despesa?: DespesaViagemLocal; anexo?: AnexoViagemLocal } | null>(null);
  const [sincronizando, setSincronizando] = useState<Set<string>>(new Set());
  const [aba, setAba] = useState<'voos' | 'relatorios'>('voos');
  const [excluindo, setExcluindo] = useState<DespesaViagemLocal | null>(null);
  const [visualizador, setVisualizador] = useState<{ url: string; tipo: string; nome: string } | null>(null);
  const [abrindoAnexo, setAbrindoAnexo] = useState('');
  const registrosRef = useRef(new Set<string>());
  const aberturaAutomatica = useRef(false);
  const rolou = useRolou();

  const mostrarRelatorios = useCallback((servidor: RelatorioViagemLocal[], locais: RegistroRelatorioViagem[]) => {
    const porId = new Map(locais.map((registro) => [registro.relatorio.id, registro]));
    setRelatoriosPendentes(new Set(locais.filter((registro) => registro.despesasPendentes || registro.anexosPendentes.length).map((registro) => registro.relatorio.id)));
    const combinados = servidor.map((relatorio) => {
      const local = porId.get(relatorio.id);
      if (!local) return { ...relatorio, despesas: despesasDaLista(relatorio.despesas, relatorio.id) };
      const atual = { ...local.relatorio, ...relatorio, anexos: relatorio.anexos || local.relatorio.anexos,
        despesas: local.despesasPendentes ? local.despesas : despesasDaLista(relatorio.despesas, relatorio.id) };
      const registro = { ...local, relatorio: atual, despesas: despesasDaLista(atual.despesas, atual.id) };
      void salvarRascunhoViagem(registro).catch(() => undefined);
      return atual;
    });
    for (const local of locais) if (!combinados.some((relatorio) => relatorio.id === local.relatorio.id)) combinados.push({ ...local.relatorio, despesas: local.despesas });
    setRelatorios(combinados);
    return combinados;
  }, []);

  const carregarDados = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    else setAtualizando(true);
    try {
      const [respostaVoos, respostaRelatorios] = await Promise.all([
        apiClient.get<{ voos: VooRelatorioLocal[] }>(`${raiz}/meus-voos`),
        apiClient.get<{ relatorios: RelatorioViagemLocal[] }>(`${raiz}/minhas`),
      ]);
      setVoos(respostaVoos.voos || []);
      await salvarVoosViagem(respostaVoos.voos || []);
      const locais = await listarRascunhosViagem();
      mostrarRelatorios(respostaRelatorios.relatorios || [], locais);
      setAvisoOffline(false);
    } catch (erro) {
      try {
        const [voosLocais, relatoriosLocais] = await Promise.all([lerVoosViagem(), listarRascunhosViagem()]);
        setVoos(voosLocais);
        const registrosServidor = relatoriosLocais.map((registro) => registro.relatorio);
        mostrarRelatorios(registrosServidor, relatoriosLocais);
        setAvisoOffline(true);
        if (!registrosServidor.length && !voosLocais.length) toast.error('Não foi possível carregar dados. Verifique a conexão e tente novamente.');
      } catch {
        toast.error(erro instanceof Error ? erro.message : 'Não foi possível carregar despesas de viagem.');
      }
    } finally { setCarregando(false); setAtualizando(false); }
  }, [mostrarRelatorios]);

  const sincronizarRelatorio = useCallback(async (relatorioId: string, notificar = false) => {
    if (registrosRef.current.has(relatorioId) || !navigator.onLine) return;
    registrosRef.current.add(relatorioId);
    setSincronizando((atual) => new Set(atual).add(relatorioId));
    try {
      let registro = await lerRascunhoViagem(relatorioId);
      if (!registro) return;
      const versaoEnviada = registro.atualizadoEm;
      if (registro.despesasPendentes) {
        await apiClient.put<{ relatorio: RelatorioViagemLocal }>(`${raiz}/${encodeURIComponent(relatorioId)}/despesas-tripulante`, { despesas: registro.despesas });
        const depoisDoEnvio = await lerRascunhoViagem(relatorioId);
        if (depoisDoEnvio) {
          registro = { ...depoisDoEnvio, despesasPendentes: depoisDoEnvio.atualizadoEm !== versaoEnviada };
          await salvarRascunhoViagem(registro);
        }
      }
      for (const pendencia of [...registro.anexosPendentes]) {
        const indice = registro.despesas.findIndex((despesa) => despesa.id === pendencia.idDespesa);
        if (indice < 0) continue;
        const corpo = new FormData();
        corpo.set('arquivo', new File([pendencia.arquivo], pendencia.nomeArquivo, { type: pendencia.tipoArquivo }), pendencia.nomeArquivo);
        corpo.set('indice_despesa', String(indice));
        await apiClient.postMultipart(`${raiz}/${encodeURIComponent(relatorioId)}/anexos-tripulante`, corpo);
        const aposAnexo = await lerRascunhoViagem(relatorioId);
        if (aposAnexo) {
          await salvarRascunhoViagem({ ...aposAnexo, anexosPendentes: aposAnexo.anexosPendentes.filter((item) => item.idDespesa !== pendencia.idDespesa) });
        }
        if (pendencia.anexoAnteriorId) await apiClient.delete(`${raiz}/${encodeURIComponent(relatorioId)}/anexos-tripulante/${encodeURIComponent(pendencia.anexoAnteriorId)}`).catch(() => undefined);
      }
      const pendenciasAtuais = await lerRascunhoViagem(relatorioId);
      if (pendenciasAtuais) {
        const lista = await apiClient.get<{ relatorios: RelatorioViagemLocal[] }>(`${raiz}/minhas`).catch(() => null);
        const atualizado = lista?.relatorios.find((item) => item.id === relatorioId);
        const proximo = atualizado ? { ...pendenciasAtuais, relatorio: atualizado, despesas: despesasDaLista(atualizado.despesas, atualizado.id) } : pendenciasAtuais;
        await salvarRascunhoViagem({ ...proximo, despesasPendentes: proximo.despesasPendentes || pendenciasAtuais.despesasPendentes, anexosPendentes: proximo.anexosPendentes });
        setRelatorios((atuais) => atuais.map((item) => item.id === relatorioId ? { ...proximo.relatorio, despesas: proximo.despesas } : item));
        if (!proximo.despesasPendentes && !proximo.anexosPendentes.length) setRelatoriosPendentes((atuais) => { const novos = new Set(atuais); novos.delete(relatorioId); return novos; });
      }
      if (notificar) toast.success('Despesas sincronizadas.');
    } catch (erro) {
      if (notificar) toast.error(erro instanceof Error ? erro.message : 'As despesas ficaram pendentes para sincronizar.');
    } finally {
      registrosRef.current.delete(relatorioId);
      setSincronizando((atual) => { const proximo = new Set(atual); proximo.delete(relatorioId); return proximo; });
    }
  }, []);

  const sincronizarPendentes = useCallback(async () => {
    if (!navigator.onLine) return;
    const locais = await listarRascunhosViagem().catch(() => []);
    for (const registro of locais) if (registro.despesasPendentes || registro.anexosPendentes.length) void sincronizarRelatorio(registro.relatorio.id);
  }, [sincronizarRelatorio]);

  useEffect(() => { void carregarDados(); }, [carregarDados]);
  useEffect(() => {
    const voltouConexao = () => { setAvisoOffline(false); void carregarDados(true); void sincronizarPendentes(); };
    const perdeuConexao = () => setAvisoOffline(true);
    window.addEventListener('online', voltouConexao);
    window.addEventListener('offline', perdeuConexao);
    return () => { window.removeEventListener('online', voltouConexao); window.removeEventListener('offline', perdeuConexao); };
  }, [carregarDados, sincronizarPendentes]);
  useEffect(() => { void sincronizarPendentes(); }, [sincronizarPendentes]);
  useEffect(() => { window.scrollTo(0, 0); }, [relatorioAtual?.id]);
  useEffect(() => () => { if (visualizador) URL.revokeObjectURL(visualizador.url); }, [visualizador]);

  const abrirRelatorio = useCallback(async (relatorio: RelatorioViagemLocal) => {
    if (['aguardando_aprovacao', 'ajuste_concluido', 'ajuste_necessario'].includes(relatorio.status)) {
      navegar('/financeiro/viagem');
      return;
    }
    setRelatorioAtual({ ...relatorio, despesas: despesasDaLista(relatorio.despesas, relatorio.id) });
  }, [navegar]);

  const iniciarOuContinuar = useCallback(async (voo: VooRelatorioLocal) => {
    const relatorioLocal = relatorios.find((item) => item.id === voo.relatorio_id || item.numero_voo === voo.numero_voo);
    if (relatorioLocal) { await abrirRelatorio(relatorioLocal); return; }
    if (!navigator.onLine) {
      toast.error('Para iniciar um relatório, conecte-se à internet. Depois, você poderá lançar despesas offline.');
      return;
    }
    try {
      const resposta = await apiClient.post<{ relatorio: RelatorioViagemLocal }>(`${raiz}/iniciar-do-voo`, { numero_voo: voo.numero_voo });
      const relatorio = { ...resposta.relatorio, despesas: despesasDaLista(resposta.relatorio.despesas, resposta.relatorio.id) };
      const registro: RegistroRelatorioViagem = { chave: `relatorio:${relatorio.id}`, relatorio, despesas: despesasDaLista(relatorio.despesas, relatorio.id), anexosPendentes: [], despesasPendentes: false, atualizadoEm: new Date().toISOString() };
      await salvarRascunhoViagem(registro);
      setRelatorios((atuais) => atuais.some((item) => item.id === relatorio.id) ? atuais.map((item) => item.id === relatorio.id ? relatorio : item) : [relatorio, ...atuais]);
      await abrirRelatorio(relatorio);
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : 'Não foi possível iniciar o relatório deste voo.'); }
  }, [abrirRelatorio, relatorios]);

  useEffect(() => {
    const idSolicitacao = (localizacao.state as { solicitacao_id?: string } | null)?.solicitacao_id;
    if (!idSolicitacao || aberturaAutomatica.current || carregando) return;
    const voo = voos.find((item) => item.solicitacao_id === idSolicitacao);
    if (!voo) return;
    aberturaAutomatica.current = true;
    void iniciarOuContinuar(voo);
  }, [carregando, iniciarOuContinuar, localizacao.state, voos]);

  const salvarDespesa = async (despesa: DespesaViagemLocal, arquivo: File | null, anexoAnterior?: string, adicionarOutra?: boolean) => {
    if (!relatorioAtual) return;
    const despesasAtuais = despesasDaLista(relatorioAtual.despesas, relatorioAtual.id);
    const indice = despesasAtuais.findIndex((item) => item.id === despesa.id);
    const despesasNovas = indice < 0 ? [...despesasAtuais, despesa] : despesasAtuais.map((item, posicao) => posicao === indice ? despesa : item);
    const anexoNovo: AnexoPendenteViagem | null = arquivo ? { idDespesa: despesa.id, arquivo, nomeArquivo: arquivo.name, tipoArquivo: arquivo.type, ...(anexoAnterior ? { anexoAnteriorId: anexoAnterior } : {}) } : null;
    const registroAtual = await lerRascunhoViagem(relatorioAtual.id);
    const registro: RegistroRelatorioViagem = {
      chave: `relatorio:${relatorioAtual.id}`,
      relatorio: { ...relatorioAtual, despesas: despesasNovas },
      despesas: despesasNovas,
      anexosPendentes: [...(registroAtual?.anexosPendentes.filter((item) => item.idDespesa !== despesa.id) || []), ...(anexoNovo ? [anexoNovo] : [])],
      despesasPendentes: true,
      atualizadoEm: new Date().toISOString(),
    };
    try { await salvarRascunhoViagem(registro); }
    catch (erro) { toast.error(erro instanceof Error ? erro.message : 'Não foi possível guardar a despesa neste dispositivo.'); throw erro; }
    setRelatorioAtual(registro.relatorio);
    setRelatorios((atuais) => atuais.map((item) => item.id === relatorioAtual.id ? registro.relatorio : item));
    setFormulario(adicionarOutra ? {} : null);
    setRelatoriosPendentes((atuais) => new Set(atuais).add(relatorioAtual.id));
    haptico(20);
    toast.success(navigator.onLine ? 'Despesa salva.' : 'Despesa guardada; será enviada quando houver conexão.');
    if (navigator.onLine) void sincronizarRelatorio(relatorioAtual.id);
  };

  const confirmarExclusao = async () => {
    const despesa = excluindo;
    setExcluindo(null);
    if (!relatorioAtual || !despesa) return;
    const despesasNovas = despesasDaLista(relatorioAtual.despesas, relatorioAtual.id).filter((item) => item.id !== despesa.id);
    const atual = await lerRascunhoViagem(relatorioAtual.id);
    const registro: RegistroRelatorioViagem = {
      chave: `relatorio:${relatorioAtual.id}`, relatorio: { ...relatorioAtual, despesas: despesasNovas }, despesas: despesasNovas,
      anexosPendentes: atual?.anexosPendentes.filter((item) => item.idDespesa !== despesa.id) || [], despesasPendentes: true, atualizadoEm: new Date().toISOString(),
    };
    try {
      await salvarRascunhoViagem(registro);
      setRelatorioAtual(registro.relatorio);
      setRelatorios((atuais) => atuais.map((item) => item.id === relatorioAtual.id ? registro.relatorio : item));
      setRelatoriosPendentes((atuais) => new Set(atuais).add(relatorioAtual.id));
      setFormulario(null);
      toast.success(navigator.onLine ? 'Despesa excluída.' : 'Exclusão guardada para sincronizar.');
      haptico(20);
      if (navigator.onLine) void sincronizarRelatorio(relatorioAtual.id);
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : 'Não foi possível excluir a despesa.'); }
  };

  const abrirComprovante = async (anexo: AnexoViagemLocal) => {
    if (!relatorioAtual) return;
    setAbrindoAnexo(anexo.id);
    try {
      const blob = await apiClient.getBlob(urlArquivoTripulante(relatorioAtual.id, anexo.id));
      setVisualizador({ url: URL.createObjectURL(blob), tipo: anexo.tipo_arquivo || blob.type, nome: anexo.nome_arquivo || 'Comprovante' });
    } catch { toast.error('Não foi possível abrir o comprovante.'); }
    finally { setAbrindoAnexo(''); }
  };

  const abrirRelatorioDeCartao = (relatorio: RelatorioViagemLocal) => { void abrirRelatorio(relatorio); };
  const emAndamento = relatorios.filter((item) => item.status === 'rascunho');
  const aguardando = relatorios.filter((item) => ['aguardando_aprovacao', 'ajuste_concluido'].includes(item.status));
  const ajustes = relatorios.filter((item) => item.status === 'ajuste_necessario');
  const concluidos = relatorios.filter((item) => !['rascunho', 'aguardando_aprovacao', 'ajuste_concluido', 'ajuste_necessario'].includes(item.status));
  const despesas = useMemo(() => relatorioAtual ? despesasDaLista(relatorioAtual.despesas, relatorioAtual.id) : [], [relatorioAtual]);
  const resumo = useMemo(() => relatorioAtual ? totaisDoRelatorio(despesas, relatorioAtual.tripulante_pos) : null, [despesas, relatorioAtual]);
  const podeEditar = relatorioAtual?.status === 'rascunho';
  const anexoDoIndice = (indice: number) => relatorioAtual?.anexos?.find((anexo) => Number(anexo.indice_despesa) === indice);
  const registroPendente = (id: string) => relatoriosPendentes.has(relatorioAtual?.id || '') && despesas.some((despesa) => despesa.id === id);

  return <MobileLayout hideTabBar={Boolean(relatorioAtual)}>
    <div className="ios-root min-h-[100dvh]">
      <style>{estilosGlobais}</style>

      {relatorioAtual ? <main style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
        <BarraNavegacao rolou={rolou} titulo={relatorioAtual.numero_voo || 'Relatório'}
          esquerda={<button type="button" onClick={() => { setRelatorioAtual(null); setFormulario(null); }} className="ios-press c-tint -ml-2 flex h-11 items-center pr-3 text-[17px]"><ChevronLeft className="h-[28px] w-[28px]" strokeWidth={2.4} />Despesas</button>}
          direita={podeEditar ? <BotaoCirculo rotulo="Lançar despesa" onClick={() => setFormulario({})}><Plus className="h-5 w-5" strokeWidth={2.6} /></BotaoCirculo> : undefined} />
        <div className="mx-auto max-w-xl px-4">
          <div className="pb-5 pt-1">
            <p className="c-l2 text-[13px] font-semibold">Relatório {relatorioAtual.numero_relatorio}</p>
            <h1 className="text-[34px] font-bold leading-tight tracking-tight">{relatorioAtual.numero_voo || 'Despesas'}</h1>
            <p className="c-l2 text-[15px]">{relatorioAtual.rota || 'Trecho não informado'}</p>
            {sincronizando.has(relatorioAtual.id) && <p className="c-tint mt-2 flex items-center gap-1.5 text-[13px] font-medium"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sincronizando…</p>}
          </div>

          {!podeEditar && <div className="mb-6 rounded-[12px] p-4 text-[15px] leading-snug" style={{ background: 'rgba(255,159,10,.14)', color: '#FFB340' }}>
            Este relatório está <strong>{statusInfo(relatorioAtual.status).rotulo.toLowerCase()}</strong> e só pode ser editado pelo financeiro. O fluxo de aprovação continua na tela de Relatórios.
          </div>}

          {resumo && <>
            <section className="bg-c mb-6 rounded-[16px] px-5 py-6 text-center">
              <p className="c-l2 text-[13px]">Total lançado</p>
              <p className="mt-1 text-[40px] font-bold tabular-nums tracking-tight">{moeda(resumo.geral)}</p>
            </section>
            <Grupo titulo="Quem pagou">
              <LinhaValor rotulo="Eu" cor="#0A84FF" valor={moeda(resumo.eu)} />
              {relatorioAtual.tripulante_id_2 && <LinhaValor rotulo={(relatorioAtual.tripulante_pos === 1 ? relatorioAtual.nome_tripulante_2 : relatorioAtual.nome_tripulante) || 'Outro tripulante'} cor="#BF5AF2" valor={moeda(resumo.outro)} />}
              <LinhaValor rotulo="Cliente" cor="#FF9F0A" valor={moeda(resumo.cliente)} />
              <LinhaValor rotulo="Share Brasil" cor="#30D158" valor={moeda(resumo.share)} />
            </Grupo>
          </>}

          <Grupo titulo={`Despesas · ${despesas.length}`} rodape={podeEditar && despesas.length ? 'Deslize uma despesa para a esquerda para excluir.' : undefined}>
            {!despesas.length ? <Vazio Icone={ReceiptText} titulo="Nenhuma despesa lançada" texto={podeEditar ? 'Toque em Lançar despesa para começar.' : undefined} />
              : despesasEmOrdem(relatorioAtual).map(({ despesa, indice }) => {
                const anexo = anexoDoIndice(indice);
                const categoriaVisual = categoriaDe(despesa.categoria);
                const pendente = registroPendente(despesa.id) || sincronizando.has(relatorioAtual.id);
                return <LinhaDeslizavel key={despesa.id} habilitado={Boolean(podeEditar)} aoExcluir={() => setExcluindo(despesa)}>
                  <div className="flex items-center">
                    <button type="button" onClick={() => podeEditar && setFormulario({ despesa, anexo })} disabled={!podeEditar} aria-label={`Editar ${despesa.categoria}`} className="ios-row flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left disabled:cursor-default">
                      <IconeApp Icone={categoriaVisual.Icone} cor={categoriaVisual.cor} tamanho={38} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-medium">{despesa.descricao || despesa.categoria}</span>
                        <span className="c-l2 block truncate text-[13px]">{dataVisivel(despesa.data)} · {pagadorNome(despesa.pago_por, relatorioAtual)}</span>
                        {pendente && <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: '#FFB340' }}><Clock3 className="h-3 w-3" />{navigator.onLine ? 'Sincronizando…' : 'Pendente de envio'}</span>}
                      </span>
                      <span className="shrink-0 text-[17px] font-semibold tabular-nums">{moeda(despesa.valor)}</span>
                    </button>
                    {anexo ? <button type="button" onClick={() => void abrirComprovante(anexo)} aria-label="Abrir comprovante" className="c-tint flex h-[64px] w-12 shrink-0 items-center justify-center">
                      {abrindoAnexo === anexo.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                    </button> : <span className="w-3 shrink-0" />}
                  </div>
                </LinhaDeslizavel>;
              })}
          </Grupo>

          <Grupo titulo="Detalhes do voo">
            <LinhaValor rotulo="Cotista" valor={relatorioAtual.cliente_nome || relatorioAtual.cotista_nome || '—'} />
            <LinhaValor rotulo="Aeronave" valor={relatorioAtual.aeronave_matricula || '—'} />
            <LinhaValor rotulo="Início" valor={dataVisivel(relatorioAtual.data_inicio)} />
            <LinhaValor rotulo="Tripulante 1" valor={relatorioAtual.nome_tripulante || '—'} />
            {relatorioAtual.tripulante_id_2 && relatorioAtual.nome_tripulante_2 && <LinhaValor rotulo="Tripulante 2" valor={relatorioAtual.nome_tripulante_2} />}
          </Grupo>
        </div>

        {podeEditar && <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.96) 45%, rgba(0,0,0,0))', paddingTop: 32, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="pointer-events-auto mx-auto max-w-xl px-4">
            <button type="button" onClick={() => setFormulario({})} className="ios-press bg-tint flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] text-[17px] font-semibold text-white"><Plus className="h-5 w-5" strokeWidth={2.6} />Lançar despesa</button>
          </div>
        </div>}
      </main>

        : <main style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <BarraNavegacao rolou={rolou} titulo="Despesas"
            direita={<BotaoCirculo rotulo="Atualizar despesas" onClick={() => void carregarDados(true)}><RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} /></BotaoCirculo>} />
          <div className="mx-auto max-w-xl px-4">
            <div className="pb-4 pt-1">
              <h1 className="text-[34px] font-bold tracking-tight">Despesas</h1>
              <p className="c-l2 mt-0.5 text-[15px]">Lance durante o voo; o financeiro finaliza depois.</p>
            </div>

            {avisoOffline && <div className="mb-4 flex items-start gap-2.5 rounded-[12px] p-3 text-[15px] leading-snug" style={{ background: 'rgba(255,159,10,.14)', color: '#FFB340' }}>
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />Sem conexão. Rascunhos e comprovantes salvos neste dispositivo serão enviados quando a internet voltar.
            </div>}

            <div className="mb-5">
              <Segmentado opcoes={[{ valor: 'voos', rotulo: `Meus voos${voos.length ? ` (${voos.length})` : ''}` }, { valor: 'relatorios', rotulo: `Relatórios${relatorios.length ? ` (${relatorios.length})` : ''}` }]} valor={aba} aoMudar={setAba} />
            </div>

            {aba === 'voos' ? (
              carregando ? <div className="space-y-3"><div className="bg-c h-[148px] animate-pulse rounded-[16px]" /><div className="bg-c h-[148px] animate-pulse rounded-[16px]" /></div>
                : voos.length ? <div className="space-y-3">{voos.map((voo) => <article key={voo.solicitacao_id} className="bg-c rounded-[16px] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <IconeApp Icone={Plane} cor="#0A84FF" tamanho={38} />
                      <div className="min-w-0"><h3 className="truncate text-[17px] font-semibold">{voo.numero_voo}</h3><p className="c-l2 truncate text-[13px]">{voo.rota_nome || 'Trecho não informado'}</p></div>
                    </div>
                    <Selo status={voo.relatorio_status} />
                  </div>
                  <p className="c-l2 mt-3 flex items-center gap-2 text-[13px]"><CalendarDays className="h-4 w-4 shrink-0" />{dataVisivel(voo.data_agendada)}<span className="truncate">· {voo.matricula || 'Aeronave'} · {voo.cotista_nome || 'Cotista'}</span></p>
                  <button type="button" onClick={() => void iniciarOuContinuar(voo)} className="ios-press bg-tint mt-4 flex h-[48px] w-full items-center justify-center rounded-[14px] text-[17px] font-semibold text-white">{voo.relatorio_id ? 'Continuar relatório' : 'Iniciar relatório'}</button>
                </article>)}</div>
                  : <div className="bg-c rounded-[16px]"><Vazio Icone={Plane} titulo="Nenhum voo escalado" texto="Voos com número de voo disponível aparecem aqui." /></div>
            ) : (
              carregando ? <div className="flex justify-center py-10"><Loader2 className="c-tint h-6 w-6 animate-spin" /></div> : <>
                <GrupoRelatorios titulo="Em andamento" itens={emAndamento} aoAbrir={abrirRelatorioDeCartao} />
                <GrupoRelatorios titulo="Aguardando minha aprovação" itens={aguardando} aoAbrir={abrirRelatorioDeCartao} />
                <GrupoRelatorios titulo="Ajuste necessário" itens={ajustes} aoAbrir={abrirRelatorioDeCartao} />
                <GrupoRelatorios titulo="Concluídos" itens={concluidos} aoAbrir={abrirRelatorioDeCartao} />
                {!relatorios.length && <div className="bg-c mb-6 rounded-[16px]"><Vazio Icone={CircleDollarSign} titulo="Nenhum relatório ainda" texto="Inicie um relatório a partir de um dos seus voos." /></div>}
                <Grupo>
                  <button type="button" onClick={() => navegar('/financeiro/viagem')} className="ios-row flex min-h-[50px] w-full items-center justify-between px-4 text-left text-[17px]"><span className="c-tint">Aprovações existentes</span><ChevronRight className="c-l3 h-4 w-4" strokeWidth={2.6} /></button>
                </Grupo>
              </>
            )}
          </div>
        </main>}

      {formulario && relatorioAtual && <FormularioDespesa key={formulario.despesa?.id || 'nova'} relatorio={relatorioAtual} inicial={formulario.despesa} anexo={formulario.anexo}
        aoCancelar={() => setFormulario(null)} aoSalvar={salvarDespesa} aoExcluir={setExcluindo} />}

      {visualizador && <Folha titulo={visualizador.nome} rotuloEsquerda={null} aoFechar={() => setVisualizador(null)} acaoDireita={{ rotulo: 'Concluir', onClick: (fechar) => fechar() }}>
        {visualizador.tipo === 'application/pdf'
          ? <iframe src={visualizador.url} title="Comprovante em PDF" className="h-[75dvh] w-full rounded-[12px] bg-white" />
          : <img src={visualizador.url} alt="Comprovante" className="mx-auto max-h-[78dvh] w-full rounded-[12px] object-contain" />}
      </Folha>}

      {excluindo && <FolhaAcoes titulo="Excluir esta despesa?" mensagem={`${excluindo.descricao || excluindo.categoria} · ${moeda(excluindo.valor)}`}
        opcoes={[{ rotulo: 'Excluir despesa', destrutivo: true, onClick: () => void confirmarExclusao() }]} aoCancelar={() => setExcluindo(null)} />}
    </div>
  </MobileLayout>;
}
