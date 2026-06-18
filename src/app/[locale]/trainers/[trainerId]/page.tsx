import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingPicker } from "@/components/booking-picker";
import { Avatar } from "@/components/avatar";

// Reads the viewer's session on each request (slots are fetched client-side).
export const dynamic = "force-dynamic";

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; trainerId: string }>;
}) {
  const { locale, trainerId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trainers");
  const tb = await getTranslations("booking");

  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: {
      acceptingClients: true,
      bio: true,
      headline: true,
      specialties: true,
      qualifications: true,
      achievements: true,
      photoMime: true,
      updatedAt: true,
      user: { select: { name: true } },
    },
  });

  if (!trainer || !trainer.acceptingClients) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <p className="text-sm text-foreground/70">{tb("trainerNotFound")}</p>
      </main>
    );
  }

  const user = await getCurrentUser();
  let dedicated = false;
  if (user?.role === "CLIENT") {
    const client = await prisma.clientProfile.findUnique({
      where: { userId: user.id },
      select: { trainerId: true },
    });
    dedicated = !!client?.trainerId;
  }
  const canBook = !user || (user.role === "CLIENT" && !dedicated);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 sm:p-6">
      {/* Profile header card */}
      <section className="rounded-2xl border border-foreground/10 p-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="shrink-0 rounded-2xl ring-1 ring-foreground/10">
            <Avatar
              name={trainer.user.name}
              trainerId={trainerId}
              hasPhoto={!!trainer.photoMime}
              size={112}
              version={trainer.updatedAt.getTime()}
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {trainer.user.name}
            </h1>
            {trainer.headline && (
              <p className="text-foreground/80">{trainer.headline}</p>
            )}
            {trainer.acceptingClients && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("acceptingBadge")}
              </span>
            )}
          </div>
        </div>
      </section>

      {trainer.achievements.length > 0 && (
        <section className="rounded-xl border border-foreground/10 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {t("achievementsTitle")}
          </h2>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {trainer.achievements.map((a) => (
              <li key={a} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-emerald-500">★</span>
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      {trainer.bio && (
        <section className="rounded-xl border border-foreground/10 p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {t("aboutTitle")}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
            {trainer.bio}
          </p>
        </section>
      )}

      {trainer.specialties.length > 0 && (
        <section className="rounded-xl border border-foreground/10 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {t("specialtiesTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {trainer.specialties.map((s) => (
              <span
                key={s}
                className="rounded-lg bg-foreground/10 px-3 py-1.5 text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {trainer.qualifications.length > 0 && (
        <section className="rounded-xl border border-foreground/10 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {t("qualificationsTitle")}
          </h2>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {trainer.qualifications.map((q) => (
              <li key={q} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-foreground/10 p-5">
        <h2 className="text-lg font-semibold">{t("bookConsultation")}</h2>
        <p className="mt-1 text-sm text-foreground/70">
          {t("consultationIntro")}
        </p>
        {dedicated && (
          <p className="mt-2 text-sm text-amber-700">{tb("alreadyDedicated")}</p>
        )}
        <div className="mt-4">
          <BookingPicker
            trainerId={trainerId}
            canBook={canBook}
            signedIn={!!user}
            kind="CONSULTATION"
          />
        </div>
      </section>
    </main>
  );
}
