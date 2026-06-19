import type { MetadataRoute } from "next";

const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private/app areas and the API out of the index.
      disallow: ["/api/", "/en/admin", "/hu/admin"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
