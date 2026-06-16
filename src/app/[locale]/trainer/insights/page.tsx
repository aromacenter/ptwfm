import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AiPanel } from "@/components/ai-panel";

export default async function InsightsPage({
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
  if (user.role !== "TRAINER") {
    redirect({ href: "/", locale });
    return null;
  }

  const t = await getTranslations("ai");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("scheduleTitle")}</h1>
        <p className="text-sm text-foreground/70">{t("scheduleIntro")}</p>
      </header>
      <AiPanel
        endpoint="/api/ai/schedule"
        title={t("scheduleTitle")}
        generateLabel={t("generateSchedule")}
      />
    </main>
  );
}
