import type { NotaLocacao } from "../../services/notasapi";

/**
 * A conta da tela de Locação, separada da tela.
 *
 * Tudo aqui é função pura sobre a lista de notas que a API devolve: os três
 * KPIs, o que a busca casa, a ordem das linhas e as colunas da planilha.
 * A tela só decide quando chamar cada uma.
 */

export type CampoOrdenavel = "numero" | "data_emissao" | "cliente" | "valor";
export type Direcao = "asc" | "desc";

export interface Ordenacao {
  campo: CampoOrdenavel;
  direcao: Direcao;
}

/** Coluna e direção com que a tela abre: emissão, da mais nova para a mais antiga. */
export const ORDENACAO_INICIAL: Ordenacao = {
  campo: "data_emissao",
  direcao: "desc",
};

/**
 * O `valor_nota` chega como número, como string ou como `null`, conforme o
 * campo do Tiny. `parseFloat` para no primeiro caractere que não cabe num
 * número — então "1.234,56" vira 1,234, e não 1234,56. É o comportamento
 * que a tela sempre teve e que o teste de caracterização fixa; trocá-lo
 * mudaria valores já conferidos por gente.
 */
export function paraNumero(valor: number | string | null | undefined): number {
  if (valor == null) return 0;
  const numero = typeof valor === "number" ? valor : parseFloat(String(valor));
  return isNaN(numero) ? 0 : numero;
}

