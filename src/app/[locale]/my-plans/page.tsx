import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { computeNutritionTotals } from "@/lib/plans/nutrition";

export const dynamic = "force-dynamic";

type WorkoutData = {
  notes?: string;
  days: { label: string; exercises: { name: string; sets: string; reps: string }[] }[];
};
type NutritionData = {
  meals: {
    name: string;
    items: {
      food: string;
      qty: string;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }[];
  }[];
};

export default async function MyPlansPage({
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

  const t = await getTranslations("plans");
  const client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  const [workouts, nutrition] = client
    ? await Promise.all([
        prisma.workoutProgram.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.nutritionPlan.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  const empty = workouts.length === 0 && nutrition.length === 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
      <h1 className="text-2xl font-semibold">{t("myPlansTitle")}</h1>

      {empty && <p className="text-sm text-foreground/60">{t("noPlans")}</p>}

      {workouts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t("workoutTitle")}</h2>
          {workouts.map((w) => {
            const data = w.data as WorkoutData;
            return (
              <article
                key={w.id}
                className="space-y-3 rounded-xl border border-foreground/10 p-5"
              >
                <h3 className="font-semibold">{w.title}</h3>
                {data.days?.map((day, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-foreground/80">
                      {day.label}
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground/85">
                      {day.exercises?.map((ex, j) => (
                        <li key={j}>
                          {ex.name}
                          {(ex.sets || ex.reps) && (
                            <span className="text-foreground/60">
                              {" "}
                              — {ex.sets}
                              {ex.sets && ex.reps ? " × " : ""}
                              {ex.reps}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </article>
            );
          })}
        </section>
      )}

      {nutrition.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t("nutritionTitle")}</h2>
          {nutrition.map((n) => {
            const data = n.data as NutritionData;
            const totals = computeNutritionTotals(data.meals ?? []);
            return (
              <article
                key={n.id}
                className="space-y-3 rounded-xl border border-foreground/10 p-5"
              >
                <h3 className="font-semibold">{n.title}</h3>
                {data.meals?.map((meal, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-foreground/80">
                      {meal.name}
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground/85">
                      {meal.items?.map((it, j) => (
                        <li key={j}>
                          {it.food}
                          {it.qty && (
                            <span className="text-foreground/60"> — {it.qty}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-sm text-foreground/70">
                  {t("dailyTotals")}: <strong>{totals.kcal} kcal</strong> · P{" "}
                  {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
                </p>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
