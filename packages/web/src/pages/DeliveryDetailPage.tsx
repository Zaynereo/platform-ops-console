import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Delivery } from "@platform-ops/shared";
import { api, ApiError } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .delivery(id)
      .then(setDelivery)
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Not found");
        setDelivery(null);
      });
  }, [id]);

  if (error) {
    return (
      <div>
        <p className="error" role="alert">
          {error}
        </p>
        <Link to="/deliveries">Back to deliveries</Link>
      </div>
    );
  }

  if (!delivery) return <p className="loading">Loading delivery…</p>;

  return (
    <article>
      <p>
        <Link to="/deliveries">← Deliveries</Link>
      </p>
      <h1>{delivery.id}</h1>
      <p>
        Provenance: <code>{delivery.provenance}</code>
      </p>
      <dl>
        <dt>Event type</dt>
        <dd>{delivery.eventType}</dd>
        <dt>Destination</dt>
        <dd>{delivery.destination}</dd>
        <dt>Status</dt>
        <dd>
          <StatusBadge status={delivery.status} />
        </dd>
        <dt>Attempts</dt>
        <dd>{delivery.attemptCount}</dd>
        <dt>Last attempt</dt>
        <dd>
          {delivery.lastAttemptAt
            ? new Date(delivery.lastAttemptAt).toLocaleString()
            : "—"}
        </dd>
        <dt>Created</dt>
        <dd>{new Date(delivery.createdAt).toLocaleString()}</dd>
        <dt>Payload preview</dt>
        <dd>
          <pre>{delivery.payloadPreview}</pre>
        </dd>
        {delivery.errorMessage ? (
          <>
            <dt>Error</dt>
            <dd className="error">{delivery.errorMessage}</dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}
