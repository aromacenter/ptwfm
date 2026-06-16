import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { retentionCutoff } from "@/lib/gdpr/anonymize";

export const runtime = "nodejs";

// Scheduled retention job (UK GDPR storage limitation). Protect with a secret
// header so only the scheduler can trigger it. Configure as a Railway cron.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = retentionCutoff();

  // Audit logs and processed webhook events past the retention window are
  // pruned. Financial records are kept (handled separately on erasure).
  const [audit, webhooks] = await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.webhookEvent.deleteMany({ where: { processedAt: { lt: cutoff } } }),
  ]);

  return NextResponse.json({
    cutoff: cutoff.toISOString(),
    deleted: { auditLogs: audit.count, webhookEvents: webhooks.count },
  });
}
