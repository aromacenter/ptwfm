// UK GDPR right to erasure (Art. 17). We anonymise the user's personal data
// while retaining financial records that we are legally required to keep
// (UK tax law: business records for ~6 years). Payment rows therefore survive
// erasure but are detached from identifying personal data.

export type ErasureUserUpdate = {
  email: string;
  name: string;
  phone: null;
  passwordHash: string;
};

/**
 * Builds the User update that anonymises personal data on erasure. The email
 * is replaced with a non-routable, unique placeholder so the unique
 * constraint still holds and the account can no longer be used to sign in.
 */
export function buildErasureUserUpdate(userId: string): ErasureUserUpdate {
  return {
    email: `erased-${userId}@deleted.invalid`,
    name: "Erased user",
    phone: null,
    // Empty hash — argon2 verification can never succeed against it.
    passwordHash: "",
  };
}

// Number of years financial records must be retained (UK).
export const BILLING_RETENTION_YEARS = 6;

/**
 * Whether a financial record dated `recordDate` may be deleted as of `asOf`.
 * Records within the retention window must be kept (anonymised, not deleted).
 */
export function isBillingRecordDeletable(
  recordDate: Date,
  asOf: Date = new Date(),
): boolean {
  const cutoff = new Date(asOf);
  cutoff.setFullYear(cutoff.getFullYear() - BILLING_RETENTION_YEARS);
  return recordDate.getTime() < cutoff.getTime();
}
