// src/components/Header.tsx
import Link from 'next/link';
import { getCurrentUser } from 'src/app/lib/authServer';

export const dynamic = 'force-dynamic';

export default async function Header() {
  const me = await getCurrentUser().catch(() => null);

  return (
    <header className="border-b bg-white/70 backdrop-blur">
      {/* Orta menüyü gerçekten merkezlemek için container'ı relative yapıyoruz */}
      <div className="relative max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Sol — Logo */}
        <Link href="/" className="text-base font-semibold">
          berberpazar
        </Link>

        {/* Orta — Gezinme (mutlak merkez) */}
        <nav className="hidden sm:flex items-center gap-4 text-sm absolute left-1/2 -translate-x-1/2">
          <Link href="/listings" className="hover:underline">
            İlanlar
          </Link>
          {/* Favorilerim sadece girişliyken görünsün */}
          {me && (
            <Link href="/favorites" className="hover:underline">
              Favorilerim
            </Link>
          )}
          {/* Benim İlanlarım da sadece girişliyken */}
          {me && (
            <Link href="/my" className="hover:underline">
              Benim İlanlarım
            </Link>
          )}
        </nav>

        {/* Sağ — Oturum */}
        <div className="flex items-center gap-3 text-sm">
          {me ? (
            <>
              <span className="hidden sm:inline text-gray-600">
                {me.name ?? me.email}
              </span>
              <Link
                href="/my/profile"
                className="px-3 py-1 rounded border border-black/20 text-gray-800 hover:bg-black/5"
                title="Profilimi düzenle"
              >
                Profil
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-black text-white hover:opacity-90"
                >
                  Çıkış
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1 rounded bg-black text-white hover:opacity-90"
            >
              Giriş
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
