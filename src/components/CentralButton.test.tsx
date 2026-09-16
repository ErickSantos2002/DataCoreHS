import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CentralButton from "./CentralButton";

/**
 * O botão flutuante que leva para a Central HS.
 *
 * Não tinha teste. O que se trava aqui é o que ele faz — o nome acessível, o
 * destino do clique e o rótulo que aparece no hover —, para que a troca das
 * cores da ponte de paleta por tokens não mexa em nada disso.
 */

const abrir = vi.spyOn(window, "open").mockImplementation(() => null);

afterEach(() => {
  abrir.mockClear();
});

describe("CentralButton", () => {
  it("e um botao com nome, e nao so um icone", () => {
    render(<CentralButton />);
    expect(
      screen.getByRole("button", { name: "Ir para Central HS" }),
    ).toBeInTheDocument();
  });

  it("abre a Central HS noutra aba", () => {
    render(<CentralButton />);

    fireEvent.click(screen.getByRole("button", { name: "Ir para Central HS" }));

    expect(abrir).toHaveBeenCalledWith(
      "https://centralhs.healthsafetytech.com",
      "_blank",
    );
  });

  it("o rotulo aparece no hover e some ao sair", () => {
    render(<CentralButton />);
    const botao = screen.getByRole("button", { name: "Ir para Central HS" });
    expect(screen.queryByText("Central HS")).not.toBeInTheDocument();

    fireEvent.mouseEnter(botao);
    expect(screen.getByText("Central HS")).toBeInTheDocument();

    fireEvent.mouseLeave(botao);
    expect(screen.queryByText("Central HS")).not.toBeInTheDocument();
  });
});
