import { useCallback, useEffect, useState } from "react";
import type { DeadLetter, ReplayResult } from "@platform-ops/shared";
import { api, ApiError } from "../api/client";

export function DeadLettersPage() {
  const [items, setItems] = useState<DeadLetter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .deadLetters()
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Load failed"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function replay(dl: DeadLetter) {
    setReplaying(dl.id);
    setMessage(null);
    setError(null);
    const idempotencyKey = `ui-replay-${dl.id}-${crypto.randomUUID()}`;
    try {
      const result: ReplayResult = await api.replayDeadLetter(dl.id, idempotencyKey);
      setMessage(
        result.duplicate
          ? `Duplicate idempotency key — no additional state change. ${result.message}`
          : `Simulated replay OK: delivery ${result.deliveryId} → ${result.newStatus}. ${result.message}`
      );
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Replay failed");
    } finally {
      setReplaying(null);
    }
  }

  return (
    <div>
      <h1>Dead letters</h1>
      <p style={{ color: "var(--muted)" }}>
        Replay updates local SQLite state only and writes an audit entry. No webhook is sent.
      </p>
      {message ? (
        <p role="status" style={{ color: "var(--ok)" }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Delivery</th>
            <th scope="col">Event</th>
            <th scope="col">Reason</th>
            <th scope="col">Eligible</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((dl) => (
            <tr key={dl.id}>
              <td>{dl.id}</td>
              <td>{dl.deliveryId}</td>
              <td>{dl.eventType}</td>
              <td>{dl.reason}</td>
              <td>{dl.replayEligible ? "Yes" : "No"}</td>
              <td>
                <button
                  type="button"
                  disabled={!dl.replayEligible || replaying === dl.id}
                  onClick={() => void replay(dl)}
                >
                  {replaying === dl.id ? "Replaying…" : "Simulate replay"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
