import { describe, it, expect } from "vitest";
import { buildExportPackage, type ExportInput } from "@/lib/gdpr/export";

const input: ExportInput = {
  user: {
    id: "u1",
    email: "jane@example.com",
    name: "Jane Doe",
    phone: "+447700900000",
    role: "CLIENT",
    locale: "en",
    createdAt: new Date("2026-01-01T10:00:00Z"),
  },
  consents: [
    {
      type: "HEALTH_DATA",
      version: "1.0",
      granted: true,
      grantedAt: new Date("2026-01-01T10:00:00Z"),
      withdrawnAt: null,
    },
  ],
  appointments: [
    {
      startAt: new Date("2026-02-01T09:00:00Z"),
      endAt: new Date("2026-02-01T10:00:00Z"),
      status: "COMPLETED",
    },
  ],
  payments: [
    {
      amountPence: 4500,
      currency: "gbp",
      type: "SESSION",
      status: "SUCCEEDED",
      createdAt: new Date("2026-02-01T09:00:00Z"),
    },
  ],
  healthNotes: [
    { content: "Knee injury, avoid squats", createdAt: new Date("2026-01-05T00:00:00Z") },
  ],
};

describe("buildExportPackage", () => {
  it("includes the subject's personal data", () => {
    const pkg = buildExportPackage(input, new Date("2026-06-16T00:00:00Z"));
    expect(pkg.subject.email).toBe("jane@example.com");
    expect(pkg.subject.name).toBe("Jane Doe");
    expect(pkg.format).toBe("json");
    expect(pkg.exportedAt).toBe("2026-06-16T00:00:00.000Z");
  });

  it("serialises all dates to ISO strings", () => {
    const pkg = buildExportPackage(input);
    expect(pkg.subject.createdAt).toBe("2026-01-01T10:00:00.000Z");
    expect(pkg.appointments[0].startAt).toBe("2026-02-01T09:00:00.000Z");
    expect(pkg.consents[0].grantedAt).toBe("2026-01-01T10:00:00.000Z");
    expect(pkg.consents[0].withdrawnAt).toBeNull();
  });

  it("includes consents, appointments, payments and health notes", () => {
    const pkg = buildExportPackage(input);
    expect(pkg.consents).toHaveLength(1);
    expect(pkg.appointments).toHaveLength(1);
    expect(pkg.payments[0].amountPence).toBe(4500);
    expect(pkg.healthNotes[0].content).toContain("Knee injury");
  });

  it("never leaks credentials (no password hash anywhere)", () => {
    const pkg = buildExportPackage(input);
    expect(JSON.stringify(pkg)).not.toMatch(/passwordHash|argon2/i);
  });
});
