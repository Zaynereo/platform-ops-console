import type { DeliveryStatus } from "@platform-ops/shared";

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`status status-${status}`} aria-label={`Status ${status}`}>
      {status.replace("_", " ")}
    </span>
  );
}
