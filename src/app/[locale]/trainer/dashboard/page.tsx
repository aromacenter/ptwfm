import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/i18n/format";
import { CopyField } from "@/components/copy-field";
import { TrainerProfileEditor } from "@/components/trainer-profile-editor";
import { AppointmentActions } from "@/components/appointment-actions";

export default async function DashboardPage({
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
  if (user.role !== "TRAINER") {
    redirect({ href: "/", locale });
    return null;
  }

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      headline: true,
      bio: true,
      specialties: true,
      qualifications: true,
      achievements: true,
      city: true,
      online: true,
      inPerson: true,
      acceptingClients: true,
      hourlyRatePence: true,
      photoMime: true,
      updatedAt: true,
      user: { select: { name: true } },
    },
  });

  const upcoming = profile
    ? await prisma.appointment.findMany({
        where: {
          trainerId: profile.id,
          status: "BOOKED",
          startAt: { gte: new Date() },
        },
        orderBy: { startAt: "asc" },
        take: 10,
        select: {
          id: true,
          startAt: true,
          client: { select: { user: { select: { name: true } } } },
        },
      })
    : [];

  // Past sessions still marked BOOKED — the trainer reviews them as completed
  // or no-show.
  const toReview = profile
    ? await prisma.appointment.findMany({
        where: {
          trainerId: profile.id,
          status: "BOOKED",
          startAt: { lt: new Date() },
        },
        orderBy: { startAt: "desc" },
        take: 10,
        select: {
          id: true,
          startAt: true,
          client: { select: { user: { select: { name: true } } } },
        },
      })
    : [];

  const t = await getTranslations("dashboard");
  const tA = await getTranslations("availability");
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  const bookingLink = profile ? `${baseUrl}/${locale}/book/${profile.id}` : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {bookingLink && (
        <section className="space-y-2 rounded border border-foreground/15 p-4">
          <h2 className="font-medium">{tA("shareTitle")}</h2>
          <p className="text-sm text-foreground/70">{tA("shareDesc")}</p>
          <CopyField value={bookingLink} />
        </section>
      )}

      {profile && (
        <TrainerProfileEditor
          trainerId={profile.id}
          name={profile.user.name}
          hasPhoto={!!profile.photoMime}
          photoVersion={profile.updatedAt.getTime()}
          initial={{
            headline: profile.headline ?? "",
            bio: profile.bio ?? "",
            specialties: profile.specialties,
            qualifications: profile.qualifications,
            achievements: profile.achievements,
            city: profile.city ?? "",
            online: profile.online,
            inPerson: profile.inPerson,
            acceptingClients: profile.acceptingClients,
            hourlyRatePence: profile.hourlyRatePence,
          }}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("noUpcoming")}</p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>{a.client.user.name}</span>
                <span className="text-foreground/70">
                  {formatDateTime(a.startAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toReview.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t("toReview")}</h2>
          <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
            {toReview.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span>
                  {a.client.user.name}
                  <span className="block text-xs text-foreground/60">
                    {formatDateTime(a.startAt, locale)}
                  </span>
                </span>
                <AppointmentActions id={a.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap gap-3">
        <Link
          href="/trainer/availability"
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm"
        >
          {t("manageAvailability")}
        </Link>
        <Link
          href="/trainer/clients"
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm"
        >
          {t("viewClients")}
        </Link>
        <Link
          href="/trainer/requests"
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm"
        >
          {t("viewRequests")}
        </Link>
      </section>
    </main>
  );
}
