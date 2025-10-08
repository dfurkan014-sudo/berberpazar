// src/app/robots.ts
import type { MetadataRoute } from 'next';

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // API & teknik rotalar
          '/api/', '/api/*',
          '/_next/', '/_next/*',
          // yönetim / kullanıcıya özel alanlar
          '/admin', '/admin/*',
          '/login', '/register', '/profile', '/favorites', '/listings/mine',
          // CRUD ekranları (indexleme gereksiz)
          '/listings/new',
          '/listings/*/edit',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL.replace(/^https?:\/\//, ''), // örn: berberpazar.com
  };
}
