import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeSosPhoneNumber,
  prepareSosCall,
  createSosCallOnce,
  SOS_CALL_CATEGORIES,
  SOS_COUNTDOWN_SECONDS,
  startSosCountdown,
} from "./sosCall";

afterEach(() => {
  vi.useRealTimers();
});

describe("SOS call configuration and countdown", () => {
  it("accepts only valid international numbers and normalizes display punctuation", () => {
    expect(normalizeSosPhoneNumber(" +44 (20) 7946-0958 ")).toBe("+442079460958");
    expect(normalizeSosPhoneNumber("")).toBeNull();
    expect(normalizeSosPhoneNumber("020 7946 0958")).toBeNull();
    expect(normalizeSosPhoneNumber("+01234567")).toBeNull();
    expect(normalizeSosPhoneNumber("+1234567")).toBeNull();
    expect(normalizeSosPhoneNumber("+1234567890123456")).toBeNull();
    expect(normalizeSosPhoneNumber("+12 CALL NOW")).toBeNull();
  });

  it("does not request permission or start a countdown for a missing/invalid number", async () => {
    const requestPermission = vi.fn().mockResolvedValue(true);
    const result = await prepareSosCall("General SOS", "", requestPermission);
    expect(result).toEqual({ status: "invalid-number", category: "General SOS", phoneNumber: null });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("returns the manual-fallback state when direct-call permission is denied or fails", async () => {
    const denied = await prepareSosCall("Women", "+442079460958", async () => false);
    expect(denied).toEqual({ status: "permission-denied", category: "Women", phoneNumber: "+442079460958" });

    const failed = await prepareSosCall("Women", "+442079460958", async () => { throw new Error("permission API failed"); });
    expect(failed.status).toBe("permission-denied");
  });

  it("routes every call category to the same configured demo contact", async () => {
    const requestPermission = vi.fn().mockResolvedValue(true);
    const setups = await Promise.all(SOS_CALL_CATEGORIES.map((category) =>
      prepareSosCall(category, "+44 (20) 7946-0958", requestPermission)));

    expect(setups.map((setup) => setup.category)).toEqual(SOS_CALL_CATEGORIES);
    expect(setups.every((setup) => setup.status === "ready" && setup.phoneNumber === "+442079460958")).toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(SOS_CALL_CATEGORIES.length);
  });

  it("shows 5 through 1, then calls once when the countdown reaches zero", async () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const onCall = vi.fn();
    startSosCountdown({ onTick, onCall });

    expect(onTick).toHaveBeenNthCalledWith(1, SOS_COUNTDOWN_SECONDS);
    for (const seconds of [4, 3, 2, 1]) {
      await vi.advanceTimersByTimeAsync(1000);
      expect(onTick).toHaveBeenLastCalledWith(seconds);
      expect(onCall).not.toHaveBeenCalled();
    }

    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTicks();
    expect(onTick).toHaveBeenLastCalledWith(0);
    expect(onCall).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears its timer when cancelled or when the screen is left", async () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const onCall = vi.fn();
    const cleanupCountdown = startSosCountdown({ onTick, onCall });

    await vi.advanceTimersByTimeAsync(2000);
    expect(onTick).toHaveBeenLastCalledWith(3);
    cleanupCountdown();
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(10000);
    expect(onCall).not.toHaveBeenCalled();
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it("ignores duplicate call attempts", async () => {
    const onCall = vi.fn();
    const callOnce = createSosCallOnce(onCall);
    await expect(Promise.all([callOnce(), callOnce(), callOnce()])).resolves.toEqual([true, false, false]);
    expect(onCall).toHaveBeenCalledTimes(1);
  });
});
