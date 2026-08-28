import { Card, CardTitle } from "../../design-system/ui";
import type { FaturamentoMensal } from "./ResumoTrimestre";

export interface FaturamentoPorMesProps {
  meses: FaturamentoMensal[];
}

/** "Junho/2026" → "Junho". O ano é o mesmo em toda a barra; repeti-lo em
 *  cada rótulo só rouba largura de um card estreito. */
function nomeDoMes(mes: string): string {
  return mes.split("/")[0];
}

/**
 * Os mesmos meses do trimestre, em barras.
 *
 * Anda ao lado de "Trimestre Atual" de propósito: a lista responde "quanto
 * exatamente", a barra responde "qual mês puxou" — a comparação entre meses
 * é instantânea no desenho e trabalhosa na lista. Nenhum número novo entra
 * aqui; é o mesmo dado do contexto, lido de outro jeito.
 *
 * A escala é o maior mês do período, não a meta: o que esta barra compara é
 * mês contra mês. A distância até a meta já é o assunto dos velocímetros.
 */
export function FaturamentoPorMes({ meses }: FaturamentoPorMesProps) {
  const maior = meses.reduce((maximo, item) => Math.max(maximo, item.total), 0);

  return (
    <Card padding="lg">
      <CardTitle>Faturamento por mês (R$ mil)</CardTitle>

      {meses.length === 0 ? (
        <p className="mt-4 text-sm text-conteudo-muted">
          Nenhum mês do trimestre foi apurado ainda. As barras aparecem aqui
          quando as notas do período são sincronizadas com o Tiny ERP.
        </p>
      ) : (
        <div className="mt-5 flex h-44 items-end gap-3">
          {meses.map((item) => (
            <div
              key={item.mes}
              className="flex h-full flex-1 flex-col items-center gap-1.5"
            >
              <span className="font-mono text-xs text-conteudo-muted">
                {Math.round(item.total / 1000).toLocaleString("pt-BR")}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-primary-500"
                  style={{
                    height: maior > 0 ? `${(item.total / maior) * 100}%` : "0%",
                  }}
                />
              </div>
              <span className="text-xs text-conteudo-muted">
                {nomeDoMes(item.mes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
