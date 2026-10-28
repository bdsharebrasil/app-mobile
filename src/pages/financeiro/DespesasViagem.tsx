import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Camera, Check, ChevronRight, CircleDollarSign, Clock3,
  Bed, Car, CircleEllipsis, FileImage, FileText, Fuel, Loader2, MapPin, Plane, Plus, ReceiptText, RefreshCw,
  Trash2, Upload, Utensils, WifiOff, X,
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

const raiz = '/api/financeiro/relatorios-despesa-viagem';
const categorias: Array<{ valor: string; Icone: React.ElementType }> = [
  { valor: 'Alimentação', Icone: Utensils },
  { valor: 'Hospedagem', Icone: Bed },
  { valor: 'Transporte', Icone: Car },
  { valor: 'Combustível', Icone: Fuel },
  { valor: 'Outros', Icone: CircleEllipsis },
];
const moeda = (valor: number | string | undefined) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
const dataHoje = () => { const data = new Date(); return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`; };
const dataVisivel = (valor?: string | null) => valor ? new Date(`${valor.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';
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

function GrupoRelatorios({ titulo, itens, aoAbrir }: { titulo: string; itens: RelatorioViagemLocal[]; aoAbrir: (relatorio: RelatorioViagemLocal) => void }) {
  if (!itens.length) return null;
  return <section className="space-y-2">
    <h2 className="px-1 text-sm font-semibold text-slate-300">{titulo} <span className="text-slate-500">({itens.length})</span></h2>
    {itens.map((relatorio) => <button key={relatorio.id} type="button" onClick={() => aoAbrir(relatorio)} className="w-full rounded-2xl border border-white/10 bg-[#101e33] p-4 text-left active:scale-[.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="truncate font-semibold text-white">{relatorio.numero_relatorio || 'Relatório de despesas'}</p><p className="mt-1 truncate text-xs text-slate-400">{relatorio.numero_voo || 'Voo'} · {relatorio.aeronave_matricula || 'Aeronave'}</p></div>
        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200">{relatorio.status.replace(/_/g, ' ')}</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[.08] pt-3"><span className="text-xs text-slate-400">{dataVisivel(relatorio.data_inicio)}</span><span className="font-semibold text-emerald-200">{moeda(totaisDoRelatorio(despesasDaLista(relatorio.despesas, relatorio.id), relatorio.tripulante_pos).geral)}</span></div>
    </button>)}
  </section>;
}

function FormularioDespesa({
  relatorio, inicial, anexo, aoCancelar, aoSalvar,
}: {
  relatorio: RelatorioViagemLocal;
  inicial?: DespesaViagemLocal;
  anexo?: AnexoViagemLocal;
  aoCancelar: () => void;
  aoSalvar: (despesa: DespesaViagemLocal, arquivo: File | null, anexoAnterior?: string, adicionarOutra?: boolean) => Promise<void>;
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
  const cameraRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const outraPosicao = relatorio.tripulante_pos === 1 ? 2 : 1;
  const nomeOutro = outraPosicao === 1 ? relatorio.nome_tripulante : relatorio.nome_tripulante_2;
  const anexoAtual = arquivo ? null : anexo;
  const idAnexoAtual = anexoAtual?.id;

  useEffect(() => {
    let urlTemporaria = '';
    if (idAnexoAtual) {
      apiClient.getBlob(urlArquivoTripulante(relatorio.id, idAnexoAtual)).then((blob) => {
        urlTemporaria = URL.createObjectURL(blob);
        setPrevisualizacao(urlTemporaria);
      }).catch(() => setPrevisualizacao(''));
    }
    return () => { if (urlTemporaria) URL.revokeObjectURL(urlTemporaria); };
  }, [idAnexoAtual, relatorio.id]);

  const selecionarArquivo = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const selecionado = evento.target.files?.[0];
    evento.target.value = '';
    if (!selecionado) return;
    try {
      const comprimido = await comprimirComprovante(selecionado);
      setArquivo(comprimido);
      setErroComprovante('');
      setPrevisualizacao(URL.createObjectURL(comprimido));
    } catch (erro) {
      setErroComprovante(erro instanceof Error ? erro.message : 'Não foi possível preparar o comprovante.');
    }
  };

  const salvar = async (adicionarOutra = false) => {
    if (!categoria || !data || valorDigitadoEmReais(valor) <= 0) return;
    setCarregando(true);
    try {
      await aoSalvar({
        id: inicial?.id || novoId(), categoria, data, valor: valorDigitadoEmReais(valor),
        pago_por: pagador === 'eu' ? `tripulante_${relatorio.tripulante_pos}` : pagador,
        ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
      }, arquivo, anexoAtual?.id, adicionarOutra);
      if (adicionarOutra) {
        setCategoria(''); setData(dataHoje()); setValor(''); setPagador('eu'); setDescricao(''); setArquivo(null); setPrevisualizacao('');
      }
    } finally { setCarregando(false); }
  };

  return <div className="fixed inset-0 z-[80] flex flex-col bg-[#071326] text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
      <button type="button" onClick={aoCancelar} aria-label="Fechar formulário" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300"><X className="h-5 w-5" /></button>
      <h2 className="text-base font-semibold">{inicial ? 'Editar despesa' : 'Lançar despesa'}</h2>
      <span className="w-11" />
    </header>
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-5">
      <label className="mb-2 block text-sm font-semibold">Categoria</label>
      <div className="grid grid-cols-2 gap-2">
        {categorias.map((item) => <button type="button" key={item.valor} onClick={() => setCategoria(item.valor)} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium ${categoria === item.valor ? 'border-emerald-300 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[.03] text-slate-300'}`}><item.Icone className="h-5 w-5" />{item.valor}</button>)}
      </div>
      <label className="mb-2 mt-5 block text-sm font-semibold" htmlFor="data-despesa">Data</label>
      <input id="data-despesa" type="date" value={data} onChange={(evento) => setData(evento.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-[#101e33] px-4 text-base text-white" />
      <label className="mb-2 mt-5 block text-sm font-semibold" htmlFor="valor-despesa">Valor (R$)</label>
      <div className="flex h-16 items-center rounded-2xl border border-white/10 bg-[#101e33] px-4"><span className="mr-3 text-sm text-slate-400">R$</span><input id="valor-despesa" inputMode="numeric" type="text" value={valor} onChange={(evento) => setValor(formatarValorDigitado(evento.target.value))} placeholder="0,00" aria-label="Valor da despesa em reais" className="w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-slate-600" /></div>
      <label className="mb-2 mt-5 block text-sm font-semibold">Pago por</label>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPagador('eu')} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${pagador === 'eu' || pagador === `tripulante_${relatorio.tripulante_pos}` ? 'border-emerald-300 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[.03] text-slate-300'}`}>Eu</button>
        {relatorio.tripulante_id_2 && <button type="button" onClick={() => setPagador(`tripulante_${outraPosicao}`)} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${pagador === `tripulante_${outraPosicao}` ? 'border-emerald-300 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[.03] text-slate-300'}`}>{nomeOutro || `Tripulante ${outraPosicao}`}</button>}
        <button type="button" onClick={() => setPagador('cliente')} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${pagador === 'cliente' ? 'border-emerald-300 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[.03] text-slate-300'}`}>Cliente</button>
        <button type="button" onClick={() => setPagador('sharebrasil')} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${pagador === 'sharebrasil' ? 'border-emerald-300 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[.03] text-slate-300'}`}>Share Brasil</button>
      </div>
      <label className="mb-2 mt-5 block text-sm font-semibold">Comprovante</label>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(evento) => void selecionarArquivo(evento)} />
      <input ref={arquivoRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(evento) => void selecionarArquivo(evento)} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => cameraRef.current?.click()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm font-semibold"><Camera className="h-4 w-4 text-emerald-200" /> Tirar foto</button>
        <button type="button" onClick={() => arquivoRef.current?.click()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm font-semibold"><Upload className="h-4 w-4 text-emerald-200" /> Galeria/arquivo</button>
      </div>
      {(arquivo || anexoAtual) && <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3">
        {previsualizacao && (arquivo?.type || anexoAtual?.tipo_arquivo || '').startsWith('image/') ? <img src={previsualizacao} alt="Prévia do comprovante" className="h-14 w-14 rounded-lg object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/10">{(arquivo?.type || anexoAtual?.tipo_arquivo) === 'application/pdf' ? <FileText /> : <FileImage />}</span>}
        <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{arquivo?.name || anexoAtual?.nome_arquivo || 'Comprovante anexado'}</span>
        <button type="button" onClick={() => { setArquivo(null); setPrevisualizacao(''); }} aria-label="Remover comprovante selecionado" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400"><Trash2 className="h-4 w-4" /></button>
      </div>}
      {erroComprovante && <p className="mt-2 text-sm text-rose-300">{erroComprovante}</p>}
      <label className="mb-2 mt-5 block text-sm font-semibold" htmlFor="descricao-despesa">Descrição <span className="font-normal text-slate-500">(opcional)</span></label>
      <textarea id="descricao-despesa" value={descricao} onChange={(evento) => setDescricao(evento.target.value)} maxLength={500} placeholder="Ex.: refeição da tripulação" rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-[#101e33] p-3 text-sm text-white placeholder:text-slate-500" />
      <p className="mt-2 text-xs text-slate-500">A data pode ser diferente do período do voo. O financeiro poderá revisar o cabeçalho.</p>
    </div>
    <footer className="shrink-0 border-t border-white/10 bg-[#071326] px-4 pt-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <button type="button" onClick={() => void salvar(false)} disabled={!categoria || !data || valorDigitadoEmReais(valor) <= 0 || carregando} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 text-base font-bold text-[#071326] disabled:opacity-40">{carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Salvar despesa</button>
      <button type="button" onClick={() => void salvar(true)} disabled={!categoria || !data || valorDigitadoEmReais(valor) <= 0 || carregando} className="mt-2 h-10 w-full text-sm font-semibold text-emerald-200 disabled:opacity-40">Salvar e adicionar outra</button>
    </footer>
  </div>;
}

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
  const registrosRef = useRef(new Set<string>());
  const aberturaAutomatica = useRef(false);

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
    navigator.vibrate?.(20);
    toast.success(navigator.onLine ? 'Despesa salva.' : 'Despesa guardada; será enviada quando houver conexão.');
    if (navigator.onLine) void sincronizarRelatorio(relatorioAtual.id);
  };

  const excluirDespesa = async (despesa: DespesaViagemLocal) => {
    if (!relatorioAtual || !window.confirm('Excluir esta despesa?')) return;
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
      toast.success(navigator.onLine ? 'Despesa excluída.' : 'Exclusão guardada para sincronizar.');
      navigator.vibrate?.(20);
      if (navigator.onLine) void sincronizarRelatorio(relatorioAtual.id);
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : 'Não foi possível excluir a despesa.'); }
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
    {relatorioAtual ? <main className="min-h-[calc(100dvh-5rem)] bg-[#071326] px-4 pb-28 pt-4 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={() => { setRelatorioAtual(null); setFormulario(null); }} className="mb-4 flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-slate-300"><ArrowLeft className="h-4 w-4" /> Voltar às despesas</button>
        {!podeEditar && <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.08] p-3 text-sm text-amber-100">Este relatório está <strong>{relatorioAtual.status.replace(/_/g, ' ')}</strong> e só pode ser editado pelo financeiro. O fluxo de aprovação continua na tela de Relatórios.</div>}
        <section className="rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-[#103b3b] via-[#122b3c] to-[#101d34] p-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-emerald-200"><Plane className="h-4 w-4" /> Relatório {relatorioAtual.numero_relatorio}</div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><p className="text-[10px] uppercase text-slate-400">Número do voo</p><p className="mt-1 font-semibold">{relatorioAtual.numero_voo || '—'}</p></div>
            <div><p className="text-[10px] uppercase text-slate-400">Cotista</p><p className="mt-1 truncate font-semibold">{relatorioAtual.cliente_nome || relatorioAtual.cotista_nome || '—'}</p></div>
            <div><p className="text-[10px] uppercase text-slate-400">Aeronave</p><p className="mt-1 font-semibold">{relatorioAtual.aeronave_matricula || '—'}</p></div>
            <div><p className="text-[10px] uppercase text-slate-400">Data de início</p><p className="mt-1 font-semibold">{dataVisivel(relatorioAtual.data_inicio)}</p></div>
            <div className="col-span-2"><p className="text-[10px] uppercase text-slate-400">Trecho</p><p className="mt-1 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 shrink-0 text-emerald-200" />{relatorioAtual.rota || '—'}</p></div>
            <div><p className="text-[10px] uppercase text-slate-400">Tripulante 1</p><p className="mt-1 truncate font-semibold">{relatorioAtual.nome_tripulante || '—'}</p></div>
            {relatorioAtual.tripulante_id_2 && relatorioAtual.nome_tripulante_2 && <div><p className="text-[10px] uppercase text-slate-400">Tripulante 2</p><p className="mt-1 truncate font-semibold">{relatorioAtual.nome_tripulante_2}</p></div>}
          </div>
        </section>
        {resumo && <section className="mt-3 rounded-2xl border border-white/10 bg-[#101e33] p-4">
          <div className="flex items-center justify-between"><span className="text-sm text-slate-300">Total lançado</span><strong className="text-xl text-white">{moeda(resumo.geral)}</strong></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-xl bg-white/[.04] p-2.5"><span className="block text-slate-400">Eu</span><strong className="mt-1 block text-emerald-100">{moeda(resumo.eu)}</strong></div>
            {relatorioAtual.tripulante_id_2 && <div className="rounded-xl bg-white/[.04] p-2.5"><span className="block truncate text-slate-400">{relatorioAtual.tripulante_pos === 1 ? relatorioAtual.nome_tripulante_2 : relatorioAtual.nome_tripulante}</span><strong className="mt-1 block text-white">{moeda(resumo.outro)}</strong></div>}
            <div className="rounded-xl bg-white/[.04] p-2.5"><span className="block text-slate-400">Cliente</span><strong className="mt-1 block text-white">{moeda(resumo.cliente)}</strong></div>
            <div className="rounded-xl bg-white/[.04] p-2.5"><span className="block text-slate-400">Share Brasil</span><strong className="mt-1 block text-white">{moeda(resumo.share)}</strong></div>
          </div>
        </section>}
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Despesas lançadas</h2>{sincronizando.has(relatorioAtual.id) && <span className="flex items-center gap-1 text-xs text-emerald-200"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sincronizando…</span>}</div>
          {!despesas.length ? <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center"><ReceiptText className="mx-auto mb-3 h-8 w-8 text-slate-500" /><p className="text-sm text-slate-300">Nenhuma despesa lançada ainda.</p><p className="mt-1 text-xs text-slate-500">Toque em + para começar.</p></div> : <div className="space-y-2">
            {despesasEmOrdem(relatorioAtual).map(({ despesa, indice }) => {
              const anexo = anexoDoIndice(indice);
              const IconeCategoria = categorias.find((item) => categoriaNormalizada(item.valor) === categoriaNormalizada(despesa.categoria))?.Icone || CircleEllipsis;
              const pendente = registroPendente(despesa.id) || sincronizando.has(relatorioAtual.id);
              return <article key={despesa.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#101e33] p-3">
                <button type="button" onClick={() => podeEditar && setFormulario({ despesa, anexo })} disabled={!podeEditar} aria-label={`Editar ${despesa.categoria}`} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10"><IconeCategoria className="h-5 w-5 text-emerald-100" /></span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{despesa.descricao || despesa.categoria}</strong><span className="mt-1 block truncate text-xs text-slate-400">{dataVisivel(despesa.data)} · {pagadorNome(despesa.pago_por, relatorioAtual)}</span>{pendente && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-200"><Clock3 className="h-3 w-3" /> {navigator.onLine ? 'Sincronizando…' : 'Pendente de envio'}</span>}</span>
                  <strong className="shrink-0 text-sm text-white">{moeda(despesa.valor)}</strong>
                </button>
                {anexo && <a href="#comprovante" onClick={(evento) => { evento.preventDefault(); void apiClient.getBlob(urlArquivoTripulante(relatorioAtual.id, anexo.id)).then((blob) => window.open(URL.createObjectURL(blob), '_blank', 'noopener')).catch(() => toast.error('Não foi possível abrir o comprovante.')); }} aria-label="Abrir comprovante" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[.06] text-emerald-200">{anexo.tipo_arquivo === 'application/pdf' ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}</a>}
                {podeEditar && <button type="button" onClick={() => void excluirDespesa(despesa)} aria-label="Excluir despesa" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400"><Trash2 className="h-4 w-4" /></button>}
              </article>;
            })}
          </div>}
        </section>
      </div>
      {podeEditar && <button type="button" onClick={() => setFormulario({})} className="fixed bottom-24 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-bold text-[#071326] shadow-xl shadow-black/30"><Plus className="h-5 w-5" /> Lançar despesa</button>}
    </main> : <main className="min-h-screen bg-[#071326] px-4 pb-28 pt-5 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-5 flex items-center justify-between">
          <div><h1 className="text-xl font-bold">Despesas de Viagem</h1><p className="mt-1 text-sm text-slate-400">Lance durante o voo; o financeiro finaliza depois.</p></div>
          <button type="button" onClick={() => void carregarDados(true)} aria-label="Atualizar despesas" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[.06]"><RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} /></button>
        </header>
        {avisoOffline && <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.08] p-3 text-sm text-amber-100"><WifiOff className="h-4 w-4 shrink-0" /> Sem conexão. Os rascunhos e comprovantes salvos neste dispositivo serão enviados quando a internet voltar.</div>}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Meus voos</h2><span className="text-xs text-slate-500">Todos os voos escalados</span></div>
          {carregando ? <div className="space-y-2"><div className="h-28 animate-pulse rounded-2xl bg-white/[.05]" /><div className="h-28 animate-pulse rounded-2xl bg-white/[.05]" /></div> : voos.length ? <div className="space-y-2">{voos.map((voo) => <article key={voo.solicitacao_id} className="rounded-2xl border border-white/10 bg-[#101e33] p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Plane className="h-4 w-4 shrink-0 text-emerald-200" /><h3 className="truncate font-bold">{voo.numero_voo}</h3></div><p className="mt-1 truncate text-xs text-slate-400">{voo.rota_nome || 'Trecho não informado'}</p></div><span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">{voo.relatorio_status ? voo.relatorio_status.replace(/_/g, ' ') : 'Sem relatório'}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dataVisivel(voo.data_agendada)}</span><span className="truncate">{voo.matricula || 'Aeronave'} · {voo.cotista_nome || 'Cotista'}</span></div>
            <button type="button" onClick={() => void iniciarOuContinuar(voo)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl bg-emerald-400 px-4 text-sm font-bold text-[#071326]"><span>{voo.relatorio_id ? 'Continuar relatório' : 'Iniciar relatório'}</span><ChevronRight className="h-4 w-4" /></button>
          </article>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center"><Plane className="mx-auto mb-2 h-7 w-7 text-slate-500" /><p className="text-sm text-slate-300">Nenhum voo escalado com número de voo disponível.</p></div>}
        </section>
        <section className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">Meus relatórios</h2><button type="button" onClick={() => navegar('/financeiro/viagem')} className="text-xs font-semibold text-emerald-200">Aprovações existentes</button></section>
        {carregando ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-200" /></div> : <div className="space-y-5">
          <GrupoRelatorios titulo="Em andamento" itens={emAndamento} aoAbrir={abrirRelatorioDeCartao} />
          <GrupoRelatorios titulo="Aguardando minha aprovação" itens={aguardando} aoAbrir={abrirRelatorioDeCartao} />
          <GrupoRelatorios titulo="Ajuste necessário" itens={ajustes} aoAbrir={abrirRelatorioDeCartao} />
          <GrupoRelatorios titulo="Concluídos" itens={concluidos} aoAbrir={abrirRelatorioDeCartao} />
          {!relatorios.length && <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center"><CircleDollarSign className="mx-auto mb-2 h-7 w-7 text-slate-500" /><p className="text-sm text-slate-300">Você ainda não tem relatórios de viagem.</p></div>}
        </div>}
      </div>
    </main>}
    {formulario && relatorioAtual && <FormularioDespesa key={formulario.despesa?.id || 'nova'} relatorio={relatorioAtual} inicial={formulario.despesa} anexo={formulario.anexo} aoCancelar={() => setFormulario(null)} aoSalvar={salvarDespesa} />}
  </MobileLayout>;
}

