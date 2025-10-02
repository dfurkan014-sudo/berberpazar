import Link from 'next/link';
import type { DeviceType } from '@prisma/client';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';
import FavRemoveButton from 'src/components/FavRemoveButton';

export const dynamic = 'force-dynamic';

/* ---------- yardımcılar ---------- */
function fmtTRY(v: any) {
  const n =
    typeof v === 'string'
      ? Number(v)
      : typeof v === 'number'
      ? v
      : Number(v?.toString?.() ?? v);
  return Number.isFinite(n)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
    : String(v);
}

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

/* ---------- sayfa ---------- */
export default async function FavoritesPage() {
  const me = await getCurrentUser();
  if (!me) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Favorilerim</h1>
        <p className="text-sm text-gray-600">
          Favorilerinizi görmek için lütfen{' '}
          <Link href="/login" className="underline">giriş yapın</Link>.
        </p>
      </div>
    );
  }

  const rows = await prisma.favorite.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          brand: true,
          city: true,
          deviceType: true,
          seller: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Listing boş olabilir (silinmiş vb.). Güvenli map:
  const items = rows
    .filter(r => r.listing)
    .map(r => {
      const L = r.listing!;
      const images: string[] = Array.isArray(L.images)
        ? (L.images as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      return {
        id: L.id,
        title: L.title,
        price: String(L.price),
        cover: images[0] ?? null,
        sellerName: L.seller?.name ?? '—',
        brand: L.brand ?? null,
        city: L.city ?? null,
        typeLabel: deviceLabel(L.deviceType as DeviceType | null),
        favoredAt: r.createdAt,
      };
    });

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Favorilerim</h1>
        <p className="text-sm text-gray-600">
          Henüz favori listeniz boş.{' '}
          <Link href="/listings" className="underline">İlanlara göz atın</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Favorilerim</h1>
        <Link href="/listings" className="text-sm underline">İlanlara dön</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(it => (
          <div key={it.id} className="relative border rounded-lg overflow-hidden hover:shadow transition">
            {/* Kaldır butonu */}
            <div className="absolute top-2 right-2 z-10">
              <FavRemoveButton listingId={it.id} />
            </div>

            <Link href={`/listings/${it.id}`} className="block">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {it.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.cover} alt={it.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-sm">Görsel yok</span>
                )}
              </div>

              <div className="p-3 space-y-1">
                <div className="font-medium line-clamp-1">{it.title}</div>
                <div className="text-sm">{fmtTRY(it.price)}</div>

                {/* rozetler */}
                <div className="mt-1 flex flex-wrap">
                  {it.brand && <Badge>Marka: {it.brand}</Badge>}
                  {it.city && <Badge>Şehir: {it.city}</Badge>}
                  {it.typeLabel && <Badge>Tür: {it.typeLabel}</Badge>}
                </div>

                <div className="text-xs text-gray-600">Satıcı: {it.sellerName}</div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
