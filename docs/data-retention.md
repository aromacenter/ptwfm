# Data Retention Schedule

> Working draft — review with a qualified UK adviser before launch.

Principle (UK GDPR Art. 5(1)(e)): keep personal data only as long as necessary.

| Data | Retention | Basis | On expiry |
|---|---|---|---|
| Account profile (name, email, phone) | Life of account + 30 days | Contract | Anonymised on erasure |
| Authentication (argon2 hash) | Life of account | Contract/security | Cleared on erasure |
| Health/fitness notes (special category) | Life of consent | Art. 9(2)(a) consent | Deleted on withdrawal or erasure |
| Bookings/appointments | 6 years | Contract/legal | Anonymised |
| Payment records (amounts, Stripe IDs) | 6 years after transaction | UK tax/accounting law | Anonymised, then deletable |
| Consent records | Life of account + 6 years | Accountability (Art. 7) | Retained as proof, then deleted |
| Audit logs | 6 years | Accountability/security | Deleted |
| Cookie consent | 12 months | PECR | Re-prompt |

## Erasure behaviour

`POST /api/gdpr/erasure`:
1. Deletes special-category health notes.
2. Anonymises the `User` record (placeholder email, cleared name/phone/hash).
3. Retains payment records (no direct PII) for the legal retention period.
4. Records a `DataRequest` and an `AuditLog` entry.

## Automation

A scheduled retention job (M8) anonymises/deletes records past their window
(`isBillingRecordDeletable` in `src/lib/gdpr/anonymize.ts`).
