import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingPicker } from "@/components/booking-picker";

export const dynamic = "force-dynamic";

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

  // This page is for booking regular sessions with the client's dedicated
  // trainer. Anyone not dedicated to this trainer is sent to the public
  // profile to book a consultation instead.
  const user = await getCurrentUser();
  if (user?.role === "CLIENT") {
    const client = await prisma.clientProfile.findUnique({
      where: { userId: user.id },
      select: { trainerId: true },
    });
    if (client?.trainerId !== trainerId) {
      redirect({ href: `/trainers/${trainerId}`, locale });
      return null;
    }
  } else {
    redirect({ href: `/trainers/${trainerId}`, locale });
    return null;
  }

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
        canBook={true}
        signedIn={true}
        kind="SESSION"
      />
    </main>
  );
}
