import type { IncidentStatus } from "./api";

const incidentStatusLabels: Record<IncidentStatus, string> = {
  Received: "Received",
  UnderReview: "Under review",
  Assigned: "Assigned",
  Resolved: "Resolved",
};

export function formatIncidentStatus(status: IncidentStatus): string {
  return incidentStatusLabels[status];
}
