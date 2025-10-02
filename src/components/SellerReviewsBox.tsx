'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Basit tipler */
type Reviewer = {
  id: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};
type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: Reviewer;
};
type Stats = {
  average: number;
  count: number;
  byStar: { '1': number; '2': number; '3': number; '4': number; '5': number };
};
type ApiData = {
  sellerId: number;
  stats: Stats;
  myReview: Review | null;
  items: Review[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function clampRating(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

/** Yıldız gösterimi (salt-okunur) */
function StarsDisplay({ value, size = 18 }: { value: number; size?: number }) {
  const stars = [1, 2, 3, 4, 5].map((i) => {
    const fill = i <= Math.round(value);
    return (
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={fill ? 'text-yellow-400' : 'text-zinc-600'}
        fill="currentColor"
      >
        <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.401 8.168L12 18.897l-7.335 3.867 1.401-8.168L.132 9.21l8.2-1.192L12 .587z" />
      </svg>
    );
  });
  return <div className="flex items-center gap-1">{stars}</div>;
}

/** Yıldız girişi (interaktif) */
function StarsInput({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Puan">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="focus:outline-none"
            aria-checked={active}
            role="radio"
            title={`${n} yıldız`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              className={active ? 'text-yellow-400' : 'text-zinc-600 hover:text-yellow-400'}
              fill="currentColor"
            >
              <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.401 8.168L12 18.897l-7.335 3.867 1.401-8.168L.132 9.21l8.2-1.192L12 .587z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function SellerReviewsBox({ sellerId }: { sellerId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  // ilk yükleme
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/users/${sellerId}/reviews`, { signal: ac.signal });
        const j: ApiData = await r.json();
        setData(j);
        if (j.myReview) {
          setRating(j.myReview.rating);
          setComment(j.myReview.comment ?? '');
        }
        setErr(null);
      } catch (e: any) {
        if (!ac.signal.aborted) setErr(e?.message || 'Yüklenemedi.');
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [sellerId]);

  const byStarEntries = useMemo(() => {
    if (!data) return [];
    return ([5, 4, 3, 2, 1] as const).map((k) => {
      const count = data.stats.byStar[String(k) as keyof Stats['byStar']];
      const pct = data.stats.count ? Math.round((count * 100) / data.stats.count) : 0;
      return { k, count, pct };
    });
  }, [data]);

  async function submit() {
    const r = clampRating(rating);
    if (!r) return;
    try {
      setSending(true);
      const res = await fetch(`/api/users/${sellerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: r, comment }),
      });
      if (res.status === 401) {
        // login'e yönlendir
        router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
        return;
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Kaydedilemedi.');
      // optimistic refresh
      setData((old) =>
        old
          ? {
              ...old,
              stats: j.stats,
              myReview: j.review,
              // en başa ekle/güncelle
              items: (() => {
                const list = old.items.slice();
                const idx = list.findIndex((x) => x.id === j.review.id);
                if (idx >= 0) list[idx] = j.review;
                else list.unshift(j.review);
                return list;
              })(),
            }
          : old
      );
    } catch (e: any) {
      alert(e?.message || 'Hata');
    } finally {
      setSending(false);
    }
  }

  async function removeMine() {
    if (!confirm('Yorumunuzu silmek istiyor musunuz?')) return;
    try {
      setSending(true);
      const res = await fetch(`/api/users/${sellerId}/reviews`, { method: 'DELETE' });
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
        return;
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Silinemedi.');
      setData((old) =>
        old
          ? {
              ...old,
              stats: j.stats,
              myReview: null,
              items: old.items.filter((x) => x.reviewer.id !== j?.reviewerId), // güvenli değilse yine de refresh edeceğiz
            }
          : old
      );
      // formu sıfırla
      setRating(5);
      setComment('');
    } catch (e: any) {
      alert(e?.message || 'Hata');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Satıcı puanları</h3>
        {data && (
          <div className="flex items-center gap-3">
            <StarsDisplay value={data.stats.average} />
            <div className="text-sm text-zinc-400">
              {data.stats.average.toFixed(2)} / 5 · {data.stats.count} oy
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-sm text-zinc-400">Yükleniyor…</div>
      ) : err ? (
        <div className="p-6 text-sm text-red-300">{err}</div>
      ) : !data ? (
        <div className="p-6 text-sm text-zinc-400">Veri yok.</div>
      ) : (
        <>
          {/* dağılım */}
          <div className="px-4 pt-4 grid gap-2">
            {byStarEntries.map(({ k, count, pct }) => (
              <div key={k} className="flex items-center gap-3">
                <div className="w-8 text-right text-sm">{k}</div>
                <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-2 bg-yellow-400"
                    style={{ width: `${pct}%` }}
                    aria-label={`${k} yıldız: %${pct}`}
                  />
                </div>
                <div className="w-16 text-right text-xs text-zinc-400">{count}</div>
              </div>
            ))}
          </div>

          {/* form */}
          <div className="p-4 border-t border-zinc-800">
            {data.myReview ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">Yorumunuzu düzenleyin</div>
                  <button
                    className="text-xs text-red-300 hover:underline"
                    onClick={removeMine}
                    disabled={sending}
                  >
                    Sil
                  </button>
                </div>
                <StarsInput value={rating} onChange={(n) => setRating(n)} />
                <textarea
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Kısa yorumunuz (opsiyonel)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button
                  onClick={submit}
                  disabled={sending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {sending ? 'Kaydediliyor…' : 'Güncelle'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-zinc-400">Bu satıcıyı oyla</div>
                <StarsInput value={rating} onChange={(n) => setRating(n)} />
                <textarea
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Kısa yorumunuz (opsiyonel)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button
                  onClick={submit}
                  disabled={sending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {sending ? 'Gönderiliyor…' : 'Gönder'}
                </button>
              </div>
            )}
          </div>

          {/* liste */}
          <div className="p-4 border-t border-zinc-800">
            {data.items.length === 0 ? (
              <div className="text-sm text-zinc-400">Henüz yorum yok.</div>
            ) : (
              <ul className="space-y-4">
                {data.items.map((r) => (
                  <li key={r.id} className="rounded-xl border border-zinc-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
                          {r.reviewer.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.reviewer.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-zinc-400">
                              {(r.reviewer.name || r.reviewer.email).slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm">
                            {r.reviewer.name || r.reviewer.email}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      </div>
                      <StarsDisplay value={r.rating} />
                    </div>
                    {!!r.comment && (
                      <p className="mt-2 text-sm text-zinc-300 whitespace-pre-line">
                        {r.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
