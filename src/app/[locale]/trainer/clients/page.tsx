import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

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

  const clients = await prisma.clientProfile.findMany({
    where: { trainer: { userId: user.id } },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-foreground/70">{t("intro")}</p>
      </header>

      {clients.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("noClients")}</p>
      ) : (
        <ul className="divide-y divide-foreground/10 rounded border border-foreground/15">
          {clients.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>
                <strong>{c.user.name}</strong>
                <span className="text-foreground/60"> · {c.user.email}</span>
              </span>
              <Link
                href={`/trainer/clients/${c.id}`}
                className="rounded-full border border-foreground/20 px-3 py-1"
              >
                {t("view")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
