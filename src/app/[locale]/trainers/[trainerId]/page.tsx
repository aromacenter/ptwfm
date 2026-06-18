import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getTrainerSlots } from "@/lib/booking/service";
import { BookingPicker } from "@/components/booking-picker";
import { Avatar } from "@/components/avatar";

// Reads live availability + the viewer's session on each request.
export const dynamic = "force-dynamic";

const DAYS_AHEAD = 14;

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

  const now = new Date();
  const to = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const slots = await getTrainerSlots(trainerId, now, to, now);
  const available = slots.filter((s) => !s.booked).map((s) => s.start.toISOString());

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
        <div className="h-28 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-500" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end gap-4">
            <Avatar
              name={trainer.user.name}
              trainerId={trainerId}
              hasPhoto={!!trainer.photoMime}
              size={96}
              version={trainer.updatedAt.getTime()}
            />
            <div className="pb-1">
              <h1 className="text-2xl font-bold">{trainer.user.name}</h1>
              {trainer.headline && (
                <p className="text-foreground/70">{trainer.headline}</p>
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
            slots={available}
            canBook={canBook}
            signedIn={!!user}
            kind="CONSULTATION"
          />
        </div>
      </section>
    </main>
  );
}
