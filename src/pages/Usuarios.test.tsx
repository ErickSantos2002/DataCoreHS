import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Usuarios from "./Usuarios";
import { AuthContext } from "../context/AuthContext";
import { ToastProvider } from "../components/ToastProvider";
import type { Papel, Usuario } from "../services/api";

/**
 * Teste de caracterização da tela de Usuários.
 *
 * Fixa o comportamento que existia ANTES da migração para o design system.
 * A tela é a única guardiã de coisas que ninguém mais repete: a ordem das
 * três validações do formulário de criação, o payload exato de cada uma das
 * quatro chamadas de escrita, quem pode ser excluído e como a data de
 * criação vira texto. Um refactor que "arrume" qualquer um desses muda o que
 * chega no backend de autenticação — em silêncio, se ninguém tiver fixado.
 *
 * Tudo é observado pela tela renderizada, nunca por função exportada de
 * propósito para o teste: assim o teste sobrevive a quebrar a página em
 * componentes, que é exatamente o passo seguinte.
 *
 * Onde o comportamento de hoje parece errado, o teste fixa o que a tela FAZ,
 * com um comentário marcando a suspeita. Quem decide se é defeito é o Erick.
 */

const api = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getRoles: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserPassword: vi.fn(),
}));
vi.mock("../services/api", () => ({ ...api, default: {} }));

/** Quem está logado — trocado por teste antes de montar a tela. */
let usuarioLogado: { id: number; username: string; role: string } | null = {
  id: 1,
  username: "erick",
  role: "admin",
};

function Molde({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: usuarioLogado,
        token: "t",
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        error: null,
      }}
    >
      {/* ModalTrocarSenha usa useToast; sem o provider a tela nem monta. */}
      <ToastProvider>{children}</ToastProvider>
    </AuthContext.Provider>
  );
}

function usuario(campos: Partial<Usuario> & { id: number }): Usuario {
  return {
    username: `user${campos.id}`,
    role: { id: 5, name: "comum" },
    created_at: "2026-01-15T09:30:00",
    ...campos,
  };
}

const USUARIOS: Usuario[] = [
  usuario({
    id: 1,
    username: "erick",
    role: { id: 1, name: "admin" },
    created_at: "2026-01-15T09:30:00",
  }),
  usuario({
    id: 7,
    username: "maria",
    role: { id: 2, name: "vendas" },
    created_at: "2026-02-28T23:45:00",
  }),
  usuario({
    id: 9,
    username: "joao",
    role: { id: 5, name: "comum" },
    created_at: "2026-03-01T10:00:00",
  }),
];

const PAPEIS: Papel[] = [
  { id: 1, name: "admin" },
  { id: 2, name: "vendas" },
  { id: 3, name: "financeiro" },
  { id: 4, name: "servicos" },
  { id: 5, name: "comum" },
];

/** Os cinco perfis embutidos na tela, usados quando `getRoles` não responde. */
const PAPEIS_EMBUTIDOS = ["admin", "vendas", "financeiro", "servicos", "comum"];

async function montar(
  opcoes: { usuarios?: Usuario[]; papeis?: Papel[]; logado?: typeof usuarioLogado } = {},
) {
  if (opcoes.logado !== undefined) usuarioLogado = opcoes.logado;
  api.getUsers.mockResolvedValue(opcoes.usuarios ?? USUARIOS);
  api.getRoles.mockResolvedValue(opcoes.papeis ?? PAPEIS);
  const resultado = render(<Usuarios />, { wrapper: Molde });
  await screen.findByRole("table");
  return resultado;
}

/** Linhas de dado da tabela — sem a linha de cabeçalho. */
function linhasDaTabela(): HTMLElement[] {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1);
}

/** O conteúdo das células de cada linha, na ordem em que a tela desenhou. */
function celulasDaLinha(linha: HTMLElement): string[] {
  return within(linha)
    .getAllByRole("cell")
    .map((celula) => (celula.textContent ?? "").trim());
}

function linhaDe(username: string): HTMLElement {
  const linha = linhasDaTabela().find((l) =>
    within(l).queryByText(new RegExp(`^${username}`)),
  );
  if (!linha) throw new Error(`usuário "${username}" não está na tabela`);
  return linha;
}

/** Botão de ação da linha, achado pelo `title` (é o nome acessível dele). */
function acao(username: string, titulo: string | RegExp): HTMLElement {
  return within(linhaDe(username)).getByRole("button", { name: titulo });
}

