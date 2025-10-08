// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "src/app/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const listings = await prisma.listing.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const listingUrls: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${host}/listings/${l.id}`,
    lastModified: l.updatedAt ?? new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    { url: `${host}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${host}/listings`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${host}/listings/new`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    ...listingUrls,
  ];
}
