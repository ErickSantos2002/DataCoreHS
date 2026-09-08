import { criarHttp } from "./http";

const baseURL =
  import.meta.env.VITE_NOTAS_URL || "https://tinyapi.healthsafetytech.com";

// O interceptor que injeta o token mora em criarHttp, compartilhado com a API
// de autenticacao. As instancias e que sao duas: sao dois backends distintos.
const api = criarHttp(baseURL);

// ── Tipos ────────────────────────────────────────────────────────────────────
//
// Derivados do que as telas e contexts de fato leem de cada resposta — nao de
// documentacao da API, que nao existe. Onde nenhum consumidor le o retorno, ele
// fica `unknown` de proposito: e mais honesto do que inventar uma forma. Quando
// a Fase 3 migrar as telas, as interfaces locais duplicadas (`Nota` aparece em
// quatro arquivos) devem convergir para as daqui.

export type Params = Record<string, unknown>;

export interface Cliente {
  id: number;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  fone?: string;
}

export interface ItemNota {
  descricao: string;
  quantidade: string;
  valor_total: string;
  valor_unitario?: string;
  codigo?: string;
}

export type TipoNota = "Outbound" | "Inbound" | "ReCompra";

export interface Marcador {
  descricao: string;
}

export interface NotaVenda {
  id: number;
  numero?: number;
  data_emissao: string;
  valor_nota: number;
  valor_produtos?: number;
  cliente: Cliente | null;
  nome_vendedor: string;
  tipo?: TipoNota | null;
  itens: ItemNota[];
  observacoes?: string | null;
  // Lidos pelo DashboardContext ao filtrar o faturamento por CFOP.
  natureza_operacao?: string | null;
  descricao_situacao?: string | null;
  marcadores?: Marcador[];
}

export interface NotaLocacao {
  id: number;
  numero: string | null;
  data_emissao: string;
  valor_nota: number | string | null;
  descricao_situacao: string | null;
  natureza_operacao: string | null;
  nome_vendedor: string | null;
  cliente: { nome: string; cpf_cnpj: string } | null;
  marcadores?: Marcador[];
}

export interface NotaServico {
  id: number;
  numero_nfse: string;
  data_emissao: string;
  valor_servico: number | string;
  valor_total_recebido?: number | string;
  valor_iss?: number | string;
  razao_social_tomador: string;
  cpf_cnpj_tomador: string;
  email_tomador?: string;
  telefone_tomador?: string;
  cidade_tomador: string;
  uf_tomador: string;
  discriminacao_servico: string;
  status?: string;
}

export interface Configuracao {
  id: number;
  chave: string;
  valor: string;
}

export interface ProdutoEstoque {
  id: number;
  nome: string;
  codigo: string;
  unidade: string;
  preco: number;
  saldo: number;
  situacao: "A" | "I"; // A = Ativo, I = Inativo
}