/**
 * Os campos de senha visíveis, na ordem do DOM. Os `<label>` da tela não têm
 * `htmlFor` nem `id` no input, então `getByLabelText` não acha nenhum deles —
 * é o motivo de a busca ser por tipo. (Suspeita de acessibilidade anotada no
 * relatório; aqui só fixamos o que existe.)
 */
function camposDeSenha(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]'));
}

/**
 * O bloco de um modal aberto, achado pelo título e subindo até o ancestral
 * que também tem o botão Cancelar — assim o teste não depende da estrutura
 * de `<div>`s e continua valendo quando o modal virar primitivo do design
 * system. Necessário porque a tela deixa dois modais abertos ao mesmo tempo
 * e porque "Excluir" é ao mesmo tempo o título de um botão da linha.
 */
function modal(titulo: string | RegExp): HTMLElement {
  const cabecalho = screen.getByRole("heading", { name: titulo });
  let no: HTMLElement | null = cabecalho.parentElement;
  while (no && within(no).queryAllByRole("button", { name: "Cancelar" }).length === 0) {
    no = no.parentElement;
  }
  if (!no) throw new Error(`modal "${titulo}" não está aberto`);
  return no;
}

/** O `<select>` de perfil do único modal aberto. */
function selectDePerfil(): HTMLSelectElement {
  return screen.getByRole("combobox") as HTMLSelectElement;
}

function opcoesDoSelect(): string[] {
  return within(selectDePerfil())
    .getAllByRole("option")
    .map((o) => (o.textContent ?? "").trim());
}

/** Preenche o formulário de criação (usuário, senha, confirmação). */
async function preencherCriacao(
  usuarioTeclado: string,
  senha: string,
  confirmacao = senha,
) {
  const digitar = userEvent.setup();
  if (usuarioTeclado) await digitar.type(screen.getByRole("textbox"), usuarioTeclado);
  const [campoSenha, campoConfirma] = camposDeSenha();
  if (senha) await digitar.type(campoSenha, senha);
  if (confirmacao) await digitar.type(campoConfirma, confirmacao);
}

async function abrirCriar() {
  await userEvent.setup().click(screen.getByRole("button", { name: "Novo Usuário" }));
}

/** Erro devolvido pelo axios, no formato que a tela lê. */
function erroApi(detail: string) {
  return { response: { data: { detail } } };
}

beforeEach(() => {
  usuarioLogado = { id: 1, username: "erick", role: "admin" };
  api.getUsers.mockReset();
  api.getRoles.mockReset();
  api.createUser.mockReset().mockResolvedValue({});
  api.updateUser.mockReset().mockResolvedValue({});
  api.deleteUser.mockReset().mockResolvedValue({});
  api.updateUserPassword.mockReset().mockResolvedValue({});
});

