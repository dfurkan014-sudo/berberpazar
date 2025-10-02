'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  listingId: number;
  afterDelete?: () => void; // (opsiyonel) Silme sonrası özel işlem
  className?: string;
  label?: string;
};

export default function DeleteListingButton({
  listingId,
  afterDelete,
  className,
  label = 'Sil',
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onDelete() {
    if (busy) return;
    setErr(null);

    const ok = window.confirm('Bu ilanı silmek istediğine emin misin?');
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? res.statusText);

      // Listeyi yenile
      if (afterDelete) afterDelete();
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Silme başarısız');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className={
          className ??
          'px-3 py-1.5 rounded bg-red-600 text-white text-sm disabled:opacity-60'
        }
      >
        {busy ? 'Siliniyor…' : label}
      </button>
      {err && <span className="text-[11px] text-red-500">{err}</span>}
    </div>
  );
}
