import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Prisma } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { MUSCLE_ORDER, EQUIPMENT_ORDER, isMuscle, isEquipment } from "@/lib/exercises/meta";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "exercises" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: { canonical: `${SITE}/${locale}/exercises` },
  };
}

export default async function ExercisesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; muscle?: string; equipment?: string }>;
}) {
  const { locale } = await params;
  const { q, muscle, equipment } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("exercises");
  const tm = await getTranslations("muscles");
  const te = await getTranslations("equipment");

  const where: Prisma.ExerciseWhereInput = {};
  if (q && q.trim()) where.name = { contains: q.trim(), mode: "insensitive" };
  if (muscle && isMuscle(muscle)) {
    where.OR = [
      { primaryMuscles: { has: muscle } },
      { secondaryMuscles: { has: muscle } },
    ];
  }
  if (equipment && isEquipment(equipment)) where.equipment = equipment;

  const exercises = await prisma.exercise.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      equipment: true,
      category: true,
      primaryMuscles: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="min-w-[10rem] flex-1 rounded-full border border-foreground/20 bg-transparent px-4 py-2 text-sm"
        />
        <select
          name="muscle"
          defaultValue={muscle ?? ""}
          className="rounded-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">{t("allMuscles")}</option>
          {MUSCLE_ORDER.map((m) => (
            <option key={m} value={m}>
              {tm(m)}
            </option>
          ))}
        </select>
        <select
          name="equipment"
          defaultValue={equipment ?? ""}
          className="rounded-full border border-foreground/20 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">{t("allEquipment")}</option>
          {EQUIPMENT_ORDER.map((e) => (
            <option key={e} value={e}>
              {te(e)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
        >
          {t("search")}
        </button>
      </form>

      {exercises.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noResults")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {exercises.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/exercises/${e.slug}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-foreground/10 p-4 transition-colors hover:border-foreground/30"
              >
                <span className="flex items-center gap-3">
                  <ExerciseAnimation
                    slug={e.slug}
                    category={e.category}
                    className="h-14 w-12 shrink-0 text-emerald-600"
                  />
                  <span className="font-medium">{e.name}</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {e.primaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700"
                    >
                      {tm(m)}
                    </span>
                  ))}
                  <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/60">
                    {te(e.equipment)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
