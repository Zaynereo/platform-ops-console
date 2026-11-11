import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders accessible status label", () => {
    render(<StatusBadge status="dead_letter" />);
    expect(screen.getByLabelText("Status dead_letter")).toHaveTextContent("dead letter");
  });
});