describe("Usuários — carregamento", () => {
  it("mostra o aviso de carregando enquanto as duas chamadas não voltam", () => {
    api.getUsers.mockReturnValue(new Promise(() => {}));
    api.getRoles.mockResolvedValue(PAPEIS);
    render(<Usuarios />, { wrapper: Molde });

    expect(screen.getByText("Carregando usuários...")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("busca usuários e perfis uma vez só ao abrir a tela", async () => {
    await montar();

    expect(api.getUsers).toHaveBeenCalledTimes(1);
    expect(api.getRoles).toHaveBeenCalledTimes(1);
  });

  it("falha ao buscar usuários é silenciosa: tabela vazia e nenhuma mensagem de erro", async () => {
    // O `catch` da tela não guarda nada; o usuário vê uma tabela vazia e não
    // fica sabendo que a chamada falhou. É o comportamento de hoje.
    api.getUsers.mockRejectedValue(new Error("500"));
    api.getRoles.mockResolvedValue(PAPEIS);
    render(<Usuarios />, { wrapper: Molde });

    await screen.findByRole("table");
    expect(linhasDaTabela()).toHaveLength(0);
    expect(screen.getByText(/0 usuários cadastrados/)).toBeInTheDocument();
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });

  it("falha ao buscar perfis derruba junto a lista de usuários que já tinha voltado", async () => {
    // Suspeita: as duas chamadas estão no mesmo `Promise.all`, então o
    // /roles fora do ar esvazia a tabela de usuários — mesmo com o /users OK.
    api.getUsers.mockResolvedValue(USUARIOS);
    api.getRoles.mockRejectedValue(new Error("500"));
    render(<Usuarios />, { wrapper: Molde });

    await screen.findByRole("table");
    expect(linhasDaTabela()).toHaveLength(0);
  });
});

describe("Usuários — tabela", () => {
  it("desenha uma linha por usuário, com id, nome, perfil e data de criação", async () => {
    await montar();

    const linhas = linhasDaTabela();
    expect(linhas).toHaveLength(3);
    expect(celulasDaLinha(linhas[0]).slice(0, 4)).toEqual([
      "1",
      "erick(você)",
      "admin",
      "15/01/2026",
    ]);
    expect(celulasDaLinha(linhas[1]).slice(0, 4)).toEqual([
      "7",
      "maria",
      "vendas",
      "28/02/2026",
    ]);
    expect(celulasDaLinha(linhas[2]).slice(0, 4)).toEqual([
      "9",
      "joao",
      "comum",
      "01/03/2026",
    ]);
  });

  it("a contagem do subtítulo bate com o número de linhas", async () => {
    await montar({ usuarios: USUARIOS.slice(0, 2) });

    expect(screen.getByText(/2 usuários cadastrados/)).toBeInTheDocument();
    expect(linhasDaTabela()).toHaveLength(2);
  });

  it("sem nenhum usuário mostra a tabela só com o cabeçalho, sem aviso de lista vazia", async () => {
    // Suspeita: as outras telas do sistema dizem "Nenhum ... encontrado";
    // esta deixa o corpo da tabela em branco.
    await montar({ usuarios: [] });

    expect(linhasDaTabela()).toHaveLength(0);
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "#",
      "Usuário",
      "Perfil",
      "Criado em",
      "Ações",
    ]);
    expect(screen.getByText(/0 usuários cadastrados/)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum/i)).not.toBeInTheDocument();
  });

  it("usuário sem perfil aparece com travessão na coluna Perfil", async () => {
    await montar({
      usuarios: [usuario({ id: 3, username: "orfao", role: undefined as unknown as Papel })],
    });

    expect(celulasDaLinha(linhasDaTabela()[0])[2]).toBe("—");
  });

  it("data que o navegador não sabe ler vira o texto 'Invalid Date' na célula", async () => {
    // Suspeita: `formatarData` não valida nada. Um `created_at` vazio ou fora
    // do padrão sai cru na tela em inglês, no meio de uma tabela em português.
    await montar({ usuarios: [usuario({ id: 3, created_at: "" })] });

    expect(celulasDaLinha(linhasDaTabela()[0])[3]).toBe("Invalid Date");
  });
});

describe("Usuários — data de criação e fuso", () => {
  it("data-hora sem fuso rende o mesmo dia que a API mandou, em qualquer fuso", async () => {
    // "2026-02-28T23:45:00" (sem Z) é lido como hora LOCAL, então o dia não
    // se move: 28/02 em TZ=UTC e em TZ=America/Sao_Paulo.
    await montar({
      usuarios: [usuario({ id: 3, created_at: "2026-02-28T23:45:00" })],
    });

    expect(celulasDaLinha(linhasDaTabela()[0])[3]).toBe("28/02/2026");
  });

  it("data pura, sem hora, volta um dia em fuso negativo", async () => {
    // Suspeita — é o mesmo defeito que a tela de Locação tinha: "2026-01-15"
    // é lido como meia-noite UTC, e em UTC-3 isso ainda é dia 14 às 21h.
    // O teste roda verde nos dois fusos porque diz o que cada um mostra.
    const atrasado = new Date("2026-01-15").getTimezoneOffset() > 0;
    await montar({ usuarios: [usuario({ id: 3, created_at: "2026-01-15" })] });

    expect(celulasDaLinha(linhasDaTabela()[0])[3]).toBe(
      atrasado ? "14/01/2026" : "15/01/2026",
    );
  });

  it("data-hora em UTC (com Z) de madrugada também volta um dia em fuso negativo", async () => {
    // Se o backend passar a mandar o instante em UTC, 02:00Z do dia 15 é
    // 23:00 do dia 14 em Brasília — e é o 14 que aparece na tabela.
    const atrasado = new Date("2026-01-15T02:00:00Z").getTimezoneOffset() > 0;
    await montar({
      usuarios: [usuario({ id: 3, created_at: "2026-01-15T02:00:00Z" })],
    });

    expect(celulasDaLinha(linhasDaTabela()[0])[3]).toBe(
      atrasado ? "14/01/2026" : "15/01/2026",
    );
  });
});

