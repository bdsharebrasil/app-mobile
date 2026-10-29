export interface DespesaViagemLocal {
  id: string;
  categoria: string;
  data: string;
  valor: number;
  pago_por: string;
  descricao?: string;
}

export interface AnexoViagemLocal {
  id: string;
  indice_despesa: number;
  nome_arquivo?: string | null;
  url_arquivo: string;
  tipo_arquivo?: string | null;
  tamanho_arquivo?: number | string | null;
}

export interface RelatorioViagemLocal {
  id: string;
  numero_relatorio: string;
  numero_voo?: string | null;
  cliente_nome?: string | null;
  cotista_nome?: string | null;
  aeronave_matricula?: string | null;
  nome_tripulante?: string | null;
  nome_tripulante_2?: string | null;
  tripulante_pos: 1 | 2;
  tripulacao_id?: string | null;
  tripulante_id_2?: string | null;
  rota?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  quantidade_dias?: number | null;
  despesas: DespesaViagemLocal[] | string | null;
  anexos?: AnexoViagemLocal[] | null;
  total_valor?: number | string;
  total_tripulante_1?: number | string;
  total_tripulante_2?: number | string;
  total_cliente?: number | string;
  total_sharebrasil?: number | string;
  status: string;
  origem_criacao?: string | null;
  relatorio_id?: string | null;
  relatorio_status?: string | null;
  pdf_url?: string | null;
}

export interface VooRelatorioLocal {
  solicitacao_id: string;
  numero_voo: string;
  data_agendada: string;
  dias_duracao: number;
  cotista_nome: string | null;
  matricula: string | null;
  rota_nome: string;
  tripulante_pos: 1 | 2;
  tripulante_nome: string | null;
  tripulante_nome_2: string | null;
  relatorio_id: string | null;
  relatorio_status: string | null;
}

export interface AnexoPendenteViagem {
  idDespesa: string;
  arquivo: Blob;
  nomeArquivo: string;
  tipoArquivo: string;
  anexoAnteriorId?: string;
}

export interface RegistroRelatorioViagem {
  chave: string;
  relatorio: RelatorioViagemLocal;
  despesas: DespesaViagemLocal[];
  anexosPendentes: AnexoPendenteViagem[];
  despesasPendentes: boolean;
  atualizadoEm: string;
}

type RegistroCacheVoos = { chave: 'voos'; voos: VooRelatorioLocal[] };
const nomeBanco = 'share-brasil-despesas-viagem';
const versaoBanco = 1;
let aberturaBanco: Promise<IDBDatabase> | null = null;

function abrirBanco(): Promise<IDBDatabase> {
  if (aberturaBanco) return aberturaBanco;
  aberturaBanco = new Promise((resolver, rejeitar) => {
    if (!('indexedDB' in window)) {
      rejeitar(new Error('Armazenamento seguro offline não disponível neste navegador.'));
      return;
    }
    const requisicao = indexedDB.open(nomeBanco, versaoBanco);
    requisicao.onupgradeneeded = () => {
      if (!requisicao.result.objectStoreNames.contains('registros')) {
        requisicao.result.createObjectStore('registros', { keyPath: 'chave' });
      }
    };
    requisicao.onsuccess = () => resolver(requisicao.result);
    requisicao.onerror = () => rejeitar(requisicao.error || new Error('Não foi possível abrir o armazenamento offline.'));
    requisicao.onblocked = () => rejeitar(new Error('Feche outras abas do Share Brasil para habilitar o armazenamento offline.'));
  }).catch((erro) => {
    aberturaBanco = null;
    throw erro;
  });
  return aberturaBanco;
}

async function gravarRegistro(registro: RegistroRelatorioViagem | RegistroCacheVoos): Promise<void> {
  const banco = await abrirBanco();
  await new Promise<void>((resolver, rejeitar) => {
    const transacao = banco.transaction('registros', 'readwrite');
    transacao.objectStore('registros').put(registro);
    transacao.oncomplete = () => resolver();
    transacao.onerror = () => rejeitar(transacao.error || new Error('Não foi possível guardar os dados no dispositivo.'));
    transacao.onabort = () => rejeitar(transacao.error || new Error('O armazenamento offline foi interrompido.'));
  });
}

async function lerRegistro<T>(chave: string): Promise<T | null> {
  const banco = await abrirBanco();
  return new Promise<T | null>((resolver, rejeitar) => {
    const requisicao = banco.transaction('registros', 'readonly').objectStore('registros').get(chave);
    requisicao.onsuccess = () => resolver((requisicao.result as T | undefined) ?? null);
    requisicao.onerror = () => rejeitar(requisicao.error || new Error('Não foi possível ler o rascunho local.'));
  });
}

export function salvarRascunhoViagem(registro: RegistroRelatorioViagem): Promise<void> {
  return gravarRegistro({ ...registro, chave: `relatorio:${registro.relatorio.id}`, atualizadoEm: new Date().toISOString() });
}

export function lerRascunhoViagem(id: string): Promise<RegistroRelatorioViagem | null> {
  return lerRegistro<RegistroRelatorioViagem>(`relatorio:${id}`);
}

export async function listarRascunhosViagem(): Promise<RegistroRelatorioViagem[]> {
  const banco = await abrirBanco();
  return new Promise((resolver, rejeitar) => {
    const requisicao = banco.transaction('registros', 'readonly').objectStore('registros').getAll();
    requisicao.onsuccess = () => resolver((requisicao.result as Array<RegistroRelatorioViagem | RegistroCacheVoos>)
      .filter((registro): registro is RegistroRelatorioViagem => registro.chave.startsWith('relatorio:')));
    requisicao.onerror = () => rejeitar(requisicao.error || new Error('Não foi possível ler os rascunhos locais.'));
  });
}

export function salvarVoosViagem(voos: VooRelatorioLocal[]): Promise<void> {
  return gravarRegistro({ chave: 'voos', voos });
}

export async function lerVoosViagem(): Promise<VooRelatorioLocal[]> {
  return (await lerRegistro<RegistroCacheVoos>('voos'))?.voos || [];
}
