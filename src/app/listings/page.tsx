// src/app/listings/page.tsx
import Link from 'next/link';
import { prisma } from '../lib/prisma';

export const dynamic = 'force-dynamic';

function fmtTRY(v: any) {
  const n =
    typeof v === 'string' ? Number(v)
    : typeof v === 'number' ? v
    : Number(v?.toString?.() ?? v);
  return Number.isFinite(n)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
    : String(v);
}

type Props = {
  searchParams: { q?: string; page?: string };
};

export default async function ListingsIndex({ searchParams }: Props) {
  const q = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);

  const take = 12;
  const skip = (page - 1) * take;

  const where = q
    ? {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

      {/* Arama: GET formu, client kodu yok */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Ara: başlık, açıklama…"
          className="flex-1 border rounded p-2"
        />
        <button className="px-3 py-2 rounded border">Ara</button>
      </form>

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

            return (
              <Link
                href={`/listings/${it.id}`}
                key={it.id}
                className="border rounded-lg overflow-hidden hover:shadow transition"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 text-sm">Görsel yok</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-medium line-clamp-1">{it.title}</div>
                  <div className="text-sm text-gray-700">{fmtTRY(it.price)}</div>
                  <div className="text-xs text-gray-500 mt-1">
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
  );
}
