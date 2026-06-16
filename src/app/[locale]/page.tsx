import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between p-6">
        <span className="text-lg font-semibold">{t("common.appName")}</span>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Link href="/login" className="text-sm underline">
            {t("common.signIn")}
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">
          {t("home.title")}
        </h1>
        <p className="max-w-xl text-lg text-foreground/70">
          {t("home.subtitle")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-full bg-foreground px-6 py-3 text-background"
          >
            {t("home.ctaClient")}
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-foreground/20 px-6 py-3"
          >
            {t("home.ctaTrainer")}
          </Link>
        </div>
      </section>
    </main>
  );
}
