import type { EmergencyCategory, Severity } from "../types";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export type IncidentStatus = "Received" | "UnderReview" | "Assigned" | "Resolved";
export interface User { id: string; email: string; displayName: string; roles: string[] }
export interface StatusHistoryItem { id: string; fromStatus: IncidentStatus | null; toStatus: IncidentStatus; changedAtUtc: string; changedBy: string; note: string }
export interface Assignment { id: string; unitCode: string; unitName: string; category: string; assignedAtUtc: string; releasedAtUtc: string | null; notes: string }
export interface Incident {
  id: string; reference: string; category: EmergencyCategory; description: string; severity: Severity;
  location: string | null; createdAtUtc: string; currentStatus: IncidentStatus; reporter?: string | null;
  statusHistory: StatusHistoryItem[]; assignments: Assignment[];
}
export type IncidentSummary = Pick<Incident, "id" | "reference" | "category" | "description" | "severity" | "createdAtUtc" | "currentStatus" | "location" | "reporter">;
export interface ResponseUnit { id: string; code: string; name: string; category: string; isActive: boolean }
export interface DashboardStats { total: number; open: number; assigned: number; resolved: number; recent24Hours: number }
export interface AuditEvent { id: string; actorDisplayName: string; action: string; entityType: string; entityId: string; occurredAtUtc: string; details: string }

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) { super(message); this.name = "ApiError"; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options, credentials: "include",
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch {
    throw new ApiError("The Emergency112 API could not be reached. Make sure the backend is running.", 0);
  }
  if (!response.ok) {
    let body: Record<string, unknown> = {};
    try { body = await response.json() as Record<string, unknown>; } catch { /* empty response */ }
    const errors = body.errors;
    const validationMessage = errors && typeof errors === "object"
      ? Object.values(errors as Record<string, unknown>).flatMap((value) => Array.isArray(value) ? value : []).join(" ")
      : "";
    const isCredentialEndpoint = path === "/auth/login" || path === "/auth/register";
    const message = response.status === 401 && !isCredentialEndpoint ? "Your session expired. Please sign in again to continue." : validationMessage || (typeof body.message === "string" ? body.message : "") ||
      (typeof body.title === "string" ? body.title : `Request failed (${response.status}).`);
    throw new ApiError(message, response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) => request<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, displayName: string, password: string) => request<User>("/auth/register", { method: "POST", body: JSON.stringify({ email, displayName, password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  createIncident: (draft: { category: EmergencyCategory; description: string; severity: Severity; location: string }) => request<Incident>("/incidents", { method: "POST", body: JSON.stringify(draft) }),
  myIncidents: () => request<IncidentSummary[]>("/incidents"),
  incident: (id: string) => request<Incident>(`/incidents/${encodeURIComponent(id)}`),
  deleteIncident: (id: string) => request<void>(`/incidents/${encodeURIComponent(id)}`, { method: "DELETE" }),
  dashboard: () => request<DashboardStats>("/admin/dashboard"),
  adminIncidents: (filters: URLSearchParams) => request<IncidentSummary[]>(`/admin/incidents?${filters.toString()}`),
  adminIncident: (id: string) => request<Incident>(`/admin/incidents/${encodeURIComponent(id)}`),
  responseUnits: () => request<ResponseUnit[]>("/admin/units"),
  updateStatus: (id: string, status: IncidentStatus, note = "") => request<void>(`/admin/incidents/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ status, note }) }),
  assignUnit: (id: string, responseUnitId: string, notes = "") => request<void>(`/admin/incidents/${encodeURIComponent(id)}/assignments`, { method: "POST", body: JSON.stringify({ responseUnitId, notes }) }),
  activity: () => request<AuditEvent[]>("/admin/activity"),
};
