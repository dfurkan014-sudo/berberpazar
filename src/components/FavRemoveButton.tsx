'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  listingId: number;
  className?: string;
};

export default function FavRemoveButton({ listingId, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? res.statusText);

      // Listeyi tazele (kart kaybolacak)
      router.refresh();
    } catch (e: any) {
      setMsg(`Hata: ${e?.message ?? 'işlem başarısız'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={
          className ??
          'px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-60'
        }
        aria-label="Favoriden çıkar"
      >
        {busy ? 'Kaldırılıyor…' : 'Favoriden çıkar'}
      </button>
      {msg && <span className="text-[11px] text-red-500">{msg}</span>}
    </div>
  );
}
