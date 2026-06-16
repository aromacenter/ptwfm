import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedClient, clientHasHealthConsent } from "@/lib/clients/access";
import { ClientNotes } from "@/components/client-notes";
import { ClientPlans } from "@/components/client-plans";
import { AiPanel } from "@/components/ai-panel";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; clientId: string }>;
}) {
  const { locale, clientId } = await params;
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

  const client = await getOwnedClient(user.id, clientId);
  if (!client) notFound();

  const [hasConsent, plans] = await Promise.all([
    clientHasHealthConsent(client.userId),
    prisma.trainingPlan.findMany({
      where: { clientId },
      orderBy: { startDate: "desc" },
      include: { items: { orderBy: { position: "asc" } } },
    }),
  ]);

  const t = await getTranslations("clients");
  const tAi = await getTranslations("ai");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <p className="text-sm text-foreground/60">{client.email}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("notesTitle")}</h2>
        {hasConsent ? (
          <ClientNotes clientId={clientId} />
        ) : (
          <p className="text-sm text-amber-700">{t("consentMissing")}</p>
        )}
      </section>

      {hasConsent && (
        <section className="space-y-3">
          <AiPanel
            endpoint="/api/ai/client-summary"
            body={{ clientId }}
            title={tAi("summaryTitle")}
            generateLabel={tAi("generate")}
          />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("plansTitle")}</h2>
        <ClientPlans
          clientId={clientId}
          initialPlans={plans.map((p) => ({
            id: p.id,
            title: p.title,
            scope: p.scope,
            items: p.items.map((i) => i.content),
          }))}
        />
      </section>
    </main>
  );
}
