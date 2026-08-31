import { useEffect, useRef, useState } from "react";

export interface MultiSelectDeContasProps {
  /** Rótulo do campo — "Situação", "Categoria", "Cliente", "Fornecedor". */
  rotulo: string;
  opcoes: string[];
  selecionadas: string[];
  onChange: (selecionadas: string[]) => void;
  /** O que o botão mostra quando nada está marcado — "Todas" / "Todos". */
  placeholder: string;
}

/**
 * A multi-seleção com busca das duas telas de Contas.
 *
 * Não virou primitivo do design system, e não foi trocada pelo `SearchSelect`,
 * por dois motivos medidos:
 *
 *  1. **`SearchSelect` é de seleção única.** Ele guarda `value: string` e
 *     fecha ao escolher. Os filtros de Contas são de seleção múltipla — "OU"
 *     dentro do campo, com contagem no gatilho ("2 selecionado(s)") e um
 *     "Limpar seleção". Não é a mesma peça com outra prop; é outra peça.
 *  2. **Ainda não é o mesmo componente nas oito telas.** A cópia deste
 *     multi-select vive em Vendas, Serviços, Clientes, Produtos, Vendedores,
 *     Estoque e nas duas de Contas. Promover a primitivo antes que as seis
 *     restantes migrem é decidir a API dele sem ver os seis usos — e é assim
 *     que se ganha uma prop por tela. Ele fica aqui, compartilhado pelas duas
 *     gêmeas, até a Fase 3 acabar; aí a promoção é um `git mv` com os seis
 *     usos na mão.
 *
 * A caixa de marcar é `<input type="checkbox">` cru, e não o `Checkbox` do
 * design system, porque o `Checkbox` esconde o campo dentro de um `<span>`
 * intermediário. Trocar mudaria a árvore que o teste de caracterização lê —
 * e a Fase 1 não muda comportamento. É item da Fase 2.
 */
export function MultiSelectDeContas({
  rotulo,
  opcoes,
  selecionadas,
  onChange,
  placeholder,
}: MultiSelectDeContasProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const envolvente = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoClicarFora = (evento: MouseEvent) => {
      if (envolvente.current && !envolvente.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const alternar = (opcao: string) => {
    onChange(
      selecionadas.includes(opcao)
        ? selecionadas.filter((atual) => atual !== opcao)
        : [...selecionadas, opcao],
    );
  };

  const filtradas = opcoes.filter((opcao) =>
    opcao.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="relative flex flex-col gap-1.5" ref={envolvente}>
      <label className="text-sm font-medium text-conteudo">{rotulo}</label>

      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={[
          "w-full rounded-lg border bg-surface px-3 py-2 text-left text-sm text-conteudo transition-colors",
          "hover:bg-surface-elevated",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
          aberto ? "border-action" : "border-borda",
        ].join(" ")}
      >
        <span className="text-sm text-conteudo">
          {selecionadas.length > 0 ? `${selecionadas.length} selecionado(s)` : placeholder}
        </span>
      </button>

      {aberto ? (
        <div className="absolute left-0 right-0 top-full z-dropdown mt-1 max-h-60 overflow-auto rounded-lg border border-borda bg-surface shadow-lg">
          <div className="border-b border-borda p-2">
            <input
              type="text"
              placeholder="Pesquisar..."
              aria-label={`Pesquisar em ${rotulo}`}
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              className={[
                "w-full rounded-md border border-borda bg-surface-base px-2 py-1 text-sm text-conteudo",
                "placeholder:text-conteudo-faint",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              ].join(" ")}
            />
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className={[
                "w-full rounded-md px-2 py-1 text-left text-sm text-conteudo-muted transition-colors",
                "hover:bg-surface-elevated",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              ].join(" ")}
            >
              Limpar seleção
            </button>
          </div>

          {filtradas.length > 0 ? (
            filtradas.map((opcao) => (
              <label
                key={opcao}
                className="flex cursor-pointer items-center px-4 py-2 transition-colors hover:bg-surface-elevated"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(opcao)}
                  onChange={() => alternar(opcao)}
                  className="mr-2 accent-action focus-visible:ring-2 focus-visible:ring-focus"
                />
                <span className="text-sm text-conteudo">{opcao}</span>
              </label>
            ))
          ) : (
            <p className="px-4 py-2 text-sm text-conteudo-muted">Nenhum resultado</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
