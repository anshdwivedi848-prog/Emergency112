import { describe, expect, it } from "vitest";
import { validateProfileForm } from "./profileValidation";
import type { CitizenProfileUpdate } from "./api";

const emptyContact: CitizenProfileUpdate = {
  fullName: "Demo Citizen",
  phoneNumber: "",
  trustedContactName: "",
  trustedContactPhoneNumber: "",
};

describe("citizen profile validation", () => {
  it("allows an optional phone and no trusted contact", () => {
    expect(validateProfileForm(emptyContact).valid).toBe(true);
  });

  it("requires both trusted-contact fields and a valid phone when adding one", () => {
    expect(validateProfileForm({ ...emptyContact, trustedContactName: "Trusted Person" }).valid).toBe(false);
    expect(validateProfileForm({ ...emptyContact, trustedContactPhoneNumber: "+44 7700 900123" }).valid).toBe(false);
    expect(validateProfileForm({ ...emptyContact, trustedContactName: "Trusted Person", trustedContactPhoneNumber: "not a number" }).valid).toBe(false);
    expect(validateProfileForm({ ...emptyContact, trustedContactName: "Trusted Person", trustedContactPhoneNumber: "+44 7700 900123" }).valid).toBe(true);
  });

  it("requires a name and rejects malformed optional account phone numbers", () => {
    expect(validateProfileForm({ ...emptyContact, fullName: " " }).fullName).toBe(false);
    expect(validateProfileForm({ ...emptyContact, phoneNumber: "letters only" }).phoneNumber).toBe(false);
  });
});