describe("Usuários — o próprio usuário logado", () => {
  it("marca com (você) só a linha de quem está logado", async () => {
    await montar();

    expect(within(linhaDe("erick")).getByText("(você)")).toBeInTheDocument();
    expect(screen.getAllByText("(você)")).toHaveLength(1);
  });

  it("sem ninguém logado, nenhuma linha ganha o (você)", async () => {
    await montar({ logado: null });

    expect(screen.queryByText("(você)")).not.toBeInTheDocument();
  });

  it("o (você) segue o id, não o nome — outro id com o mesmo nome não é marcado", async () => {
    await montar({ logado: { id: 7, username: "erick", role: "admin" } });

    expect(within(linhaDe("maria")).getByText("(você)")).toBeInTheDocument();
    expect(within(linhaDe("erick")).queryByText("(você)")).not.toBeInTheDocument();
  });

  it("o botão de excluir do próprio usuário fica desabilitado, com o motivo no title", async () => {
    await montar();

    const botao = acao("erick", "Não é possível excluir seu próprio usuário");
    expect(botao).toBeDisabled();
  });

  it("o botão de excluir dos outros fica habilitado e se chama Excluir", async () => {
    await montar();

    expect(acao("maria", "Excluir")).toBeEnabled();
  });

  it("editar e trocar senha continuam liberados na própria linha", async () => {
    await montar();

    expect(acao("erick", "Editar")).toBeEnabled();
    expect(acao("erick", "Trocar senha")).toBeEnabled();
  });
});

