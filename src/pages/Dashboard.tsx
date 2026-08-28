import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../context/DashboardContext";
import { useConfiguracoes } from "../context/ConfiguracoesContext";
import { Card, CardTitle, Spinner } from "../design-system/ui";
import { CabecalhoMeta } from "./dashboard/CabecalhoMeta";
import { ResumoTrimestre } from "./dashboard/ResumoTrimestre";
import { Velocimetro } from "./dashboard/Velocimetro";
import { degrausDaMeta } from "./dashboard/metaTrimestral";
import { useComemoracaoMeta } from "./dashboard/useComemoracaoMeta";

/** Percentual de um degrau, travado em 100% — passar da meta não estica o arco. */
function progressoAte(total: number, degrau: number): number {
  return Math.min((total / degrau) * 100, 100);
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { dados, total, carregando, totalAno } = useDashboard();
  const { configuracoes } = useConfiguracoes();

  const metaConfig = configuracoes.find((c) => c.chave === "META");
  const { degrau55, degrau85, degrau100 } = degrausDaMeta(metaConfig?.valor);

  const animacaoConfig = configuracoes.find((c) => c.chave === "ANIMACAO_META");

  useComemoracaoMeta({
    habilitada: animacaoConfig?.valor === "true",
    carregando,
    total,
    degrau55,
    degrau85,
    degrau100,
  });

  if (carregando) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base px-6 py-16 text-conteudo-muted md:min-h-0 md:h-full">
        <Spinner size="lg" />
        <p>Carregando os dados da meta do trimestre.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base p-6 transition-colors md:min-h-0 md:h-full">
      <CabecalhoMeta usuario={user} />

      <Card padding="lg" className="mt-4 w-full">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <CardTitle className="mb-4 text-lg">
              Relatório de Faturamento e Bonificação
            </CardTitle>
            <p className="max-w-sm text-justify text-conteudo">
              Esta página exibe o{" "}
              <strong className="text-conteudo-heading">
                faturamento total do trimestre atual
              </strong>
              , considerando as Notas Fiscais de Venda e Serviço. Ao lado, temos
              um <strong className="text-conteudo-heading">gráfico velocímetro</strong>{" "}
              com faixas de bonificação. Ao atingir cada marcação, a equipe
              receberá um{" "}
              <strong className="text-conteudo-heading">PL proporcional</strong>{" "}
              à porcentagem alcançada da meta.
            </p>
          </div>

          <div className="flex w-full flex-col lg:col-span-3">
            <div className="flex justify-center lg:justify-end">
              <CardTitle className="mb-4 text-lg">Trimestre Atual</CardTitle>
            </div>

            <div className="flex w-full flex-col gap-8 md:flex-row">
              <div className="md:w-1/3">
                <ResumoTrimestre meses={dados} totalAno={totalAno} />
              </div>

              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Velocimetro
                  progresso={progressoAte(total, degrau55)}
                  degrau={degrau55}
                  valor={total}
                  corDoArco="stroke-warning"
                  rotuloBonus="55%"
                />
                <Velocimetro
                  progresso={progressoAte(total, degrau85)}
                  degrau={degrau85}
                  valor={total}
                  corDoArco="stroke-primary-500"
                  rotuloBonus="85%"
                />
                <Velocimetro
                  progresso={progressoAte(total, degrau100)}
                  degrau={degrau100}
                  valor={total}
                  corDoArco="stroke-success"
                  rotuloBonus="100%"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
