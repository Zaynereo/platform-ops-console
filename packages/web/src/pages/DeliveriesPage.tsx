import { useCallback, useEffect, useState } from "react";
import type { Delivery, DeliveryStatus } from "@platform-ops/shared";
import { api, ApiError } from "../api/client";
import { DeliveryTable } from "../components/DeliveryTable";

const STATUSES: Array<DeliveryStatus | ""> = [
  "",
  "delivered",
  "failed",
  "pending",
  "dead_letter",
];

export function DeliveriesPage() {
  const [status, setStatus] = useState<DeliveryStatus | "">("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .deliveries({
        status: status || undefined,
        q: q || undefined,
        limit: 50,
      })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1>Deliveries</h1>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        aria-label="Filter deliveries"
      >
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DeliveryStatus | "")}
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="id, event, destination…"
          />
        </label>
        <button type="submit">Apply filters</button>
      </form>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="loading">Loading…</p> : <DeliveryTable items={items} total={total} />}
    </div>
  );
}
