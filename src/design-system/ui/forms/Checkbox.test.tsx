import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("alterna ao clicar no rotulo", async () => {
    render(<Checkbox label="Somente ativos" />);
    const caixa = screen.getByRole("checkbox", { name: "Somente ativos" });
    expect(caixa).not.toBeChecked();
    await userEvent.click(screen.getByText("Somente ativos"));
    expect(caixa).toBeChecked();
  });

  it("desabilitado nao alterna", async () => {
    render(<Checkbox label="Somente ativos" disabled />);
    await userEvent.click(screen.getByText("Somente ativos"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
