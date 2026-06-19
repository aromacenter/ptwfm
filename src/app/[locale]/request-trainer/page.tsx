import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestTrainerForm } from "@/components/request-trainer-form";

const SITE = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "requestTrainer" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: { canonical: `${SITE}/${locale}/request-trainer` },
  };
}

export default async function RequestTrainerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("requestTrainer");

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>
      <RequestTrainerForm />
    </main>
  );
}
