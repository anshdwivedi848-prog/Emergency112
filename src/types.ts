export const EMERGENCY_CATEGORIES = ["Police", "Fire", "Medical", "Other"] as const;

export type EmergencyCategory = (typeof EMERGENCY_CATEGORIES)[number];
export type Severity = "Low" | "Moderate" | "High" | "Critical";

export interface ApplicationSettings {
  emergencyContactNumber: string | null;
  appDownloadUrl: string | null;
}

export interface IncidentDraft {
  category: EmergencyCategory;
  description: string;
  severity: Severity;
  location: string;
}

// Server-owned incident types live in src/lib/api.ts.
