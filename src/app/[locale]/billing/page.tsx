import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { PACKAGE_OPTIONS, priceForPackage } from "@/lib/payments/pricing";
import { formatMoney } from "@/lib/i18n/format";
import { BillingClient } from "@/components/billing-client";

export default async function BillingPage({
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

  const t = await getTranslations("billing");

  const client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    include: {
      trainer: { select: { hourlyRatePence: true } },
      creditPacks: { select: { remaining: true } },
    },
  });

  if (!client) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("noTrainer")}</p>
      </main>
    );
  }

  const balance = client.creditPacks.reduce((sum, p) => sum + p.remaining, 0);
  const rate = client.trainer.hourlyRatePence;
  const options = PACKAGE_OPTIONS.map((opt) => ({
    id: opt.id,
    priceLabel: formatMoney(priceForPackage(rate, opt), locale),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>
      <p className="text-sm">
        {t("creditsBalance")}: <strong>{balance}</strong>
      </p>
      <BillingClient options={options} />
    </main>
  );
}
