import type { CitizenProfileUpdate } from "./api";

export interface ProfileFormValidity {
  fullName: boolean;
  phoneNumber: boolean;
  trustedContact: boolean;
  valid: boolean;
}

function isOptionalPhoneValid(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.length > 24 || !/^\+?[0-9][0-9 .()\-]*$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

export function validateProfileForm(fields: CitizenProfileUpdate): ProfileFormValidity {
  const fullNameLength = fields.fullName.trim().length;
  const hasTrustedName = fields.trustedContactName.trim().length > 0;
  const hasTrustedPhone = fields.trustedContactPhoneNumber.trim().length > 0;
  const validity = {
    fullName: fullNameLength >= 2 && fullNameLength <= 80,
    phoneNumber: isOptionalPhoneValid(fields.phoneNumber),
    trustedContact: hasTrustedName === hasTrustedPhone
      && (!hasTrustedName || fields.trustedContactName.trim().length >= 2)
      && isOptionalPhoneValid(fields.trustedContactPhoneNumber),
    valid: false,
  };
  validity.valid = validity.fullName && validity.phoneNumber && validity.trustedContact;
  return validity;
}
