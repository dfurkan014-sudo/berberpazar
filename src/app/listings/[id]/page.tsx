// src/app/listings/[id]/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';
import Gallery from 'src/components/Gallery';
import FavoriteButton from 'src/components/FavoriteButton';
import DeleteListingButton from 'src/components/DeleteListingButton';
import ReviewsBox from 'src/components/ReviewsBox';

/* ---------- helpers ---------- */
function fmtTRY(v: any) {
  const n =
    typeof v === 'string' ? Number(v)
    : typeof v === 'number' ? v
    : Number(v?.toString?.() ?? v);
  return Number.isFinite(n)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
    : String(v);
}
function mailHref(email?: string | null, subject?: string, body?: string) {
  if (!email) return '#';
  const s = subject ? `subject=${encodeURIComponent(subject)}` : '';
  const b = body ? `body=${encodeURIComponent(body)}` : '';
  const q = [s, b].filter(Boolean).join('&');
  return `mailto:${email}${q ? `?${q}` : ''}`;
}
function normalizePhoneForWa(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('0') && digits.length >= 11) {
    digits = '90' + digits.slice(1);
  } else if (digits.startsWith('5')) {
    digits = '90' + digits;
  }
  return digits.replace(/[^\d]/g, '') || null;
}
function waHref(phone?: string | null, text?: string) {
  const p = normalizePhoneForWa(phone);
  if (!p) return '#';
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${p}${q}`;
}
function avatarOf(name: string | null, email: string) {
  const seed = encodeURIComponent(name || email || 'berberpazar');
  return `https://source.boringavatars.com/beam/80/${seed}?square=true`;
}
function deviceTypeLabel(dt?: string | null) {
  switch (dt) {
    case 'SAC_KESME_MAKINESI': return 'Saç kesme makinesi';
    case 'TRAS_MAKINESI':      return 'Tıraş makinesi';
    case 'SAKAL_DUZELTICI':    return 'Sakal düzeltici';
    case 'FON_MAKINESI':       return 'Fön makinesi';
    case 'MAKAS':              return 'Makas';
    case 'JILET':              return 'Jilet';
    case 'DIGER':              return 'Diğer';
    default:                   return null;
  }
}

/* ---------- SSR yıldız + rozet (inline stil) ---------- */
function SSRStars({ value, size = 18 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
      {[1,2,3,4,5].map(i => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          style={{ opacity: i <= full ? 1 : 0.4 }}
          aria-hidden="true"
        >
          <path
            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
            fill="currentColor"
          />
        </svg>
      ))}
    </span>
  );
}
function SSRReviewBadge({
  average,
  count,
  className = "",
}: { average: number; count: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(39,39,42,0.7)', // zinc-800/70
        color: '#f4f4f5', // zinc-100
        padding: '6px 10px',
        borderRadius: 12,
        fontSize: 14,
        lineHeight: 1,
      }}
    >
      <SSRStars value={average} size={16} />
      <span>{average.toFixed(1)}</span>
      <span style={{ opacity: 0.7 }}>({count})</span>
    </span>
  );
}

/* ---------- generateMetadata (dinamik SEO) ---------- */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const nid = Number(id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!Number.isFinite(nid)) {
    return {
      title: 'İlan bulunamadı | BerberPazar',
      robots: { index: false, follow: true },
    };
  }

  const row = await prisma.listing.findUnique({
    where: { id: nid },
    select: {
      title: true,
      description: true,
      images: true,
      brand: true,
      deviceType: true,
      city: true,
      price: true,
      id: true,
    },
  });

  if (!row) {
    return {
      title: 'İlan bulunamadı | BerberPazar',
      robots: { index: false, follow: true },
    };
  }

  const images: string[] = Array.isArray(row.images)
    ? (row.images as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];

  const dtLabel = deviceTypeLabel(row.deviceType);
  const prettyPrice = fmtTRY(row.price);
  const title = `${row.title} | ${row.brand ? row.brand + ' | ' : ''}BerberPazar`;
  const desc =
    (row.description && row.description.trim().slice(0, 180)) ||
    [row.brand, dtLabel, row.city, prettyPrice].filter(Boolean).join(' · ');

  const url = `${appUrl}/listings/${row.id}`;

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'BerberPazar',
      locale: 'tr_TR',
      title,
      description: desc,
      images: images.length
        ? images.map((u) => ({ url: u }))
        : [{ url: `${appUrl}/og-default.png` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: images.length ? images : [`${appUrl}/og-default.png`],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    keywords: [
      'berber', 'kuaför', 'ikinci el', '2. el', 'sıfır', 'berber ekipmanları',
      row.brand || '', dtLabel || '', row.city || '', row.title,
    ].filter(Boolean),
  };
}

