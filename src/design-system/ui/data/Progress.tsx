import { Icon } from "../core/Icon";

export interface ProgressProps {
  /** 0–100. Satura em 100 para não vazar do card. */
  value?: number;
  /** `ontrack` verde, `attention` âmbar, `breached` vermelho, `neutral` azul. */
  tone?: "ontrack" | "attention" | "breached" | "neutral";
  /** Leitura curta abaixo da barra: "62% do prazo". */
  label?: string;
  /** Texto completo no `title` — o que não cabe no rótulo. */
  detail?: string;
  /** Encerrado: troca a barra pelo resumo do resultado. */
  done?: boolean;
  doneLabel?: string;
}

const COR_PREENCHIMENTO: Record<NonNullable<ProgressProps["tone"]>, string> = {
  ontrack: "bg-success",
  attention: "bg-warning",
  breached: "bg-danger",
  neutral: "bg-action",
};

// Tailwind so gera a classe de largura arbitraria se o texto completo
// aparecer literal no arquivo-fonte: nao da para montar "w-[${n}%]" na hora,
// o scanner nao avalia expressao. Por isso o mapa e escrito por extenso, uma
// entrada por inteiro de 0 a 100 - a alternativa seria estilo inline para a
// largura, que o guarda de primitivos proibe.
const CLASSES_LARGURA: Record<number, string> = {
  0: "w-[0%]", 1: "w-[1%]", 2: "w-[2%]", 3: "w-[3%]", 4: "w-[4%]", 5: "w-[5%]", 6: "w-[6%]", 7: "w-[7%]", 8: "w-[8%]", 9: "w-[9%]",
  10: "w-[10%]", 11: "w-[11%]", 12: "w-[12%]", 13: "w-[13%]", 14: "w-[14%]", 15: "w-[15%]", 16: "w-[16%]", 17: "w-[17%]", 18: "w-[18%]", 19: "w-[19%]",
  20: "w-[20%]", 21: "w-[21%]", 22: "w-[22%]", 23: "w-[23%]", 24: "w-[24%]", 25: "w-[25%]", 26: "w-[26%]", 27: "w-[27%]", 28: "w-[28%]", 29: "w-[29%]",
  30: "w-[30%]", 31: "w-[31%]", 32: "w-[32%]", 33: "w-[33%]", 34: "w-[34%]", 35: "w-[35%]", 36: "w-[36%]", 37: "w-[37%]", 38: "w-[38%]", 39: "w-[39%]",
  40: "w-[40%]", 41: "w-[41%]", 42: "w-[42%]", 43: "w-[43%]", 44: "w-[44%]", 45: "w-[45%]", 46: "w-[46%]", 47: "w-[47%]", 48: "w-[48%]", 49: "w-[49%]",
  50: "w-[50%]", 51: "w-[51%]", 52: "w-[52%]", 53: "w-[53%]", 54: "w-[54%]", 55: "w-[55%]", 56: "w-[56%]", 57: "w-[57%]", 58: "w-[58%]", 59: "w-[59%]",
  60: "w-[60%]", 61: "w-[61%]", 62: "w-[62%]", 63: "w-[63%]", 64: "w-[64%]", 65: "w-[65%]", 66: "w-[66%]", 67: "w-[67%]", 68: "w-[68%]", 69: "w-[69%]",
  70: "w-[70%]", 71: "w-[71%]", 72: "w-[72%]", 73: "w-[73%]", 74: "w-[74%]", 75: "w-[75%]", 76: "w-[76%]", 77: "w-[77%]", 78: "w-[78%]", 79: "w-[79%]",
  80: "w-[80%]", 81: "w-[81%]", 82: "w-[82%]", 83: "w-[83%]", 84: "w-[84%]", 85: "w-[85%]", 86: "w-[86%]", 87: "w-[87%]", 88: "w-[88%]", 89: "w-[89%]",
  90: "w-[90%]", 91: "w-[91%]", 92: "w-[92%]", 93: "w-[93%]", 94: "w-[94%]", 95: "w-[95%]", 96: "w-[96%]", 97: "w-[97%]", 98: "w-[98%]", 99: "w-[99%]",
  100: "w-[100%]",
};

/**
 * Barra de consumo de prazo ou de progresso de etapa. Vem do `SlaProgresso`
 * do ChamadosHS. A barra satura em 100% para não vazar do card quando o
 * prazo já estourou — o quanto passou do previsto vai no texto, não na
 * largura da barra.
 *
 * `done` troca a barra inteira por uma linha de resumo (ícone + `doneLabel`)
 * — para quando a etapa ou o prazo já se encerrou e a barra deixou de fazer
 * sentido.
 *
 * ```tsx
 * <Progress value={62} tone="attention" label="62% do prazo" />
 * <Progress value={100} tone="breached" done doneLabel="Prazo estourado" />
 * ```
 */
export function Progress({
  value = 0,
  tone = "neutral",
  label,
  detail,
  done = false,
  doneLabel,
}: ProgressProps) {
  const largura = Math.min(100, Math.max(0, value));

  if (done) {
    return (
      <div
        className={[
          "flex items-center gap-1.5 text-xs font-medium",
          tone === "breached" ? "text-on-tint-danger" : "text-on-tint-success",
        ].join(" ")}
        title={detail}
      >
        <Icon name={tone === "breached" ? "warning" : "check"} size={14} strokeWidth={2} />
        <span className="truncate">{doneLabel}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-1" title={detail}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={largura}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1 w-full overflow-hidden rounded-full bg-surface-elevated"
      >
        <div
          className={[
            "h-full rounded-full transition-[width] duration-300 ease-in-out",
            COR_PREENCHIMENTO[tone],
            CLASSES_LARGURA[Math.round(largura)],
          ].join(" ")}
        />
      </div>
      {label ? (
        <div
          className={[
            "flex items-center gap-1.5 truncate text-xs font-medium",
            tone === "breached" ? "text-on-tint-danger" : "text-conteudo-muted",
          ].join(" ")}
        >
          {tone === "breached" ? <Icon name="warning" size={14} strokeWidth={2} /> : null}
          <span className="truncate">{label}</span>
        </div>
      ) : null}
    </div>
  );
}
