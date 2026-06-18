import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/avatar";

// Reads the live trainer directory from the DB on each request.
export const dynamic = "force-dynamic";

export default async function TrainersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trainers");

  const trainers = await prisma.trainerProfile.findMany({
    where: { acceptingClients: true },
    select: {
      id: true,
      headline: true,
      photoMime: true,
      updatedAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("directoryTitle")}</h1>
        <p className="text-sm text-foreground/70">{t("directoryIntro")}</p>
      </header>

      {trainers.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noTrainers")}</p>
      ) : (
        <ul className="space-y-3">
          {trainers.map((tr) => (
            <li
              key={tr.id}
              className="flex items-center gap-4 rounded-xl border border-foreground/10 p-4"
            >
              <Avatar
                name={tr.user.name}
                trainerId={tr.id}
                hasPhoto={!!tr.photoMime}
                size={56}
                version={tr.updatedAt.getTime()}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{tr.user.name}</p>
                {tr.headline && (
                  <p className="truncate text-sm text-foreground/70">
                    {tr.headline}
                  </p>
                )}
              </div>
              <Link
                href={`/trainers/${tr.id}`}
                className="shrink-0 rounded-full border border-foreground/20 px-4 py-2 text-sm"
              >
                {t("viewProfile")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
