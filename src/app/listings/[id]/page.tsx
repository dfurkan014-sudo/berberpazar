// src/app/listings/[id]/page.tsx
import Link from 'next/link';
import { prisma } from '../../lib/prisma';

export const dynamic = 'force-dynamic';

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

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600">Geçersiz ilan id.</p>
      </div>
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { seller: { select: { id: true, name: true, email: true } } },
  });

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-700">İlan bulunamadı.</p>
        <Link href="/listings" className="underline text-sm">Geri dön</Link>
      </div>
    );
  }

  // JSON alanını güvenli şekilde string[]'e çevir
  const images: string[] = Array.isArray(listing.images)
    ? (listing.images as unknown[]).filter((img): img is string => typeof img === 'string')
    : [];
  const cover = images[0] ?? null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <nav className="text-sm text-gray-600">
          <Link href="/listings" className="underline">İlanlar</Link> <span>/</span> {listing.title}
        </nav>
        <Link href="/listings" className="text-sm underline">Geri dön</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: görsel(ler) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-500 text-sm">Görsel yok</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {images.slice(1).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`image-${i + 2}`} className="w-full h-24 object-cover rounded" />
              ))}
            </div>
          )}
        </div>

        {/* Sağ: bilgiler */}
        <aside className="space-y-4">
          <div className="border rounded-lg p-4">
            <h1 className="text-xl font-semibold mb-1">{listing.title}</h1>
            <div className="text-lg">{fmtTRY(listing.price)}</div>
            {listing.description && (
              <p className="text-sm text-gray-700 mt-2">{listing.description}</p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="font-medium mb-2">Satıcı Bilgileri</h2>
            <div className="text-sm">
              <div><span className="text-gray-600">Ad:</span> {listing.seller?.name ?? '—'}</div>
              <div><span className="text-gray-600">E-posta:</span> {listing.seller?.email}</div>
            </div>
          </div>

          {/* Düzenle butonu */}
          <Link
            href={`/listings/${listing.id}/edit`}
            className="inline-block px-4 py-2 rounded bg-black text-white"
          >
            Düzenle
          </Link>
        </aside>
      </div>
    </div>
  );
}
