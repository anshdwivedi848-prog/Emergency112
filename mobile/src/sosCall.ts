export const SOS_COUNTDOWN_SECONDS = 5;
export const SOS_CALL_CATEGORIES = [
  "Police",
  "Fire",
  "Medical",
  "Disaster",
  "Women",
  "Child",
  "Elderly",
  "Railway",
  "General SOS",
] as const;

export type SosCallCategory = (typeof SOS_CALL_CATEGORIES)[number];

/** Accepts an international number and returns its E.164 form, or null if invalid. */
export function normalizeSosPhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !/^\+[0-9\s().-]+$/.test(trimmed)) return null;

  const digits = trimmed.slice(1).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return `+${digits}`;
}

export type SosSetupResult =
  | { status: "ready"; category: SosCallCategory; phoneNumber: string }
  | { status: "invalid-number"; category: SosCallCategory; phoneNumber: null }
  | { status: "permission-denied"; category: SosCallCategory; phoneNumber: string };

/** Validate first, then request permission; the caller may start the timer only when ready. */
export async function prepareSosCall(
  category: SosCallCategory,
  configuredNumber: string,
  requestPermission: () => Promise<boolean>,
): Promise<SosSetupResult> {
  const phoneNumber = normalizeSosPhoneNumber(configuredNumber);
  if (!phoneNumber) return { status: "invalid-number", category, phoneNumber: null };

  try {
    if (await requestPermission()) return { status: "ready", category, phoneNumber };
  } catch {
    // Treat permission API failures as denial and leave the manual dialer fallback available.
  }
  return { status: "permission-denied", category, phoneNumber };
}

export interface SosCountdownOptions {
  onTick(secondsRemaining: number): void;
  onCall(): void | Promise<void>;
  onCallError?(error: unknown): void;
  seconds?: number;
  intervalMs?: number;
}

/** A second guard around the native side effect, even if a timer callback repeats. */
export function createSosCallOnce(onCall: () => void | Promise<void>): () => Promise<boolean> {
  let started = false;
  return async () => {
    if (started) return false;
    started = true;
    await onCall();
    return true;
  };
}

/** Starts one cancellable timeout chain. Returns a cleanup function for cancel/navigation. */
export function startSosCountdown({
  onTick,
  onCall,
  onCallError,
  seconds = SOS_COUNTDOWN_SECONDS,
  intervalMs = 1000,
}: SosCountdownOptions): () => void {
  let remaining = seconds;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  let callStarted = false;
  const callOnce = createSosCallOnce(onCall);

  onTick(remaining);

  const tick = () => {
    timer = undefined;
    if (cancelled || callStarted) return;

    remaining -= 1;
    onTick(remaining);
    if (cancelled) return;

    if (remaining <= 0) {
      // Lock before invoking native code so repeated callbacks cannot launch another call.
      callStarted = true;
      void callOnce().catch((error: unknown) => onCallError?.(error));
      return;
    }

    timer = setTimeout(tick, intervalMs);
  };

  timer = setTimeout(tick, intervalMs);

  return () => {
    if (cancelled || callStarted) return;
    cancelled = true;
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}
