import type { ConsentType } from "@prisma/client";

// Current version of the consent texts. Bump when the wording materially
// changes — users must re-consent to the new version (UK GDPR Art. 7).
export const CONSENT_VERSION = "1.0";

// Minimal shape of a consent record needed to evaluate active status.
export type ConsentRecord = {
  type: ConsentType;
  version: string;
  granted: boolean;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  createdAt: Date;
};

/** Returns the most recent consent record of a given type, if any. */
export function latestConsent<T extends ConsentRecord>(
  consents: readonly T[],
  type: ConsentType,
): T | undefined {
  return consents
    .filter((c) => c.type === type)
    .reduce<T | undefined>((latest, c) => {
      if (!latest || c.createdAt.getTime() > latest.createdAt.getTime()) {
        return c;
      }
      return latest;
    }, undefined);
}

/**
 * True when the user currently holds a valid, non-withdrawn consent of the
 * given type. Used to gate processing of special-category (health) data.
 */
export function hasActiveConsent(
  consents: readonly ConsentRecord[],
  type: ConsentType,
): boolean {
  const latest = latestConsent(consents, type);
  return Boolean(latest && latest.granted && latest.withdrawnAt === null);
}

/**
 * True when the latest consent was given against an outdated version, so the
 * user should be re-prompted.
 */
export function needsReconsent(
  consents: readonly ConsentRecord[],
  type: ConsentType,
  currentVersion: string = CONSENT_VERSION,
): boolean {
  const latest = latestConsent(consents, type);
  if (!latest || !latest.granted || latest.withdrawnAt !== null) return false;
  return latest.version !== currentVersion;
}
