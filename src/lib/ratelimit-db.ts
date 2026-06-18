import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limit backed by the database (shared across instances,
 * survives restarts). Returns true if the action for `key` is allowed.
 * Best-effort: if the DB call fails, it allows the request (fail-open) so a
 * transient DB issue can't lock everyone out of signing in.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.rateLimit.findUnique({ where: { key } });
      if (!row || row.resetAt.getTime() <= now) {
        await tx.rateLimit.upsert({
          where: { key },
          create: { key, count: 1, resetAt: new Date(now + windowMs) },
          update: { count: 1, resetAt: new Date(now + windowMs) },
        });
        return true;
      }
      if (row.count >= max) return false;
      await tx.rateLimit.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
      return true;
    });
  } catch {
    return true;
  }
}

/** Extracts the client IP from common proxy headers (Railway sets these). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
