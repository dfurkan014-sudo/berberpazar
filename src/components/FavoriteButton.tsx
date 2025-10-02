'use client';

import { useState, useTransition } from 'react';

type Props = {
  listingId: number;
  /** SSR'dan biliniyorsa ver, bilinmiyorsa boş bırak; default false */
  initialFavorite?: boolean;
};

export default function FavoriteButton({
  listingId,
  initialFavorite = false,
}: Props) {
  const [fav, setFav] = useState<boolean>(initialFavorite);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        if (!fav) {
          // Favoriye ekle
          const r = await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ listingId }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error ?? r.statusText);
          setFav(true);
        } else {
          // Favoriden çıkar
          const r = await fetch(`/api/favorites/${listingId}`, { method: 'DELETE' });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data?.error ?? r.statusText);
          setFav(false);
        }
      } catch (e: any) {
        setMsg(e?.message ?? 'Hata');
      }
    });
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`px-2 py-1 rounded border text-sm ${
          fav ? 'bg-rose-600 text-white border-rose-700' : ''
        }`}
      >
        {fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      </button>
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </div>
  );
}
