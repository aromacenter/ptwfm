import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getTrainerSlots } from "@/lib/booking/service";
import { BookingPicker } from "@/components/booking-picker";

const DAYS_AHEAD = 14;

export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string; trainerId: string }>;
}) {
  const { locale, trainerId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    include: { user: { select: { name: true } } },
  });

  if (!trainer) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <p className="text-sm text-foreground/70">{t("trainerNotFound")}</p>
      </main>
    );
  }

  const now = new Date();
  const to = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const slots = await getTrainerSlots(trainerId, now, to, now);
  const available = slots
    .filter((s) => !s.booked)
    .map((s) => s.start.toISOString());

  const user = await getCurrentUser();
  const isClient = user?.role === "CLIENT" || !user; // clients (or guests who can sign in)

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">
          {trainer.user.name} · {t("intro")}
        </p>
      </header>
      <BookingPicker
        trainerId={trainerId}
        slots={available}
        canBook={isClient}
        signedIn={!!user}
      />
    </main>
  );
}
