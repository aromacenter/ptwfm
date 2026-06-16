import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { AvailabilityEditor } from "@/components/availability-editor";

export default async function AvailabilityPage({
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

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
    include: {
      availabilityRules: {
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
      },
    },
  });

  const t = await getTranslations("availability");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>
      <AvailabilityEditor initialRules={profile?.availabilityRules ?? []} />
    </main>
  );
}
