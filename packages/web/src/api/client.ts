import type {
  AuditEntry,
  DeadLetter,
  Delivery,
  DeliveryFilters,
  OverviewStats,
  ReplayResult,
  SessionUser,
} from "@platform-ops/shared";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<{ user: SessionUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  logout() {
    return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },
  me() {
    return request<{ user: SessionUser }>("/api/auth/me");
  },
  overview() {
    return request<OverviewStats>("/api/overview");
  },
  deliveries(filters: DeliveryFilters) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.eventType) params.set("eventType", filters.eventType);
    if (filters.destination) params.set("destination", filters.destination);
    if (filters.q) params.set("q", filters.q);
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));
    const qs = params.toString();
    return request<{ items: Delivery[]; total: number }>(
      `/api/deliveries${qs ? `?${qs}` : ""}`
    );
  },
  delivery(id: string) {
    return request<Delivery>(`/api/deliveries/${encodeURIComponent(id)}`);
  },
  deadLetters() {
    return request<{ items: DeadLetter[] }>("/api/dead-letters");
  },
  replayDeadLetter(id: string, idempotencyKey: string) {
    return request<ReplayResult>(`/api/dead-letters/${encodeURIComponent(id)}/replay`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    });
  },
  audit(limit = 50) {
    return request<{ items: AuditEntry[] }>(`/api/audit?limit=${limit}`);
  },
};
