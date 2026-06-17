import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

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
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-700 px-6 py-24 text-center">
        {/* Background gym video. Drop a licensed file at public/hero-gym.mp4
            (optional poster at public/hero-gym.jpg). Falls back to the
            gradient above if the file is absent. */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-gym.jpg"
          aria-hidden="true"
        >
          <source src="/hero-gym.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay for text contrast. */}
        <div className="absolute inset-0 bg-black/55" aria-hidden="true" />

        <div className="relative z-10 flex flex-col items-center gap-6 text-white">
          <h1 className="max-w-2xl text-4xl font-bold drop-shadow-sm sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="max-w-xl text-lg text-white/85">{t("home.subtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/trainers"
              className="rounded-full bg-white px-6 py-3 font-medium text-neutral-900"
            >
              {t("home.ctaClient")}
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-white/70 px-6 py-3 font-medium text-white"
            >
              {t("home.ctaTrainer")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
