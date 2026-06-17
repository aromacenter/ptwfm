import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getTrainerSlots } from "@/lib/booking/service";
import { BookingPicker } from "@/components/booking-picker";

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
    include: { user: { select: { name: true } } },
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
  // Clients who are not yet dedicated (or guests who can sign in) may book.
  const canBook = !user || (user.role === "CLIENT" && !dedicated);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{trainer.user.name}</h1>
        {trainer.headline && (
          <p className="text-foreground/70">{trainer.headline}</p>
        )}
      </header>

      {trainer.bio && (
        <section className="space-y-1">
          <h2 className="text-sm font-medium text-foreground/80">
            {t("aboutTitle")}
          </h2>
          <p className="text-sm whitespace-pre-wrap text-foreground/80">
            {trainer.bio}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("bookConsultation")}</h2>
        <p className="text-sm text-foreground/70">{t("consultationIntro")}</p>
        {dedicated && (
          <p className="text-sm text-amber-700">{tb("alreadyDedicated")}</p>
        )}
        <BookingPicker
          trainerId={trainerId}
          slots={available}
          canBook={canBook}
          signedIn={!!user}
          kind="CONSULTATION"
        />
      </section>
    </main>
  );
}
