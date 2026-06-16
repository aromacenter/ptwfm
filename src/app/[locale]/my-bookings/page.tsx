import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { MyBookings } from "@/components/my-bookings";

export default async function MyBookingsPage({
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

  const t = await getTranslations("myBookings");

  const client = await prisma.clientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  const appointments = client
    ? await prisma.appointment.findMany({
        where: {
          clientId: client.id,
          status: "BOOKED",
          startAt: { gte: new Date() },
        },
        orderBy: { startAt: "asc" },
        select: { id: true, startAt: true },
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
        <p className="text-xs text-foreground/60">{t("policyNote")}</p>
      </header>
      <MyBookings
        bookings={appointments.map((a) => ({
          id: a.id,
          start: a.startAt.toISOString(),
        }))}
      />
    </main>
  );
}