describe("Usuários — modal de criação", () => {
  it("abre pelo botão Novo Usuário, com os campos em branco e o perfil comum", async () => {
    await montar();
    await abrirCriar();

    expect(screen.getByRole("heading", { name: "Novo Usuário" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(camposDeSenha().map((c) => c.value)).toEqual(["", ""]);
    expect(selectDePerfil()).toHaveValue("comum");
  });

  it("recusa nome de usuário vazio", async () => {
    await montar();
    await abrirCriar();
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(screen.getByText("Informe um nome de usuário.")).toBeInTheDocument();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it("recusa nome de usuário só com espaços", async () => {
    await montar();
    await abrirCriar();
    await preencherCriacao("   ", "senha123");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(screen.getByText("Informe um nome de usuário.")).toBeInTheDocument();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it("recusa senha com menos de 6 caracteres", async () => {
    await montar();
    await abrirCriar();
    await preencherCriacao("novo", "12345");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(screen.getByText("A senha deve ter pelo menos 6 caracteres.")).toBeInTheDocument();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it("recusa confirmação diferente da senha", async () => {
    await montar();
    await abrirCriar();
    await preencherCriacao("novo", "senha123", "senha124");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it("valida na ordem: nome antes de senha curta, senha curta antes de divergência", async () => {
    await montar();
    await abrirCriar();
    // Tudo errado de uma vez: só a primeira mensagem aparece.
    await preencherCriacao("", "123", "999");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));
    expect(screen.getByText("Informe um nome de usuário.")).toBeInTheDocument();

    await preencherCriacao("novo", "", "");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));
    expect(screen.getByText("A senha deve ter pelo menos 6 caracteres.")).toBeInTheDocument();
  });

  it("cria o usuário com o payload exato, fecha o modal e recarrega a lista", async () => {
    const digitar = userEvent.setup();
    await montar();
    await abrirCriar();
    await preencherCriacao("  novato  ", "senha123");
    await digitar.selectOptions(selectDePerfil(), "financeiro");
    await digitar.click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(api.createUser).toHaveBeenCalledTimes(1);
    expect(api.createUser).toHaveBeenCalledWith({
      username: "novato",
      password: "senha123",
      role_name: "financeiro",
    });
    await screen.findByRole("table");
    expect(screen.queryByRole("heading", { name: "Novo Usuário" })).not.toBeInTheDocument();
    // Recarregou: segunda ida ao /users e ao /roles.
    expect(api.getUsers).toHaveBeenCalledTimes(2);
    expect(api.getRoles).toHaveBeenCalledTimes(2);
  });

  it("depois de criar com sucesso, o formulário reabre limpo", async () => {
    const digitar = userEvent.setup();
    await montar();
    await abrirCriar();
    await preencherCriacao("novato", "senha123");
    await digitar.click(screen.getByRole("button", { name: "Criar Usuário" }));
    await screen.findByRole("table");

    await abrirCriar();
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(camposDeSenha().map((c) => c.value)).toEqual(["", ""]);
    expect(selectDePerfil()).toHaveValue("comum");
  });

  it("o que foi digitado sobrevive ao Cancelar e reaparece na próxima abertura", async () => {
    // Suspeita: o Cancelar só esconde o modal — os quatro campos continuam no
    // estado da página. Quem desistiu de criar reabre com o rascunho antigo,
    // senha inclusive.
    const digitar = userEvent.setup();
    await montar();
    await abrirCriar();
    await preencherCriacao("rascunho", "senha123");
    await digitar.selectOptions(selectDePerfil(), "vendas");
    await digitar.click(screen.getByRole("button", { name: "Cancelar" }));

    await abrirCriar();
    expect(screen.getByRole("textbox")).toHaveValue("rascunho");
    expect(camposDeSenha().map((c) => c.value)).toEqual(["senha123", "senha123"]);
    expect(selectDePerfil()).toHaveValue("vendas");
  });

  it("mostra o detail que a API devolveu quando a criação falha", async () => {
    api.createUser.mockRejectedValue(erroApi("Usuário já existe"));
    await montar();
    await abrirCriar();
    await preencherCriacao("novato", "senha123");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(await screen.findByText("Usuário já existe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Novo Usuário" })).toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledTimes(1);
  });

  it("sem detail na resposta, cai na mensagem genérica de criação", async () => {
    api.createUser.mockRejectedValue(new Error("Network Error"));
    await montar();
    await abrirCriar();
    await preencherCriacao("novato", "senha123");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(await screen.findByText("Erro ao criar usuário.")).toBeInTheDocument();
  });
});

describe("Usuários — perfis do select", () => {
  it("lista os perfis que vieram do getRoles", async () => {
    await montar({ papeis: [{ id: 9, name: "suporte" }, { id: 10, name: "comum" }] });
    await abrirCriar();

    expect(opcoesDoSelect()).toEqual(["suporte", "comum"]);
  });

  it("com o getRoles fora do ar, o select cai nos cinco perfis embutidos na tela", async () => {
    api.getUsers.mockResolvedValue(USUARIOS);
    api.getRoles.mockRejectedValue(new Error("500"));
    render(<Usuarios />, { wrapper: Molde });
    await screen.findByRole("table");
    await abrirCriar();

    expect(opcoesDoSelect()).toEqual(PAPEIS_EMBUTIDOS);
  });

  it("se a API não devolve 'comum', o select mostra um perfil e o payload manda outro", async () => {
    // Suspeita: o estado inicial do perfil é a string "comum", chutada pela
    // tela e não tirada da lista de perfis. Quando a API não tem "comum", o
    // campo MOSTRA o primeiro perfil da lista e MANDA "comum" — quem preenche
    // lê "suporte" na tela e cria um usuário comum.
    await montar({ papeis: [{ id: 9, name: "suporte" }] });
    await abrirCriar();
    expect(selectDePerfil().value).toBe("suporte");

    await preencherCriacao("novato", "senha123");
    await userEvent.setup().click(screen.getByRole("button", { name: "Criar Usuário" }));

    expect(api.createUser).toHaveBeenCalledWith({
      username: "novato",
      password: "senha123",
      role_name: "comum",
    });
  });
});

describe("Usuários — modal de edição", () => {
  it("abre pré-preenchido com o nome e o perfil do usuário clicado", async () => {
    await montar();
    await userEvent.setup().click(acao("maria", "Editar"));

    expect(screen.getByRole("heading", { name: "Editar — maria" })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("maria");
    expect(selectDePerfil()).toHaveValue("vendas");
  });

  it("usuário sem perfil abre a edição em comum", async () => {
    await montar({
      usuarios: [usuario({ id: 3, username: "orfao", role: undefined as unknown as Papel })],
    });
    await userEvent.setup().click(acao("orfao", "Editar"));

    expect(selectDePerfil()).toHaveValue("comum");
  });

  it("salva chamando updateUser com o id e o payload exatos, e recarrega", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Editar"));
    await digitar.clear(screen.getByRole("textbox"));
    await digitar.type(screen.getByRole("textbox"), "  maria.silva  ");
    await digitar.selectOptions(selectDePerfil(), "financeiro");
    await digitar.click(screen.getByRole("button", { name: "Salvar" }));

    expect(api.updateUser).toHaveBeenCalledTimes(1);
    expect(api.updateUser).toHaveBeenCalledWith(7, {
      username: "maria.silva",
      role_name: "financeiro",
    });
    await screen.findByRole("table");
    expect(screen.queryByRole("heading", { name: /^Editar/ })).not.toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledTimes(2);
  });

  it("recusa salvar com o nome de usuário vazio", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Editar"));
    await digitar.clear(screen.getByRole("textbox"));
    await digitar.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("Informe um nome de usuário.")).toBeInTheDocument();
    expect(api.updateUser).not.toHaveBeenCalled();
  });

  it("mostra o detail da API, e a mensagem genérica quando ele não vem", async () => {
    const digitar = userEvent.setup();
    api.updateUser.mockRejectedValue(erroApi("Nome já em uso"));
    await montar();
    await digitar.click(acao("maria", "Editar"));
    await digitar.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Nome já em uso")).toBeInTheDocument();

    api.updateUser.mockRejectedValue(new Error("Network Error"));
    await digitar.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Erro ao atualizar usuário.")).toBeInTheDocument();
  });

  it("Cancelar fecha a edição sem chamar a API", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Editar"));
    await digitar.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("heading", { name: /^Editar/ })).not.toBeInTheDocument();
    expect(api.updateUser).not.toHaveBeenCalled();
  });
});

describe("Usuários — modal de exclusão", () => {
  it("pergunta antes, nomeando o usuário", async () => {
    await montar();
    await userEvent.setup().click(acao("joao", "Excluir"));

    const caixa = modal("Confirmar Exclusão");
    expect(within(caixa).getByText(/Tem certeza que deseja excluir o usuário/)).toBeInTheDocument();
    expect(within(caixa).getByText("joao")).toBeInTheDocument();
  });

  it("confirmando, chama deleteUser com o id certo e recarrega a lista", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("joao", "Excluir"));
    await digitar.click(within(modal("Confirmar Exclusão")).getByRole("button", { name: "Excluir" }));

    expect(api.deleteUser).toHaveBeenCalledTimes(1);
    expect(api.deleteUser).toHaveBeenCalledWith(9);
    await screen.findByRole("table");
    expect(
      screen.queryByRole("heading", { name: "Confirmar Exclusão" }),
    ).not.toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledTimes(2);
  });

  it("Cancelar fecha sem excluir", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("joao", "Excluir"));
    await digitar.click(within(modal("Confirmar Exclusão")).getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByRole("heading", { name: "Confirmar Exclusão" }),
    ).not.toBeInTheDocument();
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it("mostra o detail da API, e a mensagem genérica quando ele não vem", async () => {
    const digitar = userEvent.setup();
    api.deleteUser.mockRejectedValue(erroApi("Usuário tem notas vinculadas"));
    await montar();
    await digitar.click(acao("joao", "Excluir"));
    const confirmar = within(modal("Confirmar Exclusão")).getByRole("button", { name: "Excluir" });
    await digitar.click(confirmar);
    expect(await screen.findByText("Usuário tem notas vinculadas")).toBeInTheDocument();

    api.deleteUser.mockRejectedValue(new Error("Network Error"));
    await digitar.click(confirmar);
    expect(await screen.findByText("Erro ao excluir usuário.")).toBeInTheDocument();
  });
});

