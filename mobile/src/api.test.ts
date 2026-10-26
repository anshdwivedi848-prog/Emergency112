import * as SecureStore from "expo-secure-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, mobileAuthStorageKey, type CitizenProfile } from "./api";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

const user = { id: "citizen-1", email: "citizen@example.test", displayName: "Demo Citizen", roles: ["Citizen"] };

beforeEach(() => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://192.0.2.50:5081/api");
  vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  vi.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
  vi.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("mobile API client", () => {
  it("signs in against the configured backend and stores only the Identity session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "Emergency112.Auth=opaque-ticket; path=/; samesite=strict; httponly",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.login("citizen@example.test", "a-secret-password")).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("http://192.0.2.50:5081/api/auth/login", expect.objectContaining({
      method: "POST",
      credentials: "include",
    }));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(mobileAuthStorageKey, "Emergency112.Auth=opaque-ticket");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ email: "citizen@example.test", password: "a-secret-password" });
  });

  it("sends the stored session cookie with incident requests and deletes it on sign-out", async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue("Emergency112.Auth=opaque-ticket");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.incidents()).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      credentials: "include",
      headers: expect.objectContaining({ Cookie: "Emergency112.Auth=opaque-ticket" }),
    }));
    await api.logout();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(mobileAuthStorageKey);
  });

  it("loads and updates the authenticated profile through the backend", async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue("Emergency112.Auth=opaque-ticket");
    const profile: CitizenProfile = {
      id: "citizen-1",
      email: "citizen@example.test",
      fullName: "Demo Citizen",
      phoneNumber: null,
      trustedContactName: null,
      trustedContactPhoneNumber: null,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(profile), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...profile, fullName: "Updated Citizen" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.profile()).resolves.toEqual(profile);
    await expect(api.updateProfile({
      fullName: "Updated Citizen",
      phoneNumber: "",
      trustedContactName: "",
      trustedContactPhoneNumber: "",
    })).resolves.toMatchObject({ fullName: "Updated Citizen" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://192.0.2.50:5081/api/profile", expect.objectContaining({
      credentials: "include",
      headers: expect.objectContaining({ Cookie: "Emergency112.Auth=opaque-ticket" }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://192.0.2.50:5081/api/profile", expect.objectContaining({
      method: "PUT",
      credentials: "include",
    }));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
      fullName: "Updated Citizen",
      phoneNumber: "",
      trustedContactName: "",
      trustedContactPhoneNumber: "",
    });
  });

  it("shows credential rejection from the backend and rejects loopback API addresses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Email or password was not recognized." }), { status: 401 })));
    await expect(api.login("citizen@example.test", "wrong-password")).rejects.toMatchObject({
      status: 401,
      message: "Email or password was not recognized.",
    });

    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://127.0.0.1:5081/api");
    await expect(api.me()).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("not localhost"),
    });
  });
});
