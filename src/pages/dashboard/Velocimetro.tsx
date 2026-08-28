import { Icon } from "../../design-system/ui";

const RAIO = 60;
const CIRCUNFERENCIA = Math.PI * RAIO;
/** Semicírculo de 20,80 a 140,80 — o mesmo arco para o fundo e para o valor. */
const ARCO = "M20 80 A60 60 0 0 1 140 80";

export interface VelocimetroProps {
  /** Percentual já calculado, de 0 a 100. NaN e fora de faixa viram 0..100. */
  progresso?: number;
  /** Quanto o trimestre realizou até agora. */
  valor?: number;
  /** O degrau que este velocímetro mede. */
  degrau: number;
  /** Classe Tailwind de `stroke` — cor do arco preenchido. */
  corDoArco: string;
  /** O PL que este degrau paga: "55%", "85%", "100%". */
  rotuloBonus: string;
}

/**
 * Velocímetro semicircular de um degrau de bonificação: arco de fundo, arco
 * colorido proporcional, o percentual alcançado e quanto falta em reais.
 *
 * O arco é SVG puro, sem biblioteca de gráfico — é um traço só, e um
 * `strokeDasharray` proporcional resolve o desenho inteiro.
 */
export function Velocimetro({
  progresso = 0,
  valor = 0,
  degrau,
  corDoArco,
  rotuloBonus,
}: VelocimetroProps) {
  // Meta zero faz `progresso` chegar como NaN (0 dividido por 0). Sem esta
  // rede o arco recebe `strokeDasharray="NaN"` e some da tela.
  const percentual = isNaN(progresso) ? 0 : Math.min(Math.max(progresso, 0), 100);
  const traco = (percentual / 100) * CIRCUNFERENCIA;
  const falta = degrau - valor;

  return (
    <div className="flex w-full flex-col items-center p-2">
      <svg width="180" height="100" viewBox="0 0 160 100" aria-hidden="true">
        <path
          d={ARCO}
          fill="none"
          className="stroke-borda"
          strokeWidth="12"
        />
        <path
          d={ARCO}
          fill="none"
          className={corDoArco}
          strokeWidth="12"
          strokeDasharray={`${traco}, ${CIRCUNFERENCIA}`}
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-2 text-center">
        <p className="text-sm text-conteudo-muted">Progresso</p>
        <p className="text-xl font-bold text-action">{percentual.toFixed(1)}%</p>
        <p className="text-sm text-conteudo-muted">
          Valor Atual:{" "}
          <span className="font-semibold text-success">
            R$ {valor.toLocaleString("pt-BR")}
          </span>
        </p>
        {falta > 0 ? (
          <p className="text-sm text-conteudo-muted">
            Diferença até a meta:{" "}
            <span className="text-danger">
              R$
              {falta.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1 text-sm font-semibold text-success">
            <Icon name="check" size={16} strokeWidth={2} />
            Meta atingida!
          </p>
        )}
      </div>

      <p className="mt-1 text-xs text-conteudo-muted">{rotuloBonus}</p>
    </div>
  );
}
