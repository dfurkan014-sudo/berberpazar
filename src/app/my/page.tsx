import Link from 'next/link';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';
import DeleteListingButton from 'src/components/DeleteListingButton';

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

export default async function MyListingsPage() {
  const me = await getCurrentUser();

  if (!me) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Benim ilanlarım</h1>
        <p className="text-sm text-gray-600">
          İlanlarınızı görmek için lütfen{' '}
          <Link href="/login" className="underline">giriş yapın</Link>.
        </p>
      </div>
    );
  }

  const rows = await prisma.listing.findMany({
    where: { sellerId: me.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      price: true,
      images: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const items = rows.map((r) => {
    const images: string[] = Array.isArray(r.images)
      ? (r.images as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
    const cover = images[0] ?? null;
    return {
      id: r.id,
      title: r.title,
      price: String(r.price),
      cover,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Benim ilanlarım</h1>
        <Link href="/listings/new" className="px-3 py-2 rounded bg-black text-white text-sm">
          Yeni ilan
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">
          Henüz ilanınız yok. <Link href="/listings/new" className="underline">Hemen bir tane oluşturun</Link>.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="border rounded-lg overflow-hidden hover:shadow transition">
              <Link href={`/listings/${it.id}`} className="block">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {it.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.cover} alt={it.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 text-sm">Görsel yok</span>
                  )}
                </div>
              </Link>

              <div className="p-3 space-y-2">
                <div className="font-medium line-clamp-1">{it.title}</div>
                <div className="text-sm">{fmtTRY(it.price)}</div>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/listings/${it.id}/edit`}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Düzenle
                  </Link>

                  <DeleteListingButton listingId={it.id} />
                </div>

                <div className="text-[11px] text-gray-500">
                  Oluşturma: {it.createdAt.toLocaleString('tr-TR')} •
                  {' '}Güncelleme: {it.updatedAt.toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
