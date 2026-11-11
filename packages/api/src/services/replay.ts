import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { ReplayResult } from "@platform-ops/shared";

const SIMULATION_MESSAGE =
  "Replay simulated locally only — no outbound HTTP was performed.";

export function replayDeadLetter(
  db: Database.Database,
  deadLetterId: string,
  idempotencyKey: string,
  actor: string
): ReplayResult | { error: string; statusCode: number } {
  const existing = db
    .prepare(`SELECT result_json FROM replay_idempotency WHERE idempotency_key = ?`)
    .get(idempotencyKey) as { result_json: string } | undefined;

  if (existing) {
    const parsed = JSON.parse(existing.result_json) as ReplayResult;
    return { ...parsed, duplicate: true };
  }

  const deadLetter = db
    .prepare(`SELECT * FROM dead_letters WHERE id = ?`)
    .get(deadLetterId) as
    | {
        id: string;
        delivery_id: string;
        replay_eligible: number;
      }
    | undefined;

  if (!deadLetter) {
    return { error: "Dead letter not found", statusCode: 404 };
  }

  if (!deadLetter.replay_eligible) {
    return { error: "Dead letter is not eligible for replay", statusCode: 400 };
  }

  const delivery = db
    .prepare(`SELECT status FROM deliveries WHERE id = ?`)
    .get(deadLetter.delivery_id) as { status: string } | undefined;

  if (!delivery) {
    return { error: "Linked delivery not found", statusCode: 404 };
  }

  if (delivery.status !== "dead_letter") {
    return {
      error: "Delivery is not in dead_letter status",
      statusCode: 409,
    };
  }

  const now = new Date().toISOString();

  const result: ReplayResult = {
    ok: true,
    deliveryId: deadLetter.delivery_id,
    simulated: true,
    message: SIMULATION_MESSAGE,
    idempotencyKey,
    duplicate: false,
    newStatus: "pending",
  };

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE deliveries SET status = 'pending', attempt_count = attempt_count + 1, last_attempt_at = ?, error_message = NULL WHERE id = ?`
    ).run(now, deadLetter.delivery_id);

    db.prepare(`UPDATE dead_letters SET replay_eligible = 0 WHERE id = ?`).run(deadLetterId);

    db.prepare(
      `INSERT INTO audit_log (id, action, actor, resource_type, resource_id, detail, created_at, provenance)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNTHETIC_FIXTURE')`
    ).run(
      randomUUID(),
      "DEAD_LETTER_REPLAY_SIMULATED",
      actor,
      "dead_letter",
      deadLetterId,
      `${SIMULATION_MESSAGE} delivery=${deadLetter.delivery_id} idempotency=${idempotencyKey}`,
      now
    );

    db.prepare(
      `INSERT INTO replay_idempotency (idempotency_key, dead_letter_id, delivery_id, actor, result_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      idempotencyKey,
      deadLetterId,
      deadLetter.delivery_id,
      actor,
      JSON.stringify(result),
      now
    );
  });

  tx();
  return result;
}
