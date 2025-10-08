// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { prisma } from 'src/app/lib/prisma';

export const revalidate = 60 * 60; // 1 saat: sitemap'i saatlik yenile

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listings = await prisma.listing.findMany({
    select: { id: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 500, // gerekirse arttırılabilir
  });

  const listingUrls: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${BASE_URL}/listings/${l.id}`,
    // slug'lı URL'e geçersen: `${BASE_URL}/listings/${l.id}-${slug}`
    lastModified: l.updatedAt ?? l.createdAt ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const now = new Date();

  return [
    { url: `${BASE_URL}/`,          lastModified: now, changeFrequency: 'daily',  priority: 1 },
    { url: `${BASE_URL}/listings`,  lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    // /listings/new, /login, /favorites, /listings/mine gibi özel sayfaları sitemap'e eklemiyoruz.
    ...listingUrls,
  ];
}
