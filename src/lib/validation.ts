import { EMERGENCY_CATEGORIES, type EmergencyCategory, type IncidentDraft, type Severity } from "../types";

const SEVERITIES: readonly Severity[] = ["Low", "Moderate", "High", "Critical"];

export function validateIncidentDraft(draft: Partial<IncidentDraft>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!EMERGENCY_CATEGORIES.includes(draft.category as EmergencyCategory)) errors.category = "Choose an emergency category.";
  if (typeof draft.description !== "string" || !draft.description.trim()) errors.description = "Add a short description of what happened.";
  else if (draft.description.trim().length > 500) errors.description = "Keep the description under 500 characters.";
  if (!SEVERITIES.includes(draft.severity as Severity)) errors.severity = "Choose the closest severity level.";
  return errors;
}
