import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { MobileMenu } from "@/components/mobile-menu";

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
      { href: "/my-plans", label: t("nav.myPlans") },
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
    <header className="relative flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-4 sm:px-6">
      <Link href="/" className="text-lg font-semibold">
        {t("common.appName")}
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-4 text-sm sm:flex">
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

      {/* Mobile nav */}
      <MobileMenu links={links} signedIn={!!user} />
    </header>
  );
}
