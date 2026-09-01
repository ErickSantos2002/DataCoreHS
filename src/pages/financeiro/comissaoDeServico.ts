/**
 * A comissão da equipe de serviço, sem React.
 *
 * É um modelo completamente diferente do de vendas: não há comissão por
 * pessoa nem por venda. O faturamento de serviços do mês cai numa escada de
 * metas que produz **um valor de referência**, e cada pessoa recebe uma
 * fração dele conforme o papel.
 *
 * A regra foi lida das fórmulas da planilha de fechamento — não existe em
 * lugar nenhum além dela.
 */

interface Degrau {
  /** O piso do degrau. */
  piso: number;
  /** `true` quando o próprio piso já conta; `false` quando é "acima de". */
  pisoInclusivo: boolean;
  /** Prêmio fixo somado. */
  premio: number;
  /** Se soma também 1% do faturamento. */
  comPercentual: boolean;
}

/**
 * A escada, em ordem decrescente: vale o primeiro degrau que o faturamento
 * alcança.
 *
 * Escrever os degraus como dados, e não como corrente de `if` aninhado, é o
 * que fecha os buracos: com `if` encadeado, cada degrau precisava repetir o
 * limite do vizinho, e foi de uma dessas repetições — `>125000` de um lado e
 * `>=125000` do outro — que nasceram os três valores que pagavam zero.
 *
 * Os dois degraus de baixo abrem em "acima de", e não "a partir de", porque é
 * o que a planilha faz e não é engano: 100.000 exatos ainda são o prêmio fixo
 * de 250, e 80.000 exatos ainda não pagam nada.
 */
const DEGRAUS: Degrau[] = [
  { piso: 200_000, pisoInclusivo: true, premio: 1_000, comPercentual: true },
  { piso: 175_000, pisoInclusivo: true, premio: 750, comPercentual: true },
  { piso: 150_000, pisoInclusivo: true, premio: 500, comPercentual: true },
  { piso: 125_000, pisoInclusivo: true, premio: 250, comPercentual: true },
  // Entre 100.000 e 125.000 paga só o percentual, sem prêmio.
  { piso: 100_000, pisoInclusivo: false, premio: 0, comPercentual: true },
  // O degrau de entrada é o único que NÃO paga percentual: é prêmio fixo. Por
  // isso 100.000 paga 250 e 100.000,01 dá o salto para 1.000.
  { piso: 80_000, pisoInclusivo: false, premio: 250, comPercentual: false },
];

function alcanca(faturamento: number, degrau: Degrau): boolean {
  return degrau.pisoInclusivo
    ? faturamento >= degrau.piso
    : faturamento > degrau.piso;
}

/** A fração do faturamento de serviços que entra nos degraus com percentual. */
export const PERCENTUAL_DE_SERVICO = 0.01;

/**
 * O valor de referência do mês, a partir do faturamento de serviços.
 *
 * ⚠️ Difere da planilha em três pontos, de propósito e com autorização: lá,
 * faturamento **exatamente** 125.000, 150.000 ou 175.000 pagava **zero**,
 * porque um degrau abria com `>` e o seguinte fechava com `>=` e o valor
 * exato escapava dos dois. Aqui cada degrau abre no próprio valor.
 */
export function comissaoBaseDeServico(faturamentoDeServicos: number): number {
  const degrau = DEGRAUS.find((candidato) =>
    alcanca(faturamentoDeServicos, candidato),
  );
  if (!degrau) return 0;
  return (
    degrau.premio +
    (degrau.comPercentual ? faturamentoDeServicos * PERCENTUAL_DE_SERVICO : 0)
  );
}

export interface PessoaDeServico {
  id: string;
  nome: string;
  /** Fração do valor de referência que o papel recebe — 1 é 100%. */
  percentual: number;
}

/**
 * A equipe de serviço e o percentual de cada papel, como está na planilha.
 *
 * É ponto de partida editável na tela, não regra travada: quem ocupa o papel
 * muda, e o fechamento não pode depender de alguém mexer no código.
 */
export const EQUIPE_PADRAO: PessoaDeServico[] = [
  { id: "papel-1", nome: "Papel 1", percentual: 1 },
  { id: "papel-2", nome: "Papel 2", percentual: 0.75 },
  { id: "papel-3", nome: "Papel 3", percentual: 0.5 },
];

export interface LinhaDeServico extends PessoaDeServico {
  valor: number;
}

export interface FechamentoDeServico {
  /** O valor de referência da escada. NÃO é o que sai do caixa. */
  base: number;
  linhas: LinhaDeServico[];
  totalAPagar: number;
}

/**
 * O fechamento de serviço do mês.
 *
 * `base` e `totalAPagar` são números diferentes e é importante que sejam: os
 * percentuais dos papéis somam 225%, então a base é uma referência
 * multiplicada por pessoa, e não um bolo repartido entre elas. Ler a base
 * como o custo do mês subestima o pagamento em mais da metade.
 */
export function calcularComissaoDeServico(
  faturamentoDeServicos: number,
  equipe: PessoaDeServico[],
): FechamentoDeServico {
  const base = comissaoBaseDeServico(faturamentoDeServicos);
  const linhas = equipe.map((pessoa) => ({
    ...pessoa,
    valor: base * pessoa.percentual,
  }));
  return {
    base,
    linhas,
    totalAPagar: linhas.reduce((soma, linha) => soma + linha.valor, 0),
  };
}
