# Data Protection Impact Assessment (DPIA)

> **Status: working draft.** This DPIA must be reviewed and signed off by the
> data controller and a qualified UK data protection adviser before launch.
> It documents how PT Management processes personal data and the safeguards
> applied. It is not legal advice.

## 1. Why a DPIA is required

PT Management processes **special category data** (health and fitness
information — UK GDPR Art. 9) and carries out limited **profiling** via AI
(schedule optimisation and client summaries). Under UK GDPR Art. 35 and ICO
guidance, processing of health data at scale and profiling are "likely high
risk", so a DPIA is required.

## 2. Description of processing

| | |
|---|---|
| **Controller** | The platform operator (and each trainer as appropriate). |
| **Data subjects** | Trainers and their clients. |
| **Personal data** | Name, email, phone, locale, authentication data (hashed). |
| **Special category** | Health/fitness notes recorded by a trainer about a client. |
| **Financial** | Payment records (amounts, Stripe identifiers — no card data held). |
| **Purpose** | Account management, booking, payment, session planning, AI assistance. |
| **Retention** | See `data-retention.md`. Financial records kept ~6 years (UK tax). |
| **Processors** | Stripe (payments), Railway (hosting/DB), Google (Gemini AI). |

## 3. Lawful basis

- **Art. 6(1)(b)** performance of a contract — booking and payment.
- **Art. 6(1)(a)** consent — marketing; analytics cookies (PECR).
- **Art. 9(2)(a)** explicit consent — health/fitness data. Captured separately
  at registration and revocable on the Privacy page (`/[locale]/privacy`).

## 4. Necessity & proportionality

- **Data minimisation:** only fields needed for the service are collected; the
  Gemini prompt is built from minimised, de-identified data (see M7).
- **Purpose limitation:** health data is used only for session planning, behind
  a consent gate and access audit log.
- **Storage limitation:** retention windows enforced; erasure anonymises PII.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Unauthorised access to health data | Consent gate + role checks + `AuditLog` on every view; 1 client ↔ 1 trainer isolation. |
| Card data breach | No card data stored — Stripe Elements/Checkout (PCI SAQ-A). |
| AI leakage of personal data | Minimised/de-identified prompts; outputs cached server-side; rate limiting. |
| Account takeover | argon2id password hashing; security headers; no secrets in client. |
| Excessive retention | Automated retention/anonymisation; documented schedule. |
| Inability to exercise rights | Self-service export (Art. 15/20) and erasure (Art. 17). |

## 6. Data subject rights

Implemented self-service on the Privacy page and via API:
- **Access / portability** — `GET /api/gdpr/export` (machine-readable JSON).
- **Erasure** — `POST /api/gdpr/erasure` (anonymises PII; deletes health notes;
  retains anonymised financial records per law).
- **Consent management** — `POST /api/gdpr/consent` (grant/withdraw, versioned).

## 7. Breach response

Audit logging supports detection. On a personal-data breach likely to risk
individuals' rights, notify the ICO within 72 hours and affected individuals
without undue delay (UK GDPR Art. 33–34).

## 8. Review

This DPIA is reviewed on material changes to processing and at least annually.
