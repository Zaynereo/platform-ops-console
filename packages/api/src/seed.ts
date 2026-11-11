import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { DATA_PROVENANCE } from "@platform-ops/shared";

const FIXTURE_NOTE =
  "Synthetic fixture rows for portfolio demo — not production or employer telemetry.";

export function seedDatabase(db: Database.Database): void {
  const now = new Date();
  const iso = (offsetHours: number) =>
    new Date(now.getTime() - offsetHours * 3600_000).toISOString();

  const deliveries: Array<{
    id: string;
    event_type: string;
    destination: string;
    status: string;
    attempt_count: number;
    last_attempt_at: string | null;
    created_at: string;
    payload_preview: string;
    error_message: string | null;
  }> = [
    {
      id: "del_syn_001",
      event_type: "live.room.started",
      destination: "https://example.invalid/webhooks/live-core",
      status: "delivered",
      attempt_count: 1,
      last_attempt_at: iso(2),
      created_at: iso(3),
      payload_preview: '{"room_id":"syn_room_42","label":"SYNTHETIC"}',
      error_message: null,
    },
    {
      id: "del_syn_002",
      event_type: "live.gift.received",
      destination: "https://example.invalid/webhooks/live-core",
      status: "failed",
      attempt_count: 3,
      last_attempt_at: iso(1),
      created_at: iso(5),
      payload_preview: '{"gift_id":"syn_gift_7","label":"SYNTHETIC"}',
      error_message: "HTTP 503 from simulated upstream",
    },
    {
      id: "del_syn_003",
      event_type: "payment.settlement.completed",
      destination: "https://example.invalid/webhooks/payments",
      status: "dead_letter",
      attempt_count: 5,
      last_attempt_at: iso(4),
      created_at: iso(12),
      payload_preview: '{"order_id":"syn_ord_99","label":"SYNTHETIC"}',
      error_message: "Max retries exceeded",
    },
    {
      id: "del_syn_004",
      event_type: "payment.refund.requested",
      destination: "https://example.invalid/webhooks/payments",
      status: "pending",
      attempt_count: 0,
      last_attempt_at: null,
      created_at: iso(0.5),
      payload_preview: '{"refund_id":"syn_ref_3","label":"SYNTHETIC"}',
      error_message: null,
    },
    {
      id: "del_syn_005",
      event_type: "live.comment.moderated",
      destination: "https://example.invalid/webhooks/moderation",
      status: "delivered",
      attempt_count: 2,
      last_attempt_at: iso(6),
      created_at: iso(8),
      payload_preview: '{"comment_id":"syn_cmt_1","label":"SYNTHETIC"}',
      error_message: null,
    },
    {
      id: "del_syn_006",
      event_type: "inventory.reservation.failed",
      destination: "https://example.invalid/webhooks/marketplace",
      status: "dead_letter",
      attempt_count: 5,
      last_attempt_at: iso(10),
      created_at: iso(20),
      payload_preview: '{"sku":"syn_sku_x","label":"SYNTHETIC"}',
      error_message: "Destination timeout",
    },
  ];

  const insertDelivery = db.prepare(`
    INSERT INTO deliveries (
      id, event_type, destination, status, attempt_count, last_attempt_at,
      created_at, payload_preview, error_message, provenance
    ) VALUES (
      @id, @event_type, @destination, @status, @attempt_count, @last_attempt_at,
      @created_at, @payload_preview, @error_message, @provenance
    )
  `);

  const tx = db.transaction(() => {
    for (const d of deliveries) {
      insertDelivery.run({ ...d, provenance: DATA_PROVENANCE });
    }

    db.prepare(
      `INSERT INTO dead_letters (id, delivery_id, event_type, destination, failed_at, reason, replay_eligible, provenance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "dl_syn_001",
      "del_syn_003",
      "payment.settlement.completed",
      "https://example.invalid/webhooks/payments",
      iso(4),
      "Max retries exceeded — synthetic failure",
      1,
      DATA_PROVENANCE
    );

    db.prepare(
      `INSERT INTO dead_letters (id, delivery_id, event_type, destination, failed_at, reason, replay_eligible, provenance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "dl_syn_002",
      "del_syn_006",
      "inventory.reservation.failed",
      "https://example.invalid/webhooks/marketplace",
      iso(10),
      "Destination timeout — synthetic failure",
      1,
      DATA_PROVENANCE
    );

    db.prepare(
      `INSERT INTO audit_log (id, action, actor, resource_type, resource_id, detail, created_at, provenance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      "SYSTEM_SEED",
      "system",
      "database",
      "ops-console",
      FIXTURE_NOTE,
      iso(24),
      DATA_PROVENANCE
    );
  });

  tx();
}
