/** All records in this demo are explicitly synthetic fixture data. */
export const DATA_PROVENANCE = "SYNTHETIC_FIXTURE" as const;

export type DeliveryStatus = "delivered" | "failed" | "pending" | "dead_letter";

export interface Delivery {
  id: string;
  eventType: string;
  destination: string;
  status: DeliveryStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
  payloadPreview: string;
  errorMessage: string | null;
  provenance: typeof DATA_PROVENANCE;
}

export interface DeadLetter {
  id: string;
  deliveryId: string;
  eventType: string;
  destination: string;
  failedAt: string;
  reason: string;
  replayEligible: boolean;
  provenance: typeof DATA_PROVENANCE;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  detail: string;
  createdAt: string;
  provenance: typeof DATA_PROVENANCE;
}

export interface OverviewStats {
  totalDeliveries: number;
  byStatus: Record<DeliveryStatus, number>;
  deadLetterCount: number;
  replayedToday: number;
  provenance: typeof DATA_PROVENANCE;
  note: string;
}

export interface DeliveryFilters {
  status?: DeliveryStatus;
  eventType?: string;
  destination?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ReplayResult {
  ok: boolean;
  deliveryId: string;
  simulated: true;
  message: string;
  idempotencyKey: string;
  duplicate: boolean;
  newStatus: DeliveryStatus;
}

export interface SessionUser {
  email: string;
  displayName: string;
}