describe("Usuários — modal de troca de senha", () => {
  it("troca a senha chamando updateUserPassword com o id e a senha, e fecha", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Trocar senha"));

    const [nova, repita] = camposDeSenha();
    await digitar.type(nova, "outrasenha");
    await digitar.type(repita, "outrasenha");
    await digitar.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(api.updateUserPassword).toHaveBeenCalledTimes(1);
    expect(api.updateUserPassword).toHaveBeenCalledWith(7, "outrasenha");
    expect(screen.queryByRole("heading", { name: "Trocar Senha" })).not.toBeInTheDocument();
  });

  it("senhas diferentes viram aviso e não chamam a API", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Trocar senha"));

    const [nova, repita] = camposDeSenha();
    await digitar.type(nova, "outrasenha");
    await digitar.type(repita, "outrasenh4");
    await digitar.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(api.updateUserPassword).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Trocar Senha" })).toBeInTheDocument();
  });

  it("aceita senha vazia: aqui não há o mínimo de 6 caracteres da criação", async () => {
    // Suspeita: a criação exige 6 caracteres, a troca não exige nada — dá
    // para gravar senha em branco em um usuário existente.
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Trocar senha"));
    await digitar.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(api.updateUserPassword).toHaveBeenCalledWith(7, "");
  });

  it("a senha digitada continua nos campos na próxima vez que o modal abre", async () => {
    // Suspeita: o ModalTrocarSenha nunca desmonta (só devolve null quando
    // fechado), então o estado dele sobrevive. Abrir para OUTRO usuário e
    // clicar em Confirmar reenvia a senha digitada da vez anterior.
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Trocar senha"));
    const [nova, repita] = camposDeSenha();
    await digitar.type(nova, "senha-da-maria");
    await digitar.type(repita, "senha-da-maria");
    await digitar.click(screen.getByRole("button", { name: "Cancelar" }));

    await digitar.click(acao("joao", "Trocar senha"));
    expect(camposDeSenha().map((c) => c.value)).toEqual([
      "senha-da-maria",
      "senha-da-maria",
    ]);

    await digitar.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(api.updateUserPassword).toHaveBeenCalledWith(9, "senha-da-maria");
  });

  it("fecha o modal antes de a API responder, sem conferir o resultado", async () => {
    // Suspeita: `handleTrocarSenha` não tem try/catch e o ModalTrocarSenha
    // chama `onClose()` na mesma linha do `onConfirm()`. O modal some assim
    // que se clica em Confirmar, mesmo com a requisição ainda em voo — e se
    // ela falhar não há nada na tela dizendo isso. (A falha de verdade não é
    // testável aqui: sem catch ela vira "unhandled rejection" e derruba a
    // suíte inteira, o que já é o achado.)
    const digitar = userEvent.setup();
    api.updateUserPassword.mockReturnValue(new Promise(() => {}));
    await montar();
    await digitar.click(acao("maria", "Trocar senha"));
    await digitar.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(api.updateUserPassword).toHaveBeenCalledWith(7, "");
    expect(screen.queryByRole("heading", { name: "Trocar Senha" })).not.toBeInTheDocument();
    expect(screen.queryByText(/erro/i)).not.toBeInTheDocument();
  });

  it("trocar senha não recarrega a lista", async () => {
    const digitar = userEvent.setup();
    await montar();
    await digitar.click(acao("maria", "Trocar senha"));
    await digitar.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(api.getUsers).toHaveBeenCalledTimes(1);
  });
});

