import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DeliveryTable } from "./DeliveryTable";
import type { Delivery } from "@platform-ops/shared";

const sample: Delivery = {
  id: "del_syn_001",
  eventType: "live.room.started",
  destination: "https://example.invalid/webhooks/live-core",
  status: "delivered",
  attemptCount: 1,
  lastAttemptAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  payloadPreview: "{}",
  errorMessage: null,
  provenance: "SYNTHETIC_FIXTURE",
};

describe("DeliveryTable", () => {
  it("shows empty state", () => {
    render(
      <MemoryRouter>
        <DeliveryTable items={[]} total={0} />
      </MemoryRouter>
    );
    expect(screen.getByText(/No deliveries match filters/)).toBeInTheDocument();
  });

  it("lists delivery row", () => {
    render(
      <MemoryRouter>
        <DeliveryTable items={[sample]} total={1} />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: sample.id })).toBeInTheDocument();
    expect(screen.getByText(sample.eventType)).toBeInTheDocument();
  });
});
