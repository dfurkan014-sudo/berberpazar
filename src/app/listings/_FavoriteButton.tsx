'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  listingId: number;
  initial?: boolean;       // ilk durum (sunucudan gönderilecek)
  className?: string;
};

export default function FavoriteButton({ listingId, initial = false, className }: Props) {
  const router = useRouter();
  const [fav, setFav] = useState<boolean>(initial);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/favorites', {
        method: fav ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      // Giriş yapılmamışsa login'e yönlendir
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? res.statusText);

      setFav(!fav);
      setMsg(fav ? 'Favoriden çıkarıldı' : 'Favorilere eklendi');

      // Aynı sayfayı tazele (ISR/cache temizliği vs.)
      router.refresh();
    } catch (e: any) {
      setMsg(`Hata: ${e?.message ?? 'işlem başarısız'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        onClick={toggle}
        disabled={loading}
        className={`px-3 py-1.5 rounded border ${
          fav ? 'bg-red-600 text-white' : 'bg-black text-white'
        } disabled:opacity-50`}
      >
        {loading ? 'İşleniyor…' : fav ? 'Favoriden çıkar' : 'Favorilere ekle'}
      </button>
      {msg && <p className="mt-1 text-xs text-gray-400">{msg}</p>}
    </div>
  );
}
