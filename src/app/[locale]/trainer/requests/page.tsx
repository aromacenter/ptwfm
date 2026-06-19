import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/i18n/format";
import { RequestRespondButton } from "@/components/request-respond-button";

// Trainer-only view of open prospective-client requests.
export const dynamic = "force-dynamic";

export default async function TrainerRequestsPage({
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
    select: { id: true },
  });

  const t = await getTranslations("trainerRequests");

  const requests = profile
    ? await prisma.trainerRequest.findMany({
        where: { open: true },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          email: true,
          goal: true,
          city: true,
          online: true,
          createdAt: true,
          responses: {
            where: { trainerId: profile.id },
            select: { id: true },
          },
        },
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>

      {requests.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const meta = [
              r.city,
              r.online ? t("online") : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={r.id}
                className="space-y-2 rounded-xl border border-foreground/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{r.name}</p>
                    {meta && (
                      <p className="text-xs text-foreground/60">{meta}</p>
                    )}
                  </div>
                  <RequestRespondButton
                    requestId={r.id}
                    responded={r.responses.length > 0}
                  />
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/85">
                  {r.goal}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/60">
                  <a
                    href={`mailto:${r.email}`}
                    className="font-medium text-foreground/80 underline"
                  >
                    {r.email}
                  </a>
                  <span>{formatDateTime(r.createdAt, locale)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