/** Número em reais, sem o "R$" — quem chama decide se põe o símbolo. */
export function emReais(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * "2026-07-10" e "2026-07-10T14:57:00" viram "10/07/2026".
 *
 * A conversão é feita na string, sem passar por `Date`: a API manda a data
 * sem fuso, e `new Date("2026-07-10")` seria lido como meia-noite em UTC —
 * no Brasil, o dia anterior.
 */
export function dataDaNota(data: string | null | undefined): string {
  if (!data) return "—";
  return data.split("T")[0].split("-").reverse().join("/");
}

export interface ResumoDeLocacao {
  /** Soma do valor de todas as notas. */
  total: number;
  quantidade: number;
  /** Total dividido pela quantidade; zero quando não há nota. */
  ticketMedio: number;
}

/**
 * Os três KPIs do topo. Recebe a lista INTEIRA, não a filtrada: os números
 * do topo descrevem a base de locação, e não o recorte que a busca deixou
 * na tabela.
 */
export function resumirLocacao(notas: NotaLocacao[]): ResumoDeLocacao {
  const total = notas.reduce((acc, nota) => acc + paraNumero(nota.valor_nota), 0);
  const quantidade = notas.length;
  return {
    total,
    quantidade,
    ticketMedio: quantidade > 0 ? total / quantidade : 0,
  };
}

/**
 * Busca livre sobre cliente, CNPJ, número da nota, vendedor e valor.
 *
 * O valor é comparado pelo número cru (`String(49000)` → "49000"), não pelo
 * que a tela mostra ("R$ 49.000,00"): quem digita "49.000,00" não acha nada.
 * Situação, natureza da operação e data ficam de fora da varredura.
 */
export function filtrarNotas(notas: NotaLocacao[], pesquisa: string): NotaLocacao[] {
  if (!pesquisa) return [...notas];

  const termo = pesquisa.toLowerCase();
  return notas.filter((nota) => {
    const nome = nota.cliente?.nome?.toLowerCase() || "";
    const cnpj = nota.cliente?.cpf_cnpj?.toLowerCase() || "";
    const numero = (nota.numero || "").toLowerCase();
    const vendedor = (nota.nome_vendedor || "").toLowerCase();
    return (
      nome.includes(termo) ||
      cnpj.includes(termo) ||
      numero.includes(termo) ||
      vendedor.includes(termo) ||
      String(paraNumero(nota.valor_nota)).includes(termo)
    );
  });
}

/** Valor comparável de cada coluna ordenável. */
const CHAVE_DE_ORDEM: Record<CampoOrdenavel, (nota: NotaLocacao) => number | string> = {
  data_emissao: (nota) => new Date(nota.data_emissao).getTime(),
  cliente: (nota) => nota.cliente?.nome || "",
  valor: (nota) => paraNumero(nota.valor_nota),
  numero: (nota) => nota.numero || "",
};

/**
 * Ordena por uma das quatro colunas, sem mexer na lista original.
 *
 * ATENÇÃO — o comparador abaixo nunca devolve 0. Para dois valores iguais
 * ele responde "o primeiro vem antes" tanto em `asc` quanto em `desc`, o
 * que é uma resposta contraditória: `comparar(a, b)` e `comparar(b, a)` dão
 * o mesmo sinal. O `Array.prototype.sort` do V8 reage invertendo o bloco
 * empatado, e com empate total as duas direções devolvem exatamente a mesma
 * sequência — clicar na seta não move nada.
 *
 * Está preservado de propósito: é o comportamento que a tela sempre teve, o
 * teste de caracterização o fixa, e consertá-lo é decisão de produto (muda a
 * ordem das notas de um mesmo dia), não parte da migração visual.
 */
export function ordenarNotas(notas: NotaLocacao[], { campo, direcao }: Ordenacao): NotaLocacao[] {
  const chave = CHAVE_DE_ORDEM[campo];
  return [...notas].sort((a, b) => {
    const x = chave(a);
    const y = chave(b);
    if (direcao === "asc") return x > y ? 1 : -1;
    return x < y ? 1 : -1;
  });
}

/**
 * Para onde a ordenação vai quando alguém clica num cabeçalho: coluna nova
 * entra em decrescente; clicar de novo na mesma coluna alterna a direção.
 */
export function proximaOrdenacao(atual: Ordenacao, campo: CampoOrdenavel): Ordenacao {
  return {
    campo,
    direcao: atual.campo === campo && atual.direcao === "desc" ? "asc" : "desc",
  };
}

export type TomDaSituacao = "success" | "warning" | "danger" | "muted";

/**
 * Cor do selo de situação. O rótulo continua carregando o significado — a
 * cor só o reforça, como o design system exige.
 *
 * O mapa é curto de propósito: só as palavras cujo sentido é inequívoco no
 * vocabulário do Tiny. Qualquer outra situação ("Emitida DANFE",
 * "Autorizada", "Registrada"...) fica em `success`, que é a cor que a tela
 * usava para todas antes desta migração.
 */
export function tomDaSituacao(situacao: string | null | undefined): TomDaSituacao {
  if (!situacao) return "muted";
  const texto = situacao.toLowerCase();
  if (/cancel|denegad|rejeit/.test(texto)) return "danger";
  if (/aguard|pendent/.test(texto)) return "warning";
  return "success";
}

/** Uma linha da planilha — as sete colunas exportadas, nesta ordem. */
export interface LinhaDaPlanilha {
  Número: string;
  Data: string;
  Cliente: string;
  CNPJ: string;
  Valor: number;
  Situação: string;
  Vendedor: string;
}

/**
 * As linhas que vão para o Excel — exatamente as que estão na tabela, no
 * recorte e na ordem em que a pessoa as deixou.
 *
 * A coluna "Data" passa por `new Date(...).toLocaleDateString("pt-BR")`,
 * que NÃO é o mesmo caminho de `dataDaNota` usada na tela. Como a API manda
 * a data sem fuso ("2026-07-10"), o `Date` a lê como meia-noite em UTC e no
 * Brasil ela volta um dia: a planilha sai com 09/07/2026 onde a tela mostra
 * 10/07/2026. Está preservado tal como estava — o conserto é decisão à
 * parte, porque muda o conteúdo de um arquivo que já circulou.
 */
export function linhasDaPlanilha(notas: NotaLocacao[]): LinhaDaPlanilha[] {
  return notas.map((nota) => ({
    Número: nota.numero || "",
    Data: new Date(nota.data_emissao).toLocaleDateString("pt-BR"),
    Cliente: nota.cliente?.nome || "",
    CNPJ: nota.cliente?.cpf_cnpj || "",
    Valor: paraNumero(nota.valor_nota),
    Situação: nota.descricao_situacao || "",
    Vendedor: nota.nome_vendedor || "",
  }));
}

/** Nome do arquivo exportado — `locacao_AAAA-MM-DD.xlsx`, data em UTC. */
export function nomeDoArquivo(hoje: Date = new Date()): string {
  return `locacao_${hoje.toISOString().split("T")[0]}.xlsx`;
}

/** Nome da aba dentro da planilha. */
export const ABA_DA_PLANILHA = "Locação";
