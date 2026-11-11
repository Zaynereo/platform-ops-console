import type Database from "better-sqlite3";
import type { Delivery, DeliveryFilters, DeliveryStatus } from "@platform-ops/shared";
import { DATA_PROVENANCE } from "@platform-ops/shared";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../config.js";

type Row = {
  id: string;
  event_type: string;
  destination: string;
  status: string;
  attempt_count: number;
  last_attempt_at: string | null;
  created_at: string;
  payload_preview: string;
  error_message: string | null;
  provenance: string;
};

function mapRow(row: Row): Delivery {
  return {
    id: row.id,
    eventType: row.event_type,
    destination: row.destination,
    status: row.status as DeliveryStatus,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    createdAt: row.created_at,
    payloadPreview: row.payload_preview,
    errorMessage: row.error_message,
    provenance: row.provenance as typeof DATA_PROVENANCE,
  };
}

export function listDeliveries(
  db: Database.Database,
  filters: DeliveryFilters
): { items: Delivery[]; total: number } {
  const clauses: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.status) {
    clauses.push("status = @status");
    params.status = filters.status;
  }
  if (filters.eventType) {
    clauses.push("event_type = @eventType");
    params.eventType = filters.eventType;
  }
  if (filters.destination) {
    clauses.push("destination LIKE @destination");
    params.destination = `%${filters.destination}%`;
  }
  if (filters.q) {
    clauses.push(
      "(id LIKE @q OR event_type LIKE @q OR destination LIKE @q OR payload_preview LIKE @q)"
    );
    params.q = `%${filters.q}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(filters.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
  const offset = Math.max(filters.offset ?? 0, 0);

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM deliveries ${where}`).get(params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT * FROM deliveries ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset }) as Row[];

  return { items: rows.map(mapRow), total };
}

export function getDelivery(db: Database.Database, id: string): Delivery | null {
  const row = db.prepare(`SELECT * FROM deliveries WHERE id = ?`).get(id) as Row | undefined;
  return row ? mapRow(row) : null;
}
