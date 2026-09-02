import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FiltrosDeContas } from "./FiltrosDeContas";

/**
 * Caracterização dos três MultiSelect da barra de filtros de Contas, escrita
 * contra `MultiSelectDeContas` como ela é hoje — antes de ela ser fundida no
 * primitivo do design system.
 *
 * A peça velha nunca teve teste, e é ela que faz certo o que o primitivo faz
 * errado: liga o gatilho ao rótulo e ao valor por `aria-labelledby`, então o
 * nome acessível do botão é "Situação Todas", e não só "Todas". É por isso que
 * os helpers daqui compõem rótulo e valor.
 *
 * Este arquivo é o critério de aceitação da fusão: depois que Contas passar a
 * consumir o primitivo, ele tem que passar SEM UMA EDIÇÃO.
 */

const OPCOES = {
  situacao: ["Em aberto", "Quitado"],
  categoria: ["Servicos prestados", "Materiais"],
  contraparte: ["Alfa Mineração", "Beta Logística"],
};

const VALORES_VAZIOS = {
  situacao: [],
  categoria: [],
  contraparte: [],
  dataInicio: "",
  dataFim: "",
};

function montar(sobrescreve: Partial<Parameters<typeof FiltrosDeContas>[0]> = {}) {
  const props = {
    rotuloDaContraparte: "Cliente",
    opcoes: OPCOES,
    valores: VALORES_VAZIOS,
    preset: "todos",
    onSituacao: vi.fn(),
    onCategoria: vi.fn(),
    onContraparte: vi.fn(),
    onPreset: vi.fn(),
    onDataInicio: vi.fn(),
    onDataFim: vi.fn(),
    ...sobrescreve,
  };
  render(<FiltrosDeContas {...props} />);
  return props;
}

/** O gatilho daquele filtro. O nome acessível é "<rótulo> <valor>". */
function gatilho(rotulo: string, valor: string) {
  return screen.getByRole("button", { name: `${rotulo} ${valor}` });
}

function abrir(rotulo: string, valor: string) {
  fireEvent.click(gatilho(rotulo, valor));
}

/** O painel daquele filtro — botão e painel são irmãos no mesmo container. */
function painel(rotulo: string, valor: string) {
  return gatilho(rotulo, valor).parentElement as HTMLElement;
}

describe("MultiSelect na barra de filtros de Contas", () => {
  it("o gatilho anuncia o rotulo junto com o estado", () => {
    montar();
    expect(gatilho("Situação", "Todas")).toBeInTheDocument();
    expect(gatilho("Categoria", "Todas")).toBeInTheDocument();
    expect(gatilho("Cliente", "Todos")).toBeInTheDocument();
  });

  it("com selecao, o gatilho troca o placeholder pela contagem", () => {
    montar({ valores: { ...VALORES_VAZIOS, situacao: ["Em aberto"] } });
    expect(gatilho("Situação", "1 selecionado(s)")).toBeInTheDocument();
  });

  it("o rotulo da contraparte muda com a tela", () => {
    montar({ rotuloDaContraparte: "Fornecedor" });
    expect(gatilho("Fornecedor", "Todos")).toBeInTheDocument();
  });

  it("abrir mostra as opcoes daquele filtro, e so daquele", () => {
    montar();
    abrir("Situação", "Todas");
    const dentro = within(painel("Situação", "Todas"));
    expect(dentro.getByRole("checkbox", { name: "Em aberto" })).toBeInTheDocument();
    expect(dentro.getByRole("checkbox", { name: "Quitado" })).toBeInTheDocument();
    expect(dentro.queryByRole("checkbox", { name: "Materiais" })).toBeNull();
  });

  it("a busca filtra a lista daquele filtro", () => {
    montar();
    abrir("Categoria", "Todas");
    const dentro = within(painel("Categoria", "Todas"));
    fireEvent.change(dentro.getByPlaceholderText("Pesquisar..."), {
      target: { value: "mater" },
    });
    expect(dentro.getByRole("checkbox", { name: "Materiais" })).toBeInTheDocument();
    expect(dentro.queryByRole("checkbox", { name: "Servicos prestados" })).toBeNull();
  });

  it("sem resultado, diz que nao achou", () => {
    montar();
    abrir("Categoria", "Todas");
    const dentro = within(painel("Categoria", "Todas"));
    fireEvent.change(dentro.getByPlaceholderText("Pesquisar..."), {
      target: { value: "zzz" },
    });
    expect(dentro.getByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("marcar avisa o pai com o valor acrescentado", () => {
    const props = montar();
    abrir("Situação", "Todas");
    fireEvent.click(
      within(painel("Situação", "Todas")).getByRole("checkbox", { name: "Quitado" }),
    );
    expect(props.onSituacao).toHaveBeenCalledWith(["Quitado"]);
  });

  it("marcar de novo o que ja estava avisa o pai com o valor removido", () => {
    const props = montar({
      valores: { ...VALORES_VAZIOS, situacao: ["Quitado"] },
    });
    abrir("Situação", "1 selecionado(s)");
    fireEvent.click(
      within(painel("Situação", "1 selecionado(s)")).getByRole("checkbox", {
        name: "Quitado",
      }),
    );
    expect(props.onSituacao).toHaveBeenCalledWith([]);
  });

  it("'Limpar selecao' zera aquele filtro", () => {
    const props = montar({
      valores: { ...VALORES_VAZIOS, categoria: ["Materiais"] },
    });
    abrir("Categoria", "1 selecionado(s)");
    fireEvent.click(
      within(painel("Categoria", "1 selecionado(s)")).getByRole("button", {
        name: "Limpar seleção",
      }),
    );
    expect(props.onCategoria).toHaveBeenCalledWith([]);
  });

  it("clicar fora fecha o dropdown", () => {
    montar();
    abrir("Situação", "Todas");
    expect(
      within(painel("Situação", "Todas")).getByPlaceholderText("Pesquisar..."),
    ).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(
      within(painel("Situação", "Todas")).queryByPlaceholderText("Pesquisar..."),
    ).toBeNull();
  });
});
