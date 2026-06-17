import type { Role } from "@prisma/client";

export type AdminCheckUser = { role: Role; email: string } | null;

/**
 * Admin access = the ADMIN role, OR an email listed in ADMIN_EMAILS
 * (comma-separated). The env list lets the first admin be granted access
 * without direct database edits.
 */
export function isAdmin(user: AdminCheckUser): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
