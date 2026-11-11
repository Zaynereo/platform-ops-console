import { Link } from "react-router-dom";
import type { Delivery } from "@platform-ops/shared";
import { StatusBadge } from "./StatusBadge";

interface Props {
  items: Delivery[];
  total: number;
}

export function DeliveryTable({ items, total }: Props) {
  return (
    <section aria-labelledby="deliveries-heading">
      <h2 id="deliveries-heading">Deliveries ({total})</h2>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Event</th>
              <th scope="col">Destination</th>
              <th scope="col">Status</th>
              <th scope="col">Attempts</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6}>No deliveries match filters.</td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link to={`/deliveries/${d.id}`}>{d.id}</Link>
                  </td>
                  <td>{d.eventType}</td>
                  <td>{d.destination}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>{d.attemptCount}</td>
                  <td>
                    <time dateTime={d.createdAt}>{new Date(d.createdAt).toLocaleString()}</time>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
