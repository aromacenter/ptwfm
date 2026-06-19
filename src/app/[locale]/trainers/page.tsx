import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Prisma } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/avatar";

// Reads the live trainer directory from the DB on each request.
export const dynamic = "force-dynamic";

export default async function TrainersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; online?: string }>;
}) {
  const { locale } = await params;
  const { q, online } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("trainers");

  const where: Prisma.TrainerProfileWhereInput = { acceptingClients: true };
  if (online === "1") where.online = true;
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { headline: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { user: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const trainers = await prisma.trainerProfile.findMany({
    where,
    select: {
      id: true,
      headline: true,
      city: true,
      online: true,
      inPerson: true,
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

      {/* Search + filter (GET so it's shareable / crawlable). */}
      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="min-w-[12rem] flex-1 rounded-full border border-foreground/20 bg-transparent px-4 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="online" value="1" defaultChecked={online === "1"} />
          {t("onlineOnly")}
        </label>
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
        >
          {t("search")}
        </button>
      </form>

      {trainers.length === 0 ? (
        <p className="text-sm text-foreground/60">
          {q || online ? t("noResults") : t("noTrainers")}
        </p>
      ) : (
        <ul className="space-y-3">
          {trainers.map((tr) => {
            const loc = [
              tr.city,
              tr.inPerson ? t("inPerson") : null,
              tr.online ? t("online") : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
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
                  {loc && (
                    <p className="mt-0.5 truncate text-xs text-foreground/50">
                      {loc}
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
            );
          })}
        </ul>
      )}
    </main>
  );
}
