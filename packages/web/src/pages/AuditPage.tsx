import { useEffect, useState } from "react";
import type { AuditEntry } from "@platform-ops/shared";
import { api, ApiError } from "../api/client";

export function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .audit(100)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Load failed"));
  }, []);

  if (error) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div>
      <h1>Audit log</h1>
      <table>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Action</th>
            <th scope="col">Actor</th>
            <th scope="col">Resource</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>
                <time dateTime={a.createdAt}>{new Date(a.createdAt).toLocaleString()}</time>
              </td>
              <td>{a.action}</td>
              <td>{a.actor}</td>
              <td>
                {a.resourceType}/{a.resourceId}
              </td>
              <td>{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
