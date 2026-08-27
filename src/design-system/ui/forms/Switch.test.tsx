import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./Switch";

describe("Switch", () => {
  it("se anuncia como switch e alterna", async () => {
    const aoMudar = vi.fn();
    render(<Switch label="Tema escuro" onChange={aoMudar} />);
    await userEvent.click(screen.getByRole("switch", { name: "Tema escuro" }));
    expect(aoMudar).toHaveBeenCalled();
  });
});
