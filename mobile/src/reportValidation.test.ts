import { describe, expect, it } from "vitest";
import { isReportSubmitDisabled, validateReportForm, type ReportFormFields } from "./reportValidation";

const completeForm: ReportFormFields = {
  category: "Medical",
  description: "A fictional practice incident",
  severity: "Moderate",
  acknowledgedSimulation: true,
};

describe("incident report submission validation", () => {
  it("keeps Submit disabled when the form is incomplete", () => {
    expect(isReportSubmitDisabled({ category: null, description: "", severity: null, acknowledgedSimulation: false }, false)).toBe(true);
    for (const incomplete of [
      { ...completeForm, category: null },
      { ...completeForm, description: "    " },
      { ...completeForm, description: "x" },
      { ...completeForm, severity: null },
      { ...completeForm, acknowledgedSimulation: false },
    ]) {
      expect(isReportSubmitDisabled(incomplete, false)).toBe(true);
      expect(validateReportForm(incomplete).valid).toBe(false);
    }
  });

  it("enables Submit only when every required field is valid", () => {
    expect(validateReportForm(completeForm)).toEqual({
      category: true,
      description: true,
      severity: true,
      acknowledgedSimulation: true,
      valid: true,
    });
    expect(isReportSubmitDisabled(completeForm, false)).toBe(false);
    expect(isReportSubmitDisabled(completeForm, true)).toBe(true);
  });

  it("trims surrounding whitespace and keeps the API's minimum description length", () => {
    expect(validateReportForm({ ...completeForm, description: "  valid  " }).description).toBe(true);
    expect(validateReportForm({ ...completeForm, description: "  four  " }).description).toBe(false);
  });
});
