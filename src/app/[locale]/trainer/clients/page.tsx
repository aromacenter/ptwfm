import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { trainerProfileIdForUser } from "@/lib/clients/access";
import { formatDateTime } from "@/lib/i18n/format";
import { ClientActions } from "@/components/client-actions";

export default async function ClientsPage({
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

  const t = await getTranslations("clients");
  const trainerId = (await trainerProfileIdForUser(user.id)) ?? "";

  const [pendingRaw, active] = await Promise.all([
    // Consultations with clients not yet dedicated to anyone.
    prisma.appointment.findMany({
      where: {
        trainerId,
        kind: "CONSULTATION",
        status: "BOOKED",
        client: { trainerId: null },
      },
      orderBy: { startAt: "asc" },
      select: {
        startAt: true,
        client: { select: { id: true, user: { select: { name: true } } } },
      },
    }),
    prisma.clientProfile.findMany({
      where: { trainerId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // One row per pending client (earliest consultation).
  const pending = [...new Map(pendingRaw.map((p) => [p.client.id, p])).values()];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("pendingTitle")}</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("noPending")}</p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
            {pending.map((p) => (
              <li
                key={p.client.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span>
                  <strong>{p.client.user.name}</strong>
                  <span className="block text-xs text-foreground/60">
                    {t("consultationLabel")}: {formatDateTime(p.startAt, locale)}
                  </span>
                </span>
                <ClientActions clientId={p.client.id} mode="pending" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("activeTitle")}</h2>
        {active.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("noClients")}</p>
        ) : (
          <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
            {active.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span>
                  <strong>{c.user.name}</strong>
                  <span className="text-foreground/60"> · {c.user.email}</span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/trainer/clients/${c.id}`}
                    className="rounded-full border border-foreground/20 px-3 py-1"
                  >
                    {t("view")}
                  </Link>
                  <ClientActions clientId={c.id} mode="active" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
