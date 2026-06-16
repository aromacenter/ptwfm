import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";

export async function Nav() {
  const user = await getCurrentUser();
  const t = await getTranslations();

  const links =
    user?.role === "TRAINER"
      ? [
          { href: "/trainer/availability", label: t("nav.availability") },
          { href: "/trainer/clients", label: t("nav.clients") },
          { href: "/trainer/insights", label: t("nav.insights") },
          { href: "/privacy", label: t("nav.privacy") },
        ]
      : user?.role === "CLIENT"
        ? [
            { href: "/my-bookings", label: t("nav.bookings") },
            { href: "/billing", label: t("nav.billing") },
            { href: "/privacy", label: t("nav.privacy") },
          ]
        : [];

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
