import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

// Generated per-request so it reflects the live set of trainers.
export const dynamic = "force-dynamic";

const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const locales = ["en", "hu"];
const staticPaths = ["", "/trainers", "/request-trainer", "/login", "/register"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const loc of locales) {
    for (const p of staticPaths) {
      entries.push({
        url: `${base}/${loc}${p}`,
        changeFrequency: "weekly",
        priority: p === "" ? 1 : 0.6,
      });
    }
  }

  // Public trainer profiles (best-effort: skip if the DB is unreachable so the
  // sitemap still builds with the static pages).
  try {
    const trainers = await prisma.trainerProfile.findMany({
      where: { acceptingClients: true },
      select: { id: true, updatedAt: true },
    });
    for (const loc of locales) {
      for (const tr of trainers) {
        entries.push({
          url: `${base}/${loc}/trainers/${tr.id}`,
          lastModified: tr.updatedAt,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // ignore — return static entries only
  }

  return entries;
}
