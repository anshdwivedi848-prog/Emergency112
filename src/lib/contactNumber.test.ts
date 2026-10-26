import { describe, expect, it } from "vitest";
import { getConfiguredContactNumber } from "./contactNumber";

describe("getConfiguredContactNumber", () => {
  it("does not expose missing or placeholder values as a calling action", () => {
    expect(getConfiguredContactNumber(null)).toBeNull();
    expect(getConfiguredContactNumber("+00 000 000 0000")).toBeNull();
    expect(getConfiguredContactNumber("not a phone number")).toBeNull();
  });

  it("accepts a configured phone number for a user-initiated dialer link", () => {
    expect(getConfiguredContactNumber("+1 (212) 555-0198")).toBe("+1 (212) 555-0198");
  });
});
