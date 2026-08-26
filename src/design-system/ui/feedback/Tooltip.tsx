import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export interface TooltipProps {
  /** Uma linha, sem ponto final. */
  content: string;
  position?: "top" | "right" | "bottom" | "left";
  /** Um único elemento que aceite `aria-describedby` — o gatilho do tooltip. */
  children?: ReactNode;
}

// O balão do original é sempre escuro nos dois temas: fundo cinza quase
// preto fixo, texto branco. Aqui não há token equivalente para esse cinza —
// a rampa neutra é a ponte de paleta das telas velhas, proibida em
// primitivo — e hexadecimal arbitrário também não passa no guarda de cor. A
// solução usa o par invertido: `bg-conteudo-heading` (o texto principal do
// tema) como fundo e `text-surface` (a superfície do tema) como texto. Como
// um sempre contrasta com o outro dentro do mesmo tema, o balão sai legível
// nos dois — claro no escuro, escuro no claro — em vez de sempre escuro como
// o original.
const POSITION_CLASSES: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-3 -translate-y-1/2",
  left: "right-full top-1/2 mr-3 -translate-y-1/2",
};

/**
 * Rótulo no hover — para ícone sem texto e para texto cortado. Aparece no
 * `hover` e no `focus`, então cobre teclado sem estado nenhum: `group` no
 * envolvente, `group-hover`/`group-focus-within` no balão.
 *
 * O balão fica sempre no DOM e é referenciado por `aria-describedby` no
 * filho — sem isso o texto existe para leitor de tela mas desconectado do
 * controle que ele descreve, o oposto do que `role="tooltip"` promete.
 * Por isso `children` precisa ser um único elemento que aceite props
 * (`React.cloneElement` aplica o `aria-describedby` nele).
 *
 * ```tsx
 * <Tooltip content="Recolher menu">
 *   <Button variant="ghost" icon={<Icon name="menu" size={16} strokeWidth={2} />} />
 * </Tooltip>
 * ```
 */
export function Tooltip({ content, position = "top", children }: TooltipProps) {
  const id = useId();

  const gatilho = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
        "aria-describedby": id,
      })
    : children;

  return (
    <span className="group relative inline-flex">
      {gatilho}
      <span
        role="tooltip"
        id={id}
        className={[
          "pointer-events-none absolute z-[60] whitespace-nowrap rounded-lg bg-conteudo-heading px-2.5 py-1.5 text-xs font-medium text-surface opacity-0 shadow-lg transition-opacity duration-150 ease-in-out",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          POSITION_CLASSES[position],
        ].join(" ")}
      >
        {content}
      </span>
    </span>
  );
}
