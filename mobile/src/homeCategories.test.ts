import { describe, expect, it } from "vitest";
import { createIncidentReportDraft, getHomeIncidentCategoryRoute, getReportInitialCategory } from "./homeCategories";
import type { EmergencyCategory } from "./api";

const incidentCategories: EmergencyCategory[] = ["Police", "Fire", "Medical", "Other"];

describe("Home incident category navigation", () => {
  it.each(incidentCategories)("routes %s to the report form with that category selected", (category) => {
    const route = getHomeIncidentCategoryRoute(category);
    expect(route).toEqual({ screen: "report", initialCategory: category });

    const selectedCategory = getReportInitialCategory(route.initialCategory);
    expect(selectedCategory).toBe(category);
    expect(createIncidentReportDraft(selectedCategory!, "High", "  Incident details  ", "  North gate  "))
      .toEqual({ category, severity: "High", description: "Incident details", location: "North gate" });
  });
});
