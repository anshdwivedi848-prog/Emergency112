import type { EmergencyCategory, IncidentSeverity } from "./api";

export interface HomeIncidentCategoryRoute {
  screen: "report";
  initialCategory: EmergencyCategory;
}

export function getHomeIncidentCategoryRoute(category: EmergencyCategory): HomeIncidentCategoryRoute {
  return { screen: "report", initialCategory: category };
}

export function getReportInitialCategory(category: EmergencyCategory | null): EmergencyCategory | null {
  return category;
}

export interface IncidentReportDraft {
  category: EmergencyCategory;
  severity: IncidentSeverity;
  description: string;
  location: string;
}

export function createIncidentReportDraft(
  category: EmergencyCategory,
  severity: IncidentSeverity,
  description: string,
  location: string,
): IncidentReportDraft {
  return {
    category,
    severity,
    description: description.trim(),
    location: location.trim(),
  };
}
