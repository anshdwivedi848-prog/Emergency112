import * as SecureStore from "expo-secure-store";

export type EmergencyCategory = "Police" | "Fire" | "Medical" | "Other";
export type IncidentSeverity = "Low" | "Moderate" | "High" | "Critical";
export type IncidentStatus = "Received" | "UnderReview" | "Assigned" | "Resolved";

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface CitizenProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  trustedContactName: string | null;
  trustedContactPhoneNumber: string | null;
}

export interface CitizenProfileUpdate {
  fullName: string;
  phoneNumber: string;
  trustedContactName: string;
  trustedContactPhoneNumber: string;
}

export interface IncidentSummary {
  id: string;
  reference: string;
  category: EmergencyCategory;
  description: string;
  severity: IncidentSeverity;
  createdAtUtc: string;
  currentStatus: IncidentStatus;
  location: string | null;
  reporter: string | null;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus;
  changedAtUtc: string;
  changedBy: string;
  note: string;
}

export interface Incident extends IncidentSummary {
  statusHistory: StatusHistoryItem[];
  assignments: Array<{
    id: string;
    unitCode: string;
    unitName: string;
    category: string;
    assignedAtUtc: string;
    releasedAtUtc: string | null;
    notes: string;
  }>;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

const COOKIE_NAME = "Emergency112.Auth";
const COOKIE_STORAGE_KEY = "emergency112.identity-cookie";

function apiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
  if (!value) {
    throw new ApiError("This app has no API address configured. Set EXPO_PUBLIC_API_BASE_URL to the laptop's Wi-Fi address and port 5081.", 0);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApiError("The configured API address is invalid.", 0);
  }
  if (!(["http:", "https:"].includes(parsed.protocol)) || ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname)) {
    throw new ApiError("Use the laptop's reachable Wi-Fi address for the API, not localhost.", 0);
  }
  return value;
}

async function retainAuthenticationCookie(response: Response) {
  // Native networking keeps its own cookie jar. Persist the Identity cookie as well so
  // requests remain authenticated after the app process is recreated.
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;
  const cookieHeader = setCookie.split(/,(?=\s*Emergency112\.Auth=)/i)
    .find((part) => part.trim().toLowerCase().startsWith(`${COOKIE_NAME.toLowerCase()}=`));
  if (!cookieHeader) return;
  const cookiePair = cookieHeader.trim().split(";", 1)[0];
  if (!cookiePair || cookiePair.toLowerCase() === `${COOKIE_NAME.toLowerCase()}=`) {
    await SecureStore.deleteItemAsync(COOKIE_STORAGE_KEY);
    return;
  }
  await SecureStore.setItemAsync(COOKIE_STORAGE_KEY, cookiePair);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookie = await SecureStore.getItemAsync(COOKIE_STORAGE_KEY);
  const headers: Record<string, string> = {
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
    await retainAuthenticationCookie(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("The Emergency112 API could not be reached. Check that the API is running and the phone can reach the laptop over Wi-Fi.", 0);
  }

  if (!response.ok) {
    let body: Record<string, unknown> = {};
    try { body = await response.json() as Record<string, unknown>; } catch { /* no JSON error body */ }
    const errors = body.errors;
    const validationMessage = errors && typeof errors === "object"
      ? Object.values(errors as Record<string, unknown>).flatMap((value) => Array.isArray(value) ? value : []).join(" ")
      : "";
    const credentialEndpoint = path === "/auth/login" || path === "/auth/register";
    const message = response.status === 401 && !credentialEndpoint
      ? "Your session expired. Please sign in again."
      : validationMessage || (typeof body.message === "string" ? body.message : "") ||
        (typeof body.title === "string" ? body.title : `Request failed (${response.status}).`);
    throw new ApiError(message, response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<User>("/auth/me"),
  profile: () => request<CitizenProfile>("/profile"),
  updateProfile: (profile: CitizenProfileUpdate) => request<CitizenProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  }),
  login: (email: string, password: string) => request<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }),
  logout: async () => {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    } finally {
      await SecureStore.deleteItemAsync(COOKIE_STORAGE_KEY);
    }
  },
  incidents: () => request<IncidentSummary[]>("/incidents"),
  incident: (id: string) => request<Incident>(`/incidents/${encodeURIComponent(id)}`),
  createIncident: (draft: { category: EmergencyCategory; description: string; severity: IncidentSeverity; location: string }) =>
    request<Incident>("/incidents", { method: "POST", body: JSON.stringify(draft) }),
};

export const mobileAuthStorageKey = COOKIE_STORAGE_KEY;