/* ---------- page ---------- */
export default async function ListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return notFound();

  const me = await getCurrentUser().catch(() => null);

  const row = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true, name: true, email: true, phone: true,
          city: true, avatarUrl: true, createdAt: true
        }
      },
    },
  });
  if (!row) return notFound();

  const isOwner = me?.id === row.sellerId;

  let initialFavorite = false;
  if (me?.id) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: me.id, listingId: row.id } },
      select: { id: true },
    });
    initialFavorite = Boolean(fav);
  }

  const countListings = await prisma.listing.count({ where: { sellerId: row.sellerId } });

  const images: string[] = Array.isArray(row.images)
    ? (row.images as unknown[])
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // ---- Yorum/puan istatistikleri (SSR rozet + JSON-LD için) ----
  const agg = await prisma.listingReview.aggregate({
    where: { listingId: row.id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const average = agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0;
  const reviewCount = agg._count._all;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `Berberpazar: ${row.title}`;
  const body =
    `Merhaba ${row.seller?.name || ''},\n` +
    `“${row.title}” ilanınız hakkında iletişime geçmek istiyorum.\n\n` +
    `${appUrl}/listings/${row.id}`;
  const waText = `Merhaba ${row.seller?.name || ''}, “${row.title}” ilanınız hakkında yazıyorum. ${appUrl}/listings/${row.id}`;

  const emailHref = mailHref(row.seller?.email, subject, body);
  const whatsappHref = waHref(row.seller?.phone, waText);

  // ---- SEO: Product + AggregateRating JSON-LD ----
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: row.title,
    image: images.length ? images : undefined,
    description: row.description || undefined,
    brand: row.brand ? { '@type': 'Brand', name: row.brand } : undefined,
    category: row.deviceType || undefined,
    offers: {
      '@type': 'Offer',
      price: String(row.price),
      priceCurrency: 'TRY',
      url: `${appUrl}/listings/${row.id}`,
      availability: 'https://schema.org/InStock',
    },
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: average,
            reviewCount,
          },
        }
      : {}),
    // Satıcı bilgisi (varsa)
    ...(row.seller?.name || row.seller?.email
      ? {
          seller: {
            '@type': 'Person',
            name: row.seller?.name || row.seller?.email,
          }
        }
      : {}),
  };

  // ---- SEO: BreadcrumbList JSON-LD ----
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'İlanlar',
        item: `${appUrl}/listings`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: row.title,
        item: `${appUrl}/listings/${row.id}`,
      },
    ],
  };

  const dtLabel = deviceTypeLabel(row.deviceType);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* SEO JSON-LD */}
      <script
        type="application/ld+json"
        // @ts-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // @ts-ignore
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* üst bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm space-x-2">
          <Link href="/listings" className="underline opacity-80">ilanlar</Link>
          <span className="opacity-60">/</span>
          <span className="opacity-80">{row.title.slice(0, 60)}</span>
        </div>

        <FavoriteButton listingId={row.id} initialFavorite={initialFavorite} />
      </div>

      {/* BAŞLIK + SSR ROZETİ (galerinin ÜSTÜNE alındı) */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{row.title}</h1>
        <SSRReviewBadge average={average} count={reviewCount} />
        <div className="text-lg">{fmtTRY(row.price)}</div>

        <div className="text-sm text-gray-600 space-x-3">
          {row.brand && (
            <span>
              Marka:{' '}
              <Link
                href={{ pathname: '/listings', query: { brands: row.brand } }}
                className="underline underline-offset-2 hover:opacity-80"
              >
                <b>{row.brand}</b>
              </Link>
            </span>
          )}
          {row.city && (
            <span>
              Şehir:{' '}
              <Link
                href={{ pathname: '/listings', query: { city: row.city } }}
                className="underline underline-offset-2 hover:opacity-80"
              >
                <b>{row.city}</b>
              </Link>
            </span>
          )}
          {dtLabel && (
            <span>
              Tür:{' '}
              <Link
                href={{ pathname: '/listings', query: { models: dtLabel } }}
                className="underline underline-offset-2 hover:opacity-80"
              >
                <b>{dtLabel}</b>
              </Link>
            </span>
          )}
        </div>

        {row.description && (
          <p className="text-sm mt-2 whitespace-pre-line">{row.description}</p>
        )}
      </div>

      {/* galeri */}
      <Gallery images={images} alt={row.title} />

      {/* satıcı kartı */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/users/${row.seller?.id ?? ''}`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.seller?.avatarUrl || avatarOf(row.seller?.name ?? null, row.seller?.email || '')}
                alt={row.seller?.name || row.seller?.email || 'satıcı'}
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-zinc-800"
              />
            </Link>
            <div className="text-sm">
              <div className="font-medium">
                <Link href={`/users/${row.seller?.id ?? ''}`} className="hover:underline">
                  {row.seller?.name || row.seller?.email}
                </Link>
                <span className="opacity-60"> · {countListings} ilan</span>
              </div>
              <div className="text-zinc-400">
                E-posta: {row.seller?.email || '—'}{row.seller?.phone ? <> · Telefon: {row.seller.phone}</> : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={emailHref}
              className={`rounded-xl px-3 py-2 text-sm font-medium border ${
                row.seller?.email ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
                : 'bg-zinc-900/50 border-zinc-800 pointer-events-none opacity-60'
              }`}
            >
              Satıcıya E-posta Gönder
            </a>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                row.seller?.phone ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-emerald-900/40 text-white/70 pointer-events-none'
              }`}
            >
              WhatsApp ile iletişim
            </a>
          </div>
        </div>
      </section>

      {/* sahip aksiyonları */}
      {isOwner && (
        <div className="flex items-center gap-2 pt-2">
          <Link
            href={`/listings/${row.id}/edit`}
            className="px-2 py-1 text-sm rounded border"
          >
            Düzelt
          </Link>
          <DeleteListingButton listingId={row.id} />
        </div>
      )}

      {/* yorum ve puanlama kutusu */}
      <ReviewsBox listingId={row.id} />
    </div>
  );
}
// EoF
