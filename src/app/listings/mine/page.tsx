// src/app/listings/mine/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma, DeviceType } from '@prisma/client';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';
import DeleteListingButton from 'src/components/DeleteListingButton';

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

function deviceLabel(dt: DeviceType | null | undefined) {
  switch (dt) {
    case 'SAC_KESME_MAKINESI': return 'Saç kesme makinesi';
    case 'TRAS_MAKINESI':      return 'Tıraş makinesi';
    case 'SAKAL_DUZELTICI':    return 'Sakal düzeltici';
    case 'FON_MAKINESI':       return 'Fön makinesi';
    case 'MAKAS':              return 'Makas';
    case 'JILET':              return 'Jilet';
    case 'DIGER':              return 'Diğer';
    default: return null;
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs mr-1 mb-1">
      {children}
    </span>
  );
}

/* ---------- sayfa ---------- */
type Search = { page?: string };

export default async function MyListingsPage({
  // Next 15 önerisi: searchParams Promise olarak gelir, await etmeliyiz
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const me = await getCurrentUser();
  if (!me) {
    redirect('/login?returnTo=/listings/mine');
  }

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? 1) || 1);

  const take = 12;
  const skip = (page - 1) * take;

  const where: Prisma.ListingWhereInput = { sellerId: me!.id };

  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.listing.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / take));
  const buildHref = (p: number) => `/listings/mine?page=${p}`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Benim İlanlarım</h1>
        <Link href="/listings/new" className="px-3 py-2 rounded bg-black text-white text-sm">
          Yeni İlan
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">
          Henüz ilanınız yok. Sağ üstten <span className="font-medium">Yeni İlan</span> ekleyebilirsiniz.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((it) => {
            const images: string[] = Array.isArray(it.images)
              ? (it.images as unknown[]).filter((x): x is string => typeof x === 'string')
              : [];
            const cover = images[0] ?? null;
            const typeLbl = deviceLabel(it.deviceType as DeviceType | null);

            return (
              <div key={it.id} className="border rounded-lg overflow-hidden hover:shadow transition">
                <Link href={`/listings/${it.id}`} className="block">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={it.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 text-sm">Görsel yok</span>
                    )}
                  </div>
                </Link>

                <div className="p-3 space-y-2">
                  <div className="font-medium line-clamp-1">{it.title}</div>
                  <div className="text-sm text-gray-700">{fmtTRY(it.price)}</div>

                  <div className="mt-1 flex flex-wrap">
                    {it.brand && <Badge>Marka: {it.brand}</Badge>}
                    {it.city && <Badge>Şehir: {it.city}</Badge>}
                    {typeLbl && <Badge>Tür: {typeLbl}</Badge>}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/listings/${it.id}/edit`}
                      className="px-2 py-1 text-xs rounded border"
                    >
                      Düzelt
                    </Link>
                    <DeleteListingButton listingId={it.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
