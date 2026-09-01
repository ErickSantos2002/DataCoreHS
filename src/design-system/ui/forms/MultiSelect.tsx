import { useEffect, useRef, useState } from "react";
import type { EstrategiaDeBusca, OpcaoDeMultiSelect } from "./buscaDeMultiSelect";
import { buscaPorTexto } from "./buscaDeMultiSelect";

export interface MultiSelectProps {
  opcoes: OpcaoDeMultiSelect[];
  selecionados: string[];
  onChange: (selecionados: string[]) => void;
  placeholder: string;
  /** Como o termo digitado casa com uma opção. Ver `buscaDeMultiSelect.ts`. */
  buscarPor?: EstrategiaDeBusca;
}

/**
 * Seletor de múltiplas opções com busca — filtro de barra de tela (empresa,
 * produto, vendedor, cidade). Extraído de seis cópias divergentes que as
 * telas carregavam cada uma dentro de si mesma (Produtos, Serviços,
 * Vendedores, Estoque, Clientes, Vendas); a estratégia de casar o termo com
 * a opção varia por tela e por isso é injetável (`buscarPor`, default
 * `buscaPorTexto`) em vez de fixa aqui — ver `buscaDeMultiSelect.ts`.
 *
 * Botão e painel são irmãos dentro do mesmo `<div className="relative">`,
 * sem portal: o painel só precisa flutuar sobre a própria barra de filtros,
 * não escapar de contêiner nenhum, e a Task 2 já mostrou que portal aqui
 * quebra o escopo de teste (`botao.parentElement`) que as seis telas usam
 * para achar o dropdown. O `<label>` de cada opção envolve o
 * `<input type="checkbox">` e o texto diretamente — sem `htmlFor` —
 * porque é essa associação implícita que dá ao checkbox seu nome acessível;
 * checkbox e span soltos, ou ligados por `htmlFor`, quebrariam a busca por
 * nome acessível que os 41 testes de caracterização fazem.
 *
 * O painel NÃO fecha ao marcar uma opção. Nas seis cópias originais ele
 * fechava, mas por acidente: o componente era declarado dentro da página
 * dona do estado, então `onChange` recriava o componente a cada marcação e
 * ele remontava do zero, resetando `isOpen`. Fora da página esse acidente
 * não existe mais — e ficar aberto para marcar mais de uma opção em
 * sequência é o comportamento correto, não uma regressão.
 *
 * ```tsx
 * <MultiSelect
 *   opcoes={deTextos(produtos)}
 *   selecionados={produtosSelecionados}
 *   onChange={setProdutosSelecionados}
 *   placeholder="Todos os produtos"
 * />
 * ```
 */
export function MultiSelect({
  opcoes,
  selecionados,
  onChange,
  placeholder,
  buscarPor = buscaPorTexto,
}: MultiSelectProps) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function alternar(valor: string) {
    if (selecionados.includes(valor)) {
      onChange(selecionados.filter((s) => s !== valor));
    } else {
      onChange([...selecionados, valor]);
    }
  }

  const opcoesFiltradas = opcoes.filter((opcao) => buscarPor(opcao, termo));

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((valor) => !valor)}
        className={[
          "w-full rounded-lg border bg-surface px-3 py-2 text-left transition-colors",
          "border-borda hover:bg-surface-elevated",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
        ].join(" ")}
      >
        <span className="text-sm text-conteudo">
          {selecionados.length > 0 ? `${selecionados.length} selecionado(s)` : placeholder}
        </span>
      </button>

      {aberto ? (
        <div className="absolute z-dropdown mt-1 max-h-60 w-full overflow-auto rounded-lg border border-borda bg-surface shadow-lg">
          <div className="border-b border-borda p-2">
            <input
              type="text"
              placeholder="Pesquisar..."
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              className={[
                "w-full rounded border border-borda bg-surface px-2 py-1 text-conteudo",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              ].join(" ")}
            />
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => onChange([])}
              className={[
                "w-full rounded px-2 py-1 text-left text-sm text-conteudo-muted",
                "hover:bg-surface-elevated",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              ].join(" ")}
            >
              Limpar seleção
            </button>
          </div>

          {opcoesFiltradas.length > 0 ? (
            opcoesFiltradas.map((opcao) => (
              <label
                key={opcao.valor}
                className="flex cursor-pointer items-center px-4 py-2 hover:bg-surface-elevated"
              >
                <input
                  type="checkbox"
                  checked={selecionados.includes(opcao.valor)}
                  onChange={() => alternar(opcao.valor)}
                  className="mr-2"
                />
                <span className="text-conteudo">{opcao.rotulo}</span>
              </label>
            ))
          ) : (
            <div className="px-4 py-2 text-conteudo-muted">Nenhum resultado encontrado</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
