import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from 'src/app/lib/prisma';

/* ---------------- helpers ---------------- */
function fmtTRY(v: any) {
  const n =
    typeof v === 'string' ? Number(v)
    : typeof v === 'number' ? v
    : Number(v?.toString?.() ?? v);
  return Number.isFinite(n)
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
    : String(v);
}

// mailto
function mailHref(email?: string | null, subject?: string, body?: string) {
  if (!email) return '#';
  const s = subject ? `subject=${encodeURIComponent(subject)}` : '';
  const b = body ? `body=${encodeURIComponent(body)}` : '';
  const q = [s, b].filter(Boolean).join('&');
  return `mailto:${email}${q ? `?${q}` : ''}`;
}

// WhatsApp: wa.me sadece rakam ister (ülke kodlu, +’sız)
function normalizePhoneForWa(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  // TR mobil: 0 5xx xxx xx xx, 5xx..., 90 5xx...
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

// avatar preset (varsayılan)
function avatarOf(name: string | null, email: string) {
  const seed = encodeURIComponent(name || email || 'berberpazar');
  return `https://source.boringavatars.com/beam/80/${seed}?square=true`;
}

/* --------------- page -------------------- */
type PageProps = { params: { id: string } };

export default async function SellerPage(props: PageProps) {
  // Next 15: params bir Promise gelir
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id)) return notFound();

  // satıcı
  const seller = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, city: true, avatarUrl: true, createdAt: true,
    },
  });
  if (!seller) return notFound();

  // sayaçlar
  const [countListings, countFavs, listings] = await Promise.all([
    prisma.listing.count({ where: { sellerId: id } }),
    prisma.favorite.count({ where: { userId: id } }),
    prisma.listing.findMany({
      where: { sellerId: id },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: { id: true, title: true, price: true, images: true, brand: true, city: true, deviceType: true },
    }),
  ]);

  // ⭐ YENİ: Puan özeti (sadece ortalama + toplam oy)
  // reviews sayfasındaki API’yi kullanmadan direkt DB’den çekiyoruz
  const revAgg = await prisma.sellerReview.aggregate({
    where: { sellerId: id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const ratingAvg = Number((revAgg._avg.rating ?? 0).toFixed(2));
  const ratingCount = revAgg._count._all;

  // iletişim linkleri
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const subject = `Berberpazar: ${seller.name || 'satıcı'} ile iletişim`;
  const body =
    `Merhaba ${seller.name || ''},\n` +
    `Berberpazar ilanlarınız hakkında iletişime geçmek istiyorum.\n\n` +
    `${appUrl}/users/${seller.id}`;
  const waText = `Merhaba ${seller.name || ''}, Berberpazar ilanlarınız hakkında yazıyorum. ${appUrl}/users/${seller.id}`;

  const emailHref = mailHref(seller.email, subject, body);
  const whatsappHref = waHref(seller.phone, waText);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* üst kart */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={seller.avatarUrl || avatarOf(seller.name, seller.email)}
              alt={seller.name || seller.email}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-zinc-800"
            />
            <div>
              <h1 className="text-xl font-semibold">{seller.name || seller.email}</h1>
              <div className="text-sm text-zinc-400">
                {seller.city ? <>Şehir: <b className="text-zinc-200">{seller.city}</b> · </> : null}
                Katılım: {new Intl.DateTimeFormat('tr-TR').format(new Date(seller.createdAt))}
              </div>

              {/* sayaçlar + ⭐ puan özeti */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  Toplam ilan: <b>{countListings}</b>
                </span>
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  Toplam favori: <b>{countFavs}</b>
                </span>

                {/* ⭐ Ortalama puan / oy sayısı */}
                <Link
                  href={`/users/${seller.id}/reviews`}
                  className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300 hover:bg-amber-500/20"
                >
                  ⭐ {ratingAvg.toFixed(2)} / 5 · {ratingCount} oy
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Satıcıyı yorumla — doğrudan yorum sayfasına götür */}
            <Link
              href={`/users/${seller.id}/reviews`}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
            >
              Kullanıcıyı yorumla
            </Link>

            {/* Satıcıya e-posta */}
            <a
              href={emailHref}
              className={`rounded-xl px-3 py-2 text-sm font-medium border ${
                seller.email ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
                : 'bg-zinc-900/50 border-zinc-800 pointer-events-none opacity-60'
              }`}
            >
              Satıcıya E-posta Gönder
            </a>

            {/* WhatsApp ile iletişim */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                seller.phone ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-emerald-900/40 text-white/70 pointer-events-none'
              }`}
            >
              WhatsApp ile iletişim
            </a>
          </div>
        </div>
      </section>

      {/* ilanlar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Satıcının İlanları</h2>
          <div className="text-xs text-zinc-400">
            {countListings} sonuç
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="text-sm text-zinc-400">Bu satıcının henüz ilanı yok.</div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((it) => {
              const imgs = Array.isArray(it.images)
                ? (it.images as unknown[])
                    .filter((x): x is string => typeof x === 'string')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : [];
              const thumb = imgs[0] || '/reset.svg';
              return (
                <li key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                  <Link href={`/listings/${it.id}`}>
                    <div className="aspect-[4/3] bg-zinc-900">
                      <img src={thumb} alt={it.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="font-medium line-clamp-1">{it.title}</div>
                      <div className="text-sm">{fmtTRY(it.price)}</div>
                      <div className="text-xs text-zinc-500 space-x-2">
                        {it.brand && <span>Marka: <b className="text-zinc-300">{it.brand}</b></span>}
                        {it.city && <span>Şehir: <b className="text-zinc-300">{it.city}</b></span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
// Not: Bu sayfa, satıcının ilanlarını ve iletişim bilgilerini gösterir.
// ⭐ Bu sürümde ek olarak yalnızca “puan özeti” (ortalama ve oy adedi) ile
// “Kullanıcıyı yorumla” linki eklendi. Tam interaktivite reviews sayfasındadır.
