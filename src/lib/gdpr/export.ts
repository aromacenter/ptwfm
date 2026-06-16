// UK GDPR right of access (Art. 15) / data portability (Art. 20).
// Builds a machine-readable (JSON) package of a user's personal data.
// Sensitive credentials (password hash) are never included.

export type ExportableUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  locale: string;
  createdAt: Date;
};

export type ExportableConsent = {
  type: string;
  version: string;
  granted: boolean;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
};

export type ExportableAppointment = {
  startAt: Date;
  endAt: Date;
  status: string;
};

export type ExportablePayment = {
  amountPence: number;
  currency: string;
  type: string;
  status: string;
  createdAt: Date;
};

export type ExportInput = {
  user: ExportableUser;
  consents: ExportableConsent[];
  appointments: ExportableAppointment[];
  payments: ExportablePayment[];
  healthNotes: { content: string; createdAt: Date }[];
};

export type ExportPackage = {
  exportedAt: string;
  format: "json";
  subject: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    locale: string;
    createdAt: string;
  };
  consents: {
    type: string;
    version: string;
    granted: boolean;
    grantedAt: string | null;
    withdrawnAt: string | null;
  }[];
  appointments: { startAt: string; endAt: string; status: string }[];
  payments: {
    amountPence: number;
    currency: string;
    type: string;
    status: string;
    createdAt: string;
  }[];
  healthNotes: { content: string; createdAt: string }[];
};

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/**
 * Assembles a serialisable DSAR export package. Pure: the caller fetches the
 * data; this only shapes it (and guarantees no credentials leak in).
 */
export function buildExportPackage(
  input: ExportInput,
  now: Date = new Date(),
): ExportPackage {
  return {
    exportedAt: now.toISOString(),
    format: "json",
    subject: {
      id: input.user.id,
      email: input.user.email,
      name: input.user.name,
      phone: input.user.phone,
      role: input.user.role,
      locale: input.user.locale,
      createdAt: input.user.createdAt.toISOString(),
    },
    consents: input.consents.map((c) => ({
      type: c.type,
      version: c.version,
      granted: c.granted,
      grantedAt: iso(c.grantedAt),
      withdrawnAt: iso(c.withdrawnAt),
    })),
    appointments: input.appointments.map((a) => ({
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status,
    })),
    payments: input.payments.map((p) => ({
      amountPence: p.amountPence,
      currency: p.currency,
      type: p.type,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    healthNotes: input.healthNotes.map((h) => ({
      content: h.content,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}
