import type { EmergencyCategory, IncidentSeverity } from "./api";

export const REPORT_DESCRIPTION_MIN_LENGTH = 5;
export const REPORT_DESCRIPTION_MAX_LENGTH = 500;

export interface ReportFormFields {
  category: EmergencyCategory | null;
  description: string;
  severity: IncidentSeverity | null;
  acknowledgedSimulation: boolean;
}

export interface ReportFormValidity {
  category: boolean;
  description: boolean;
  severity: boolean;
  acknowledgedSimulation: boolean;
  valid: boolean;
}

export function validateReportForm(fields: ReportFormFields): ReportFormValidity {
  const descriptionLength = fields.description.trim().length;
  const validity = {
    category: fields.category !== null,
    description: descriptionLength >= REPORT_DESCRIPTION_MIN_LENGTH && descriptionLength <= REPORT_DESCRIPTION_MAX_LENGTH,
    severity: fields.severity !== null,
    acknowledgedSimulation: fields.acknowledgedSimulation,
    valid: false,
  };
  validity.valid = validity.category && validity.description && validity.severity && validity.acknowledgedSimulation;
  return validity;
}

export function isReportSubmitDisabled(fields: ReportFormFields, busy: boolean): boolean {
  return busy || !validateReportForm(fields).valid;
}
