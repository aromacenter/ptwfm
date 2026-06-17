import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";

export async function Nav() {
  const user = await getCurrentUser();
  const t = await getTranslations();

  let links: { href: string; label: string }[] = [];
  if (user?.role === "TRAINER") {
    links = [
      { href: "/trainer/dashboard", label: t("nav.dashboard") },
      { href: "/trainer/availability", label: t("nav.availability") },
      { href: "/trainer/clients", label: t("nav.clients") },
      { href: "/trainer/insights", label: t("nav.insights") },
      { href: "/privacy", label: t("nav.privacy") },
    ];
  } else if (user?.role === "CLIENT") {
    // Dedicated clients get a Book link to their trainer; others get the
    // public trainer directory to book an initial consultation.
    const client = await prisma.clientProfile.findUnique({
      where: { userId: user.id },
      select: { trainerId: true },
    });
    links = [
      client?.trainerId
        ? { href: `/book/${client.trainerId}`, label: t("nav.book") }
        : { href: "/trainers", label: t("nav.findTrainer") },
      { href: "/my-bookings", label: t("nav.bookings") },
      { href: "/billing", label: t("nav.billing") },
      { href: "/privacy", label: t("nav.privacy") },
    ];
  }

  // Admins get an integrations link in addition to their role links.
  if (isAdmin(user)) {
    links = [
      ...links,
      { href: "/admin/integrations", label: t("nav.admin") },
    ];
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/10 px-6 py-4">
      <Link href="/" className="text-lg font-semibold">
        {t("common.appName")}
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:underline">
            {l.label}
          </Link>
        ))}
        <LocaleSwitcher />
        {user ? (
          <SignOutButton />
        ) : (
          <Link href="/login" className="underline">
            {t("common.signIn")}
          </Link>
        )}
      </nav>
    </header>
  );
}
