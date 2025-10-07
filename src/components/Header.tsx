// src/components/Header.tsx
import Link from "next/link";
import { getCurrentUser } from "src/app/lib/authServer";

export const dynamic = "force-dynamic";

export default async function Header() {
  const me = await getCurrentUser().catch(() => null);

  return (
    // inline style = kesin koyu nardo gri; class ile tema yardımcıları
    <header
      className="header-nardo sticky top-0 z-50 w-full"
      style={{ backgroundColor: "#2f3235", color: "#e5e7eb" }}
    >
      <div className="relative max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Sol — Logo */}
        <Link href="/" className="text-sm sm:text-base font-semibold">
          berberpazar
        </Link>

        {/* Orta — Gezinme */}
        <nav className="hidden sm:flex items-center gap-4 text-sm absolute left-1/2 -translate-x-1/2">
          <Link href="/listings" className="link-on-nardo">İlanlar</Link>
          {me && <Link href="/favorites" className="link-on-nardo">Favorilerim</Link>}
          {me && <Link href="/my" className="link-on-nardo">Benim İlanlarım</Link>}
        </nav>

        {/* Sağ — Oturum */}
        <div className="flex items-center gap-3 text-sm">
          {me ? (
            <>
              <span className="hidden sm:inline text-on-nardo-70">
                {me.name ?? me.email}
              </span>
              <Link href="/my/profile" className="btn-on-nardo-outline">Profil</Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="btn-on-nardo-solid">Çıkış</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-on-nardo-solid">Giriş</Link>
          )}
        </div>
      </div>
    </header>
  );
}
