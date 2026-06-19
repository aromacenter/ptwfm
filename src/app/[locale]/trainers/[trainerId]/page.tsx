import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingPicker } from "@/components/booking-picker";
import { Avatar } from "@/components/avatar";
import { Stars } from "@/components/stars";
import { ReviewForm } from "@/components/review-form";
import { summariseRatings } from "@/lib/reviews";

// Reads the viewer's session on each request (slots are fetched client-side).
export const dynamic = "force-dynamic";

const SITE = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// Per-profile SEO metadata so trainer pages rank and share nicely.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; trainerId: string }>;
}): Promise<Metadata> {
  const { locale, trainerId } = await params;
  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: {
      acceptingClients: true,
      headline: true,
      bio: true,
      photoMime: true,
      updatedAt: true,
      user: { select: { name: true } },
    },
  });
  if (!trainer || !trainer.acceptingClients) {
    return { title: "Trainer", robots: { index: false } };
  }
  const title = trainer.headline
    ? `${trainer.user.name} — ${trainer.headline}`
    : trainer.user.name;
  const description = (trainer.bio ?? trainer.headline ?? title).slice(0, 160);
  const images = trainer.photoMime
    ? [`/api/trainers/${trainerId}/photo?v=${trainer.updatedAt.getTime()}`]
    : [];
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/${locale}/trainers/${trainerId}` },
    openGraph: { title, description, images, type: "profile" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; trainerId: string }>;
}) {
  const { locale, trainerId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trainers");
  const tb = await getTranslations("booking");
  const tr = await getTranslations("reviews");

  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: {
      acceptingClients: true,
      bio: true,
      headline: true,
      specialties: true,
      qualifications: true,
      achievements: true,
      city: true,
      online: true,
      inPerson: true,
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
  let canReview = false;
  let myReview: { rating: number; comment: string | null } | null = null;
  if (user?.role === "CLIENT") {
    const client = await prisma.clientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, trainerId: true },
    });
    dedicated = !!client?.trainerId;
    if (client) {
      // Can review if dedicated to this trainer or has booked with them before.
      const dedicatedHere = client.trainerId === trainerId;
      const appt = dedicatedHere
        ? true
        : !!(await prisma.appointment.findFirst({
            where: { trainerId, clientId: client.id },
            select: { id: true },
          }));
      canReview = dedicatedHere || appt;
      if (canReview) {
        myReview = await prisma.review.findUnique({
          where: { trainerId_clientId: { trainerId, clientId: client.id } },
          select: { rating: true, comment: true },
        });
      }
    }
  }
  const canBook = !user || (user.role === "CLIENT" && !dedicated);

  const reviews = await prisma.review.findMany({
    where: { trainerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      client: { select: { user: { select: { name: true } } } },
    },
  });
  const summary = summariseRatings(reviews.map((r) => r.rating));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: trainer.user.name,
    jobTitle: trainer.headline ?? "Personal trainer",
    description: trainer.bio ?? undefined,
    url: `${SITE}/${locale}/trainers/${trainerId}`,
    image: trainer.photoMime
      ? `${SITE}/api/trainers/${trainerId}/photo`
      : undefined,
    knowsAbout: trainer.specialties.length ? trainer.specialties : undefined,
    aggregateRating:
      summary.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: summary.average,
            reviewCount: summary.count,
          }
        : undefined,
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 sm:p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
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
            {(trainer.city || trainer.online || trainer.inPerson) && (
              <p className="text-sm text-foreground/60">
                {[
                  trainer.city,
                  trainer.inPerson ? t("inPerson") : null,
                  trainer.online ? t("online") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {summary.count > 0 && (
              <a
                href="#reviews"
                className="flex items-center gap-2 text-sm text-foreground/70"
              >
                <Stars value={summary.average ?? 0} size="text-sm" />
                <span>
                  {summary.average} · {tr("count", { count: summary.count })}
                </span>
              </a>
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
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {trainer.specialties.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                {s}
              </li>
            ))}
          </ul>
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

      <section
        id="reviews"
        className="space-y-4 rounded-xl border border-foreground/10 p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {tr("title")}
          </h2>
          {summary.count > 0 && (
            <span className="flex items-center gap-2 text-sm text-foreground/70">
              <Stars value={summary.average ?? 0} size="text-sm" />
              {summary.average} · {tr("count", { count: summary.count })}
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-foreground/60">{tr("none")}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-foreground/10 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {r.client.user.name}
                  </span>
                  <Stars value={r.rating} size="text-sm" />
                </div>
                {r.comment && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/80">
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {canReview && (
          <div className="border-t border-foreground/10 pt-4">
            <ReviewForm
              trainerId={trainerId}
              initialRating={myReview?.rating ?? 0}
              initialComment={myReview?.comment ?? ""}
            />
          </div>
        )}
      </section>

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
