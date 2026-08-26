import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal, ModalFooter } from "./Modal";
import { Button } from "../core/Button";

describe("Modal", () => {
  it("nao renderiza nada quando fechado", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Trocar senha">
        conteúdo
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("se anuncia como dialogo modal, com titulo", () => {
    render(
      <Modal open onClose={() => {}} title="Trocar senha">
        conteúdo
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Trocar senha" })).toBeInTheDocument();
  });

  it("Esc fecha", async () => {
    const aoFechar = vi.fn();
    render(
      <Modal open onClose={aoFechar} title="Trocar senha">
        conteúdo
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(aoFechar).toHaveBeenCalled();
  });

  it("prende o foco dentro dele", async () => {
    render(
      <Modal open onClose={() => {}} title="Trocar senha">
        <ModalFooter>
          <Button variant="secondary">Cancelar</Button>
          <Button>Salvar</Button>
        </ModalFooter>
      </Modal>,
    );
    const dialogo = screen.getByRole("dialog");
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });
});
