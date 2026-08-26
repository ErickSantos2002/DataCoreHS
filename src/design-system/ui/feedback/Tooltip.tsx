import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export interface TooltipProps {
  /** Uma linha, sem ponto final. */
  label: string;
  position?: "top" | "right" | "bottom" | "left";
  /** Um único elemento que aceite `aria-describedby` — o gatilho do tooltip. */
  children?: ReactNode;
}

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
 * O balão é escuro nos dois temas, de propósito (`bg-tooltip`/
 * `text-tooltip-fg`): ele flutua acima de qualquer superfície e precisa se
 * destacar tanto sobre card branco quanto sobre navy.
 *
 * ```tsx
 * <Tooltip label="Recolher menu">
 *   <Button variant="ghost" icon={<Icon name="menu" size={16} strokeWidth={2} />} />
 * </Tooltip>
 * ```
 */
export function Tooltip({ label, position = "top", children }: TooltipProps) {
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
          "pointer-events-none absolute z-[60] whitespace-nowrap rounded-lg bg-tooltip px-2.5 py-1.5 text-xs font-medium text-tooltip-fg opacity-0 shadow-lg transition-opacity duration-150 ease-in-out",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          POSITION_CLASSES[position],
        ].join(" ")}
      >
        {label}
      </span>
    </span>
  );
}
