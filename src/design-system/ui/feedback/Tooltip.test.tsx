import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("aparece ao focar o gatilho, nao so ao passar o mouse", async () => {
    render(
      <Tooltip label="Recolher menu">
        <button type="button">Menu</button>
      </Tooltip>,
    );
    await userEvent.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Recolher menu");
  });
});
