import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getIntegrationStatus } from "@/lib/settings";
import { AdminIntegrations } from "@/components/admin-integrations";

export default async function AdminIntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (!isAdmin(user)) {
    redirect({ href: "/", locale });
    return null;
  }

  const integrations = await getIntegrationStatus();
  const t = await getTranslations("admin");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>
      <AdminIntegrations initial={integrations} />
    </main>
  );
}
