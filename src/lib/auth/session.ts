import { auth } from "@/auth";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  locale: string;
};

/** Returns the signed-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
    locale: session.user.locale,
  };
}

/** Like getCurrentUser but throws if unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
