import React, { useMemo, useState } from "react";

import {
  Card,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../design-system/ui";
import { useContasPagar } from "../context/ContasPagarContext";
import { useContasReceber } from "../context/ContasReceberContext";
import { useServicos } from "../context/ServicosContext";
import { useVendas } from "../context/VendasContext";
import AbaCentroCusto from "./financeiro/AbaCentroCusto";
import AbaMeta from "./financeiro/AbaMeta";
import { AbaBalancete } from "./financeiro/AbaBalancete";
import { AbaVisaoGeral } from "./financeiro/AbaVisaoGeral";
import {
  ANOS,
  alternarAno,
  combinarPorTipo,
  kpisPorAno,
  montarBalancete,
  pontosAcumulados,
  pontosComparativos,
  somaDoAno,
  somarServicos,
  somarVendas,
  variacaoMensal,
  type Ano,
  type TipoDeReceita,
} from "./financeiro/financeiro";

/** As quatro abas da tela, na ordem em que aparecem. */
const ABAS = [
  { valor: "visaoGeral", rotulo: "Visão Geral" },
  { valor: "balancete", rotulo: "Balancete" },
  { valor: "centroCusto", rotulo: "Centro de Custo" },
  { valor: "meta", rotulo: "Meta" },
] as const;

/**
 * Gerenciamento Financeiro — a receita da empresa vista de quatro ângulos.
 *
 * A tela é o esqueleto: junta os quatro contextos, guarda o que a pessoa
 * escolheu (aba, anos ligados, tipo de receita, ano do balancete e ano do
 * centro de custo) e entrega cada recorte pronto para a aba correspondente.
 * As contas moram em `financeiro/financeiro.ts`, o desenho nos componentes
 * ao lado.
 *
 * O ano do Centro de Custo é estado DAQUI, e não da aba: sair para o
 * Balancete e voltar não pode devolver a aba de custo ao ano padrão.
 */
const GerenciamentoFinanceiro: React.FC = () => {
  const { notas, carregando: carregandoVendas } = useVendas();
  const { servicosEnriquecidos, carregando: carregandoServicos } = useServicos();
  const { contas: contasPagar, carregando: carregandoPagar } = useContasPagar();
  // Chamado pelo efeito colateral: o provider busca as contas a receber ao
  // montar, e outras telas contam com elas já em memória. A tela não lê nada.
  useContasReceber();

  const [abaAtiva, setAbaAtiva] = useState<string>("visaoGeral");
  const [anosAtivos, setAnosAtivos] = useState<Set<Ano>>(new Set(ANOS));
  const [tipo, setTipo] = useState<TipoDeReceita>("combinado");
  const [anoBalancete, setAnoBalancete] = useState<number>(2026);
  const [anoCentro, setAnoCentro] = useState(2025);

  const vendasPorAnoMes = useMemo(() => somarVendas(notas), [notas]);
  const servicosPorAnoMes = useMemo(
    () => somarServicos(servicosEnriquecidos),
    [servicosEnriquecidos],
  );

  const total = useMemo(
    () => combinarPorTipo(tipo, vendasPorAnoMes, servicosPorAnoMes),
    [tipo, vendasPorAnoMes, servicosPorAnoMes],
  );

  const kpis = useMemo(
    () => kpisPorAno(total, notas, servicosEnriquecidos, tipo),
    [total, notas, servicosEnriquecidos, tipo],
  );
  const comparativo = useMemo(
    () => pontosComparativos(total, anosAtivos),
    [total, anosAtivos],
  );
  const acumulado = useMemo(
    () => pontosAcumulados(total, anosAtivos),
    [total, anosAtivos],
  );
  const variacao = useMemo(() => variacaoMensal(total), [total]);

  const balancete = useMemo(
    () =>
      montarBalancete(
        vendasPorAnoMes,
        servicosPorAnoMes,
        contasPagar,
        anoBalancete,
      ),
    [vendasPorAnoMes, servicosPorAnoMes, contasPagar, anoBalancete],
  );

  /**
   * O faturamento do ano passado que a aba Meta usa como base de comparação.
   *
   * Sai das séries CRUAS, e não do `total`: se respeitasse o filtro de tipo,
   * o bônus projetado da empresa mudaria conforme o botão que alguém tivesse
   * deixado clicado na Visão Geral.
   */
  const anoAnterior = new Date().getFullYear() - 1;
  const faturamentoAnoAnterior = useMemo(
    () =>
      somaDoAno(vendasPorAnoMes, anoAnterior) +
      somaDoAno(servicosPorAnoMes, anoAnterior),
    [vendasPorAnoMes, servicosPorAnoMes, anoAnterior],
  );

  if (carregandoVendas || carregandoServicos || carregandoPagar) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base px-6 py-16 text-conteudo-muted md:h-full md:min-h-0">
        <Spinner size="lg" />
        <p>Carregando dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base p-6 transition-colors md:h-full md:min-h-0">
      <Tabs
        value={abaAtiva}
        onChange={setAbaAtiva}
        className="flex flex-col gap-4"
      >
        <Card padding="lg">
          <h1 className="text-3xl font-bold text-conteudo-heading">
            Gerenciamento Financeiro
          </h1>
          <p className="mt-1 text-sm text-conteudo-muted">
            Análise comparativa de receitas 2022 · 2023 · 2024 · 2025 · 2026 —
            Vendas e Serviços
          </p>
          <TabsList className="mt-4">
            {ABAS.map(({ valor, rotulo }) => (
              <TabsTrigger key={valor} value={valor}>
                {rotulo}
              </TabsTrigger>
            ))}
          </TabsList>
        </Card>

        <TabsContent value="visaoGeral">
          <AbaVisaoGeral
            anosAtivos={anosAtivos}
            onAlternarAno={(ano) =>
              setAnosAtivos((atuais) => alternarAno(atuais, ano))
            }
            tipo={tipo}
            onTipo={setTipo}
            kpis={kpis}
            total={total}
            comparativo={comparativo}
            acumulado={acumulado}
            variacao={variacao}
          />
        </TabsContent>

        <TabsContent value="balancete">
          <AbaBalancete
            ano={anoBalancete}
            onAno={setAnoBalancete}
            balancete={balancete}
          />
        </TabsContent>

        <TabsContent value="centroCusto">
          <AbaCentroCusto anoCentro={anoCentro} setAnoCentro={setAnoCentro} />
        </TabsContent>

        <TabsContent value="meta">
          <AbaMeta
            faturamentoAnoAnterior={faturamentoAnoAnterior}
            anoAnterior={anoAnterior}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GerenciamentoFinanceiro;
