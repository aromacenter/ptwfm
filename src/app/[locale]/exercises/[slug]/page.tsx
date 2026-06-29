import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { BodyMap } from "@/components/body-map";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const exercise = await prisma.exercise.findUnique({
    where: { slug },
    select: { name: true, primaryMuscles: true },
  });
  if (!exercise) return { title: "Exercise", robots: { index: false } };
  const tm = await getTranslations({ locale, namespace: "muscles" });
  const muscles = exercise.primaryMuscles.map((m) => tm(m)).join(", ");
  const description = `${exercise.name} — muscles worked: ${muscles}.`;
  return {
    title: exercise.name,
    description,
    alternates: { canonical: `${SITE}/${locale}/exercises/${slug}` },
    openGraph: { title: exercise.name, description, type: "article" },
  };
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const exercise = await prisma.exercise.findUnique({ where: { slug } });
  if (!exercise) notFound();

  const t = await getTranslations("exercises");
  const tm = await getTranslations("muscles");
  const te = await getTranslations("equipment");
  const tc = await getTranslations("exerciseCategory");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExercisePlan",
    name: exercise.name,
    exerciseType: tc(exercise.category),
    description: `${exercise.name} — ${t("musclesWorked")}: ${exercise.primaryMuscles
      .map((m) => tm(m))
      .join(", ")}.`,
    url: `${SITE}/${locale}/exercises/${slug}`,
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 sm:p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div>
        <Link href="/exercises" className="text-sm text-foreground/60 underline">
          ← {t("backToLibrary")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{exercise.name}</h1>
        <p className="mt-1 flex flex-wrap gap-1.5 text-sm">
          <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-foreground/70">
            {tc(exercise.category)}
          </span>
          <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-foreground/70">
            {te(exercise.equipment)}
          </span>
        </p>
      </div>

      <section className="rounded-xl border border-foreground/10 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
          {t("musclesWorked")}
        </h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <BodyMap
            primary={exercise.primaryMuscles}
            secondary={exercise.secondaryMuscles}
            className="h-48 w-auto shrink-0"
          />
          <div className="w-full space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                {t("primary")}
              </p>
              <p className="mt-1 flex flex-wrap gap-1.5">
                {exercise.primaryMuscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-sm font-medium text-emerald-700"
                  >
                    {tm(m)}
                  </span>
                ))}
              </p>
            </div>
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                  {t("secondary")}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {exercise.secondaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-emerald-500/5 px-2.5 py-0.5 text-sm text-emerald-700/80"
                    >
                      {tm(m)}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {exercise.cues.length > 0 && (
        <section className="rounded-xl border border-foreground/10 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {t("howTo")}
          </h2>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {exercise.cues.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