describe("Usuários — a mensagem de erro é uma só para todos os modais", () => {
  it("com dois modais abertos, o erro de um aparece dentro do outro também", async () => {
    // Suspeita: `erroModal` é um único estado compartilhado pelos modais de
    // criar, editar e excluir. Nada impede que dois estejam abertos ao mesmo
    // tempo, e aí a mesma frase é desenhada duas vezes — uma delas no modal
    // que não tem nada a ver com o erro.
    const digitar = userEvent.setup();
    await montar();
    await abrirCriar();
    await digitar.click(acao("joao", "Excluir"));

    expect(screen.getByRole("heading", { name: "Novo Usuário" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirmar Exclusão" })).toBeInTheDocument();

    await digitar.click(screen.getByRole("button", { name: "Criar Usuário" }));
    expect(screen.getAllByText("Informe um nome de usuário.")).toHaveLength(2);
  });

  it("abrir qualquer um dos três modais limpa o erro que sobrou do anterior", async () => {
    const digitar = userEvent.setup();
    await montar();
    await abrirCriar();
    await digitar.click(screen.getByRole("button", { name: "Criar Usuário" }));
    expect(screen.getByText("Informe um nome de usuário.")).toBeInTheDocument();

    await digitar.click(screen.getByRole("button", { name: "Cancelar" }));
    await digitar.click(acao("maria", "Editar"));
    expect(screen.queryByText("Informe um nome de usuário.")).not.toBeInTheDocument();
  });
});