export interface ContaPagar {
  id: number;
  id_tiny: number;
  data_emissao: string;
  vencimento: string;
  competencia: string | null;
  valor: string | number;
  saldo: string | number;
  nro_documento: string | null;
  historico: string | null;
  categoria: string | null;
  situacao: string | null;
  ocorrencia: string;
  dia_vencimento: number | null;
  numero_parcelas: number | null;
  dia_semana_vencimento: number | null;
  cliente_codigo: string | null;
  cliente_nome: string;
  cliente_tipo_pessoa: string | null;
  cliente_cpf_cnpj: string | null;
  cliente_ie: string | null;
  cliente_rg: string | null;
  cliente_fone: string | null;
  cliente_email: string | null;
  cliente_endereco: string | null;
  cliente_numero: string | null;
  cliente_complemento: string | null;
  cliente_bairro: string | null;
  cliente_cep: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  cliente_pais: string | null;
  liquidacao: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContaReceber {
  id: number;
  id_tiny: number;
  data: string;
  vencimento: string;
  competencia: string | null;
  valor: string | number;
  saldo: string | number;
  link_boleto: string | null;
  nro_documento: string | null;
  serie_documento: string | null;
  nro_banco: string | null;
  historico: string | null;
  categoria: string | null;
  forma_pagamento: string | null;
  portador: string | null;
  situacao: string | null;
  liquidacao: string | null;
  ocorrencia: string;
  dia_vencimento: number | null;
  numero_parcelas: number | null;
  dia_vencimento_semanal: number | null;
  cliente_codigo: string | null;
  cliente_nome: string;
  cliente_tipo_pessoa: string | null;
  cliente_cpf_cnpj: string | null;
  cliente_ie: string | null;
  cliente_rg: string | null;
  cliente_endereco: string | null;
  cliente_numero: string | null;
  cliente_complemento: string | null;
  cliente_bairro: string | null;
  cliente_cep: string | null;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  cliente_pais: string | null;
  cliente_fone: string | null;
  cliente_email: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ResumoProdutoMes {
  mes: number;
  quantidade: number;
  receita: number;
}

/** O miolo salvo em `config_json` do centro de custo. Os numeros voltam da API
 *  ora como number, ora como string — a tela normaliza os dois. */
export interface ConfigCentroCusto {
  servicos_aduaneiros?:
    | { mes_ano?: string; valor?: number | string | null; nf?: string }[]
    | null;
  participacao_pct?: number | string | null;
  unidades_importadas?: number | string | null;
  custos_diretos?:
    | { descricao?: string; valor?: number | string | null }[]
    | null;
  estimativa_custos_variaveis_anual?: number | string | null;
  participacao_overhead_pct?: number | string | null;
  unidades_lote_mes?: number | string | null;
  quantidade_planejada?: number | string | null;
  preco_unitario_planejado?: number | string | null;
}

export interface CentroCustoConfig {
  config_json?: ConfigCentroCusto | null;
}

// ── Notas Fiscais ────────────────────────────────────────────────────────────

/** `unknown`: nenhuma tela consome este endpoint hoje, entao nao ha de onde
 *  derivar a forma. Quem for usar que estreite. */
export const fetchNotas = async (params: Params = {}): Promise<unknown> => {
  const response = await api.get("/notas_fiscais/", { params });
  return response.data;
};

// Notas Vendas
export const fetchVendas = async (
  params: Params = {},
): Promise<NotaVenda[]> => {
  const response = await api.get<NotaVenda[]>("/notas_fiscais/vendas/", {
    params,
  });
  return response.data;
};

/** Faturamento mes a mes de um ano, ja somado pelo banco.
 *
 * Vem da camada `gold`, onde a regra do que conta como faturamento ja foi
 * aplicada — o oposto de `fetchVendas`, que devolve as notas e deixa a tela
 * filtrar e somar. Sao sempre doze linhas, com zero nos meses sem nota, entao
 * quem consome nao precisa preencher buraco.
 *
 * `produto` e NF-e, `servico` e NFS-e, `total` e a soma dos dois — o numero
 * que o dashboard mostra como faturamento da empresa.
 */
export interface FaturamentoMensalAPI {
  ano: number;
  /** 1 = janeiro. */
  mes: number;
  produto: number;
  servico: number;
  total: number;
}

export const fetchFaturamentoMensal = async (
  ano: number,
): Promise<FaturamentoMensalAPI[]> => {
  const response = await api.get<FaturamentoMensalAPI[]>(
    "/faturamento/mensal",
    { params: { ano } },
  );
  return response.data;
};

// Notas com marcador "Locação"
export const fetchLocacao = async (
  params: Params = {},
): Promise<NotaLocacao[]> => {
  const response = await api.get<NotaLocacao[]>("/notas_fiscais/locacao/", {
    params,
  });
  return response.data;
};

// Clientes
export const fetchClientes = async (
  params: Params = {},
): Promise<Cliente[]> => {
  const response = await api.get<Cliente[]>("/clientes/", { params });
  return response.data;
};

/** `unknown`: funcao sem nenhum chamador no app. */
export const fetchItensNota = async (params: Params = {}): Promise<unknown> => {
  const response = await api.get("/itens_nota/", { params });
  return response.data;
};

// Notas Fiscais de Serviço
export const fetchNotasServico = async (
  params: Params = {},
): Promise<NotaServico[]> => {
  const response = await api.get<NotaServico[]>("/notas_servico/", { params });
  return response.data;
};

// Buscar todas as configurações
export const fetchConfiguracoes = async (): Promise<Configuracao[]> => {
  const response = await api.get<Configuracao[]>("/configuracoes/");
  return response.data;
};

/** `unknown`: o ConfiguracoesContext descarta o retorno e atualiza o estado
 *  local com o valor que ele mesmo mandou. */
export const updateConfiguracao = async (
  chave: string,
  valor: string,
): Promise<unknown> => {
  const response = await api.put(`/configuracoes/${chave}`, { valor });
  return response.data;
};

// Criar nova configuração (opcional)
export const createConfiguracao = async (
  chave: string,
  valor: string,
): Promise<Configuracao> => {
  const response = await api.post<Configuracao>("/configuracoes/", {
    chave,
    valor,
  });
  return response.data;
};

// Estoque
export const fetchEstoque = async (
  params: Params = {},
): Promise<ProdutoEstoque[]> => {
  const response = await api.get<ProdutoEstoque[]>("/estoque/", { params });
  return response.data;
};

/** `unknown`: o DataContext descarta o retorno e atualiza a nota em memoria. */
export const updateNotaTipo = async (
  notaId: number,
  tipo: string,
): Promise<unknown> => {
  const response = await api.patch(`/notas_fiscais/${notaId}/tipo`, { tipo });
  return response.data;
};

// Contas a Pagar
export const fetchContasPagar = async (
  params: Params = {},
): Promise<ContaPagar[]> => {
  const response = await api.get<ContaPagar[]>("/contas_pagar/", { params });
  return response.data;
};

// Contas a Receber
export const fetchContasReceber = async (
  params: Params = {},
): Promise<ContaReceber[]> => {
  const response = await api.get<ContaReceber[]>("/contas_receber/", {
    params,
  });
  return response.data;
};

// Centro de Custo — resumo por produto/ano
export const fetchResumoProduto = async (
  produto: string,
  ano: number,
): Promise<ResumoProdutoMes[]> => {
  const response = await api.get<ResumoProdutoMes[]>(
    "/centro_custo/resumo_produto/",
    { params: { produto, ano, exato: true } },
  );
  return response.data;
};

// Centro de Custo — config manual (CMV, frete, etc.)
export const fetchCentroCustoConfig = async (
  produto: string,
  ano: number,
): Promise<CentroCustoConfig | null> => {
  const response = await api.get<CentroCustoConfig | null>(
    "/centro_custo/config/",
    { params: { produto, ano } },
  );
  return response.data;
};

/** `unknown`: a tela so olha o erro; o corpo da resposta nao e lido. */
export const salvarCentroCustoConfig = async (payload: {
  produto: string;
  ano: number;
  cmv_unitario: number | null;
  frete_unitario: number | null;
  outros_custos_unitario: number | null;
  config_json?: ConfigCentroCusto | null;
}): Promise<unknown> => {
  const response = await api.post("/centro_custo/config/", payload);
  return response.data;
};
