import Link from "next/link";
import { prisma } from "src/app/lib/prisma";
import { getCurrentUser } from "src/app/lib/authServer";
import BarberDecor from "src/components/BarberDecor";


/* ---------------- helpers ---------------- */
function fmtTRY(v: any) {
  const n =
    typeof v === "string" ? Number(v)
    : typeof v === "number" ? v
    : Number(v?.toString?.() ?? v);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)
    : String(v);
}

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const s = images.find((x) => typeof x === "string" && x.trim().length > 0) as string | undefined;
  return s?.trim() || null;
}

function bg(url?: string | null) {
  return {
    backgroundImage: url ? `url('${url}')` : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as React.CSSProperties;
}

export const dynamic = "force-dynamic";

/* -------------- PAGE -------------- */
export default async function HomePage() {
  const me = await getCurrentUser().catch(() => null);

  const newest = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { id: true, name: true, email: true } } },
    take: 12,
  });

  const brandAgg = await prisma.listing.groupBy({
    by: ["brand"],
    where: { brand: { not: null } },
    _count: { brand: true },
    orderBy: { _count: { brand: "desc" } },
    take: 8,
  });

  const categories = [
    { key: "SAC_KESME_MAKINESI", label: "Saç kesme", emoji: "💈" },
    { key: "TRAS_MAKINESI", label: "Tıraş makinesi", emoji: "🪒" },
    { key: "SAKAL_DUZELTICI", label: "Sakal düzeltici", emoji: "🧔" },
    { key: "FON_MAKINESI", label: "Fön makinesi", emoji: "💨" },
    { key: "MAKAS", label: "Makas", emoji: "✂️" },
    { key: "JILET", label: "Jilet", emoji: "🗡️" },
  ];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <>
      {/* Her zaman üstte dönen direkler (amblem yok) */}
      <BarberDecor />

      <main className="relative z-10 min-h-screen">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-950 to-black">
          <div
            className="absolute inset-0 opacity-20"
            style={bg("yaziyazi.png")}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Berber ekipmanlarını <span className="text-emerald-400">al &amp; sat</span>
            </h1>
            <p className="mt-3 text-zinc-400 max-w-2xl">
              Türkiye’nin berber pazarında profesyonel cihazlar, aksesuarlar ve daha fazlası.
              Hemen ara, keşfet ve iletişime geç.
            </p>

            {/* Arama */}
            <form action="/listings" method="get" className="mt-6 flex gap-2">
              <input
                name="q"
                placeholder="Ara: marka, başlık, açıklama..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-base"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-white font-medium hover:bg-emerald-500"
              >
                Ara
              </button>
            </form>

            {/* CTA’lar */}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/listings" className="rounded-xl border border-zinc-700 px-4 py-2 hover:bg-zinc-900">
                Tüm ilanlar
              </Link>
              <Link
                href={me ? "/listings/new" : "/login?next=/listings/new"}
                className="rounded-xl bg-white text-black px-4 py-2 font-medium hover:opacity-90"
              >
                {me ? "İlan ver" : "Giriş yap & ilan ver"}
              </Link>
            </div>
          </div>
        </section>

        {/* KATEGORİLER */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl sm:text-2xl font-semibold">Kategoriler</h2>
            <Link href="/listings" className="text-sm text-zinc-400 hover:underline">Hepsini görüntüle</Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map((c) => (
              <Link
                key={c.key}
                href={`/listings?deviceType=${encodeURIComponent(c.key)}`}
                className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-4 hover:border-zinc-700"
              >
                <div className="text-2xl">{c.emoji}</div>
                <div className="mt-2 text-sm font-medium">{c.label}</div>
                <div className="text-xs text-zinc-500 group-hover:text-zinc-400">İlanları gör</div>
              </Link>
            ))}
          </div>
        </section>

        {/* TREND MARKALAR */}
        {brandAgg.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-4">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl sm:text-2xl font-semibold">Trend markalar</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {brandAgg.map((b) => (
                <Link
                  key={b.brand ?? "unknown"}
                  href={`/listings?brand=${encodeURIComponent(b.brand ?? "")}`}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-900"
                >
                  {(b.brand ?? "Diğer")} <span className="opacity-60">· {b._count.brand}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* YENİ DÜŞENLER */}
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl sm:text-2xl font-semibold">Yeni düşenler</h2>
            <Link href="/listings" className="text-sm text-zinc-400 hover:underline">Tüm yeni ilanlar</Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {newest.map((l) => {
              const img = firstImage(l.images);
              return (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  className="w-64 shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                >
                  <div className="aspect-[4/3] rounded-t-2xl bg-zinc-900" style={bg(img || undefined)} />
                  <div className="p-3">
                    <div className="line-clamp-1 font-medium">{l.title}</div>
                    <div className="text-sm text-zinc-400">{fmtTRY(l.price)}</div>
                    <div className="mt-2 text-xs text-zinc-500 line-clamp-1">
                      {l.seller?.name || l.seller?.email}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* NASIL ÇALIŞIR */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Nasıl çalışır?</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-2xl">🔎</div>
              <div className="mt-2 font-medium">Keşfet</div>
              <div className="text-sm text-zinc-400">Arama ve filtrelerle ihtiyacın olan cihazı hızla bul.</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-2xl">💬</div>
              <div className="mt-2 font-medium">İletişime geç</div>
              <div className="text-sm text-zinc-400">Satıcıya e-posta veya WhatsApp üzerinden ulaş.</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-2xl">🛠️</div>
              <div className="mt-2 font-medium">Sat veya satın al</div>
              <div className="text-sm text-zinc-400">Güvenli alışveriş için yüz yüze veya anlaşmalı kargo tercih et.</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/listings" className="rounded-xl border border-zinc-700 px-4 py-2 hover:bg-zinc-900">
              İlanları keşfet
            </Link>
            <Link
              href={me ? "/listings/new" : "/login?next=/listings/new"}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-500"
            >
              {me ? "Ücretsiz ilan ver" : "Üye ol & ilan ver"}
            </Link>
          </div>
        </section>

        {/* FOOTER MINI */}
        <section className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} berberpazar ·{" "}
          <a href={`${appUrl}/listings`} className="underline">Tüm ilanlar</a>
        </section>
      </main>
    </>
  );
}
