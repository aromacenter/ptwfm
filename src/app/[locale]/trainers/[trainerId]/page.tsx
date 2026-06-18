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
      <section className="overflow-hidden rounded-2xl border border-foreground/10 shadow-sm">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          {/* Unique "signature" watermark from the trainer's name. */}
          <span
            className="pointer-events-none absolute -right-2 bottom-1 max-w-full -rotate-6 select-none truncate pr-4 text-5xl font-semibold italic text-white/20 sm:text-6xl"
            style={{ fontFamily: '"Segoe Script","Brush Script MT",cursive' }}
            aria-hidden="true"
          >
            {trainer.user.name}
          </span>
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-16 flex flex-col items-center gap-3 text-center sm:-mt-14 sm:flex-row sm:items-end sm:gap-5 sm:text-left">
            <div className="rounded-2xl shadow-lg ring-4 ring-background">
              <Avatar
                name={trainer.user.name}
                trainerId={trainerId}
                hasPhoto={!!trainer.photoMime}
                size={112}
                version={trainer.updatedAt.getTime()}
              />
            </div>
            <div className="space-y-1 pb-1">
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
        </div>
      </section>

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
                className="rounded-full bg-foreground/10 px-3 py-1 text-sm"
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
