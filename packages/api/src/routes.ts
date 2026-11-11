import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "./db.js";
import {
  clearSession,
  clearSessionCookie,
  createSessionToken,
  persistSession,
  readSessionToken,
  requireAuth,
  setSessionCookie,
  verifyDemoPassword,
} from "./auth.js";
import { listDeliveries, getDelivery } from "./services/deliveries.js";
import { replayDeadLetter } from "./services/replay.js";
import type {
  AuditEntry,
  DeadLetter,
  DeliveryStatus,
  OverviewStats,
} from "@platform-ops/shared";
import { DATA_PROVENANCE } from "@platform-ops/shared";
import { DEMO_CREDENTIALS, MAX_PAGE_LIMIT } from "./config.js";

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

const deliveryQuerySchema = z.object({
  status: z.enum(["delivered", "failed", "pending", "dead_letter"]).optional(),
  eventType: z.string().max(120).optional(),
  destination: z.string().max(200).optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
});

export function registerRoutes(app: FastifyInstance): void {
  app.get("/api/health", async () => ({
    ok: true,
    persistence: "sqlite",
    data: DATA_PROVENANCE,
  }));

  app.post("/api/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input", issues: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    if (!verifyDemoPassword(email, password)) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }
    const token = createSessionToken();
    const user = { email: DEMO_CREDENTIALS.email, displayName: DEMO_CREDENTIALS.displayName };
    persistSession(getDb(), token, user);
    setSessionCookie(reply, token);
    return { user };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const token = readSessionToken(request);
    if (token) clearSession(getDb(), token);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (request) => ({
    user: request.user,
  }));

  app.get("/api/overview", { preHandler: requireAuth }, async () => {
    const db = getDb();
    const statuses = db
      .prepare(`SELECT status, COUNT(*) AS c FROM deliveries GROUP BY status`)
      .all() as Array<{ status: string; c: number }>;

    const byStatus: Record<DeliveryStatus, number> = {
      delivered: 0,
      failed: 0,
      pending: 0,
      dead_letter: 0,
    };
    let total = 0;
    for (const row of statuses) {
      byStatus[row.status as DeliveryStatus] = row.c;
      total += row.c;
    }

    const deadLetterCount = (
      db.prepare(`SELECT COUNT(*) AS c FROM dead_letters`).get() as { c: number }
    ).c;

    const replayedToday = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM audit_log WHERE action = 'DEAD_LETTER_REPLAY_SIMULATED' AND created_at >= datetime('now', '-1 day')`
        )
        .get() as { c: number }
    ).c;

    const stats: OverviewStats = {
      totalDeliveries: total,
      byStatus,
      deadLetterCount,
      replayedToday,
      provenance: DATA_PROVENANCE,
      note: "Counts reflect synthetic fixture data in local SQLite only.",
    };
    return stats;
  });

  app.get("/api/deliveries", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = deliveryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid query", issues: parsed.error.flatten() });
    }
    return listDeliveries(getDb(), parsed.data);
  });

  app.get("/api/deliveries/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id.length > 80) {
      return reply.code(400).send({ error: "Invalid id" });
    }
    const delivery = getDelivery(getDb(), id);
    if (!delivery) return reply.code(404).send({ error: "Not found" });
    return delivery;
  });

  app.get("/api/dead-letters", { preHandler: requireAuth }, async () => {
    const rows = getDb()
      .prepare(`SELECT * FROM dead_letters ORDER BY failed_at DESC`)
      .all() as Array<{
      id: string;
      delivery_id: string;
      event_type: string;
      destination: string;
      failed_at: string;
      reason: string;
      replay_eligible: number;
      provenance: string;
    }>;

    const items: DeadLetter[] = rows.map((r) => ({
      id: r.id,
      deliveryId: r.delivery_id,
      eventType: r.event_type,
      destination: r.destination,
      failedAt: r.failed_at,
      reason: r.reason,
      replayEligible: r.replay_eligible === 1,
      provenance: r.provenance as typeof DATA_PROVENANCE,
    }));

    return { items, provenance: DATA_PROVENANCE };
  });

  app.post("/api/dead-letters/:id/replay", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return reply
        .code(400)
        .send({ error: "Idempotency-Key header required (8–128 characters)" });
    }

    const result = replayDeadLetter(getDb(), id, idempotencyKey, request.user!.email);
    if ("error" in result) {
      return reply.code(result.statusCode).send({ error: result.error });
    }
    return result;
  });

  app.get("/api/audit", { preHandler: requireAuth }, async (request, reply) => {
    const limit = Math.min(
      Number((request.query as { limit?: string }).limit ?? 50),
      MAX_PAGE_LIMIT
    );
    if (Number.isNaN(limit) || limit < 1) {
      return reply.code(400).send({ error: "Invalid limit" });
    }

    const rows = getDb()
      .prepare(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as Array<{
      id: string;
      action: string;
      actor: string;
      resource_type: string;
      resource_id: string;
      detail: string;
      created_at: string;
      provenance: string;
    }>;

    const items: AuditEntry[] = rows.map((r) => ({
      id: r.id,
      action: r.action,
      actor: r.actor,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      detail: r.detail,
      createdAt: r.created_at,
      provenance: r.provenance as typeof DATA_PROVENANCE,
    }));

    return { items, provenance: DATA_PROVENANCE };
  });
}
