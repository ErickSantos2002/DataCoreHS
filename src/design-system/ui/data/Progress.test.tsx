import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./Progress";

describe("Progress", () => {
  it("se anuncia como barra de progresso com o valor", () => {
    render(<Progress value={40} label="Meta do mês" />);
    const barra = screen.getByRole("progressbar", { name: "Meta do mês" });
    expect(barra).toHaveAttribute("aria-valuenow", "40");
  });

  it("satura em 100 para nao vazar do card", () => {
    render(<Progress value={140} label="Prazo" />);
    const barra = screen.getByRole("progressbar", { name: "Prazo" });
    expect(barra).toHaveAttribute("aria-valuenow", "100");
  });

  it("quando encerrado, troca a barra pelo resumo do resultado", () => {
    render(<Progress value={100} done doneLabel="Concluído" label="Prazo" />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("Concluído")).toBeInTheDocument();
  });
});
