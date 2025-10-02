// src/app/listings/page.tsx
import Link from 'next/link';
import type { Prisma, DeviceType } from '@prisma/client';
import { prisma } from 'src/app/lib/prisma';
import Filters from 'src/components/Filters';
import ActiveFilters from 'src/components/ActiveFilters';
import ReviewBadge from 'src/components/ReviewBadge';

export const dynamic = 'force-dynamic';

/* ---------- yardımcılar ---------- */
function fmtTRY(v: any) {
  const n =
    typeof v === 'string' ? Number(v)
    : typeof v === 'number' ? v
    : Number(v?.toString?.() ?? v);
  return Number.isFinite(n)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
    : String(v);
}

function splitCsv(s: string) {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

// TR-normalizasyon (filtre eşlemesi için)
function normTr(s: string) {
  return s
    .toLocaleUpperCase('tr')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replaceAll('.', ' ')
    .replaceAll('Ş', 'S')
    .replaceAll('Ç', 'C')
    .replaceAll('Ğ', 'G')
    .replaceAll('Ü', 'U')
    .replaceAll('Ö', 'O')
    .replaceAll('İ', 'I')
    .replace(/\s+/g, ' ')
    .trim();
}

// Etiket → enum eşlemesi (filtre için)
const DEVICE_MAP_FOR_FILTER: Record<string, DeviceType> = {
  'SAC KESME MAKINESI': 'SAC_KESME_MAKINESI',
  'TRAS MAKINESI': 'TRAS_MAKINESI',
  'TIRAS MAKINESI': 'TRAS_MAKINESI',
  'SAKAL DUZELTICI': 'SAKAL_DUZELTICI',
  'FON MAKINESI': 'FON_MAKINESI',
  'MAKAS': 'MAKAS',
  'JILET': 'JILET',
  'DIGER': 'DIGER',
  'YEDEK BICAK': 'DIGER',
};

// Enum → okunur etiket (rozet için)
function deviceLabel(dt: DeviceType | null | undefined) {
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs mr-1 mb-1">
      {children}
    </span>
  );
}

/* ---------- tipler ---------- */
type SearchParams = {
  q?: string;
  page?: string;
  brands?: string;
  models?: string;   // “Sakal düzeltici,Fön makinesi” gibi
  city?: string;
  min?: string;
  max?: string;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | string;
};

/* ---------- sayfa ---------- */
export default async function ListingsIndex({
  // Next.js 15: searchParams bir Promise
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // UYARIYI GİDEREN KISIM
  const sp = await searchParams;

  const q = (sp.q ?? '').trim();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // URL → filtreler
  const brandsArr = splitCsv(sp.brands ?? '');
  const modelsArr = splitCsv(sp.models ?? '');
  const city = (sp.city ?? '').trim();

  // Fiyat aralığı
  const minRaw = String(sp.min ?? '').replace(',', '.').trim();
  const maxRaw = String(sp.max ?? '').replace(',', '.').trim();
  const min = Number.parseFloat(minRaw);
  const max = Number.parseFloat(maxRaw);
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);

  // Model etiketlerini enum stringlerine çevir (normalize ederek)
  const deviceTypes: DeviceType[] = modelsArr
    .map((m) => DEVICE_MAP_FOR_FILTER[normTr(m)] ?? null)
    .filter((v): v is DeviceType => Boolean(v));

  // Prisma where
  const where: Prisma.ListingWhereInput = {
    ...(q
      ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] }
      : {}),
    ...(brandsArr.length ? { brand: { in: brandsArr } } : {}),
    ...(deviceTypes.length ? { deviceType: { in: deviceTypes } } : {}),
    ...(city ? { city: { contains: city } } : {}),
    ...(hasMin || hasMax
      ? {
          price: {
            ...(hasMin ? { gte: String(min.toFixed?.(2) ?? min) } : {}),
            ...(hasMax ? { lte: String(max.toFixed?.(2) ?? max) } : {}),
          },
        }
      : {}),
  };

  // Sıralama
  const sort = (sp.sort ?? 'newest') as SearchParams['sort'];
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sort === 'price_asc'
      ? { price: 'asc' }
      : sort === 'price_desc'
      ? { price: 'desc' }
      : sort === 'oldest'
      ? { createdAt: 'asc' }
      : { createdAt: 'desc' }; // default newest

  const take = 12;
  const skip = (page - 1) * take;

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      take,
      skip,
      include: { seller: { select: { name: true } } },
    }),
    prisma.listing.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (sp.brands) params.set('brands', sp.brands);
    if (sp.models) params.set('models', sp.models);
    if (sp.city) params.set('city', sp.city);
    if (sp.min) params.set('min', sp.min);
    if (sp.max) params.set('max', sp.max);
    if (sp.sort) params.set('sort', String(sp.sort));
    params.set('page', String(p));
    return `/listings?${params.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">İlanlar</h1>
        <Link href="/listings/new" className="px-3 py-2 rounded bg-black text-white text-sm">
          Yeni İlan
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Sol: Filtre paneli (client) */}
        <Filters />

        {/* Sağ: arama, aktif filtreler, kartlar */}
        <div className="flex-1 space-y-4">
          <form method="GET" className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Ara: başlık, açıklama…"
              className="flex-1 border rounded p-2"
            />
            <button className="px-3 py-2 rounded border">Ara</button>
          </form>

          {/* Aktif filtre rozetleri */}
          <ActiveFilters />

          {/* Sonuçlar */}
          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">
              Kayıt bulunamadı{q ? ` (arama: "${q}")` : ''}.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((it) => {
                const images: string[] = Array.isArray(it.images)
                  ? (it.images as unknown[]).filter((x): x is string => typeof x === 'string')
                  : [];
                const cover = images[0] ?? null;
                const typeLabel = deviceLabel(it.deviceType as DeviceType | null);

                return (
                  <Link
                    href={`/listings/${it.id}`}
                    key={it.id}
                    className="border rounded-lg overflow-hidden hover:shadow transition"
                  >
                    {/* KAPLAYICI: relative + rozet */}
                    <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-500 text-sm">Görsel yok</span>
                      )}
                      {/* ROZET */}
                      <ReviewBadge listingId={it.id} className="absolute top-2 right-2" />
                    </div>

                    <div className="p-3">
                      <div className="font-medium line-clamp-1">{it.title}</div>
                      <div className="text-sm text-gray-700">{fmtTRY(it.price)}</div>

                      {/* rozetler */}
                      <div className="mt-2 flex flex-wrap">
                        {it.brand && <Badge>Marka: {it.brand}</Badge>}
                        {it.city && <Badge>Şehir: {it.city}</Badge>}
                        {typeLabel && <Badge>Tür: {typeLabel}</Badge>}
                      </div>

                      <div className="text-xs text-gray-500 mt-2">
                        {it.seller?.name ?? 'Satıcı'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                href={buildHref(Math.max(1, page - 1))}
                aria-disabled={page === 1}
                className={`px-3 py-1 rounded border text-sm ${
                  page === 1 ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                ‹ Önceki
              </Link>
              <span className="text-sm text-gray-600">
                Sayfa {page} / {totalPages}
              </span>
              <Link
                href={buildHref(Math.min(totalPages, page + 1))}
                aria-disabled={page === totalPages}
                className={`px-3 py-1 rounded border text-sm ${
                  page === totalPages ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Sonraki ›
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
