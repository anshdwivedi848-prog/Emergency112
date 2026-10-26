export function getConfiguredContactNumber(number: string | null): string | null {
  const trimmed = number?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/[\s().-]/g, "");
  if (!/^\+?\d{3,15}$/.test(normalized)) return null;
  if (/^\+?0+$/.test(normalized)) return null;

  return trimmed;
}
