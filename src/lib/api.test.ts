import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { requestCurrentLocation } from "./location";
import { validateIncidentDraft } from "./validation";

afterEach(() => vi.unstubAllGlobals());

describe("API client", () => {
  it("sends simulated incident creation to the server with cookie credentials", async () => {
    const incident = { id: "demo-id", reference: "E112-261013-ABC123", category: "Medical" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(incident), { status: 201, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.createIncident({ category: "Medical", description: "Fictional medical drill", severity: "Moderate", location: "Room 12" })).resolves.toMatchObject(incident);
    expect(fetchMock).toHaveBeenCalledWith("/api/incidents", expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ category: "Medical", description: "Fictional medical drill", severity: "Moderate", location: "Room 12" });
  });

  it("surfaces authorization and validation errors from the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Session expired" }), { status: 401 })));
    await expect(api.myIncidents()).rejects.toMatchObject({ status: 401, message: "Your session expired. Please sign in again to continue." });
  });

  it("shows credential rejection from sign-in instead of calling it an expired session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Email or password was not recognized." }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.login("citizen@example.test", "wrong-password")).rejects.toMatchObject({
      status: 401,
      message: "Email or password was not recognized.",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST", credentials: "include" }));
  });

  it("reports unavailable backend connections clearly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(api.dashboard()).rejects.toMatchObject({ status: 0, message: expect.stringContaining("backend is running") });
  });
});

describe("report form safeguards", () => {
  it("validates required fields before the server request", () => {
    expect(validateIncidentDraft({})).toEqual({
      category: "Choose an emergency category.",
      description: "Add a short description of what happened.",
      severity: "Choose the closest severity level.",
    });
    expect(validateIncidentDraft({ category: "Police", description: "Fictional training", severity: "Low", location: "" })).toEqual({});
  });

  it("keeps denied location permission recoverable for manual entry", async () => {
    const denied: GeolocationPositionError = { code: 1, message: "User denied Geolocation", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
    const geolocation = { getCurrentPosition: (_success: PositionCallback, failure?: PositionErrorCallback) => failure?.(denied) };
    await expect(requestCurrentLocation(geolocation)).rejects.toBe(denied);
  });
});
