import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasActiveConsent } from "@/lib/gdpr/consent";
import { PrivacyControls } from "@/components/privacy-controls";

export default async function PrivacyPage({
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

  const consents = await prisma.consent.findMany({
    where: { userId: user.id },
  });

  const t = await getTranslations("privacy");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>

      <PrivacyControls
        initial={{
          health: hasActiveConsent(consents, "HEALTH_DATA"),
          marketing: hasActiveConsent(consents, "MARKETING"),
        }}
      />
    </main>
  );
}
