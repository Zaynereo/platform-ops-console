import { useEffect, useState } from "react";
import type { OverviewStats } from "@platform-ops/shared";
import { api, ApiError } from "../api/client";

export function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .overview()
      .then(setStats)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load"));
  }, []);

  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }

  if (!stats) return <p className="loading">Loading overview…</p>;

  return (
    <div>
      <h1>Delivery health overview</h1>
      <p style={{ color: "var(--muted)" }}>{stats.note}</p>
      <div className="card-grid" aria-label="Delivery metrics">
        <StatCard label="Total deliveries" value={stats.totalDeliveries} />
        <StatCard label="Delivered" value={stats.byStatus.delivered} />
        <StatCard label="Failed" value={stats.byStatus.failed} />
        <StatCard label="Pending" value={stats.byStatus.pending} />
        <StatCard label="Dead letter" value={stats.byStatus.dead_letter} />
        <StatCard label="Dead letter queue" value={stats.deadLetterCount} />
        <StatCard label="Simulated replays (24h)" value={stats.replayedToday} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="card">
      <h3>{label}</h3>
      <div className="value" aria-label={`${label} ${value}`}>
        {value}
      </div>
    </article>
  );
}
