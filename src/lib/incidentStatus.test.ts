import { describe, expect, it } from "vitest";
import { formatIncidentStatus } from "./incidentStatus";

describe("formatIncidentStatus", () => {
  it("uses consistent readable labels for each server status", () => {
    expect(formatIncidentStatus("Received")).toBe("Received");
    expect(formatIncidentStatus("UnderReview")).toBe("Under review");
    expect(formatIncidentStatus("Assigned")).toBe("Assigned");
    expect(formatIncidentStatus("Resolved")).toBe("Resolved");
  });
});
