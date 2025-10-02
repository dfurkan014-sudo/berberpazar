'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/** ---------- küçük yardımcılar ---------- */
type Reviewer = { id: number; name: string | null; email: string; avatarUrl: string | null };
type Review = { id: number; rating: number; comment: string | null; createdAt: string; reviewer: Reviewer };
type Stats = { average: number; count: number; byStar: Record<'1'|'2'|'3'|'4'|'5', number> };
type ApiGet = {
  sellerId: number;
  stats: Stats;
  myReview: Review | null;
  items: Review[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}
function avatarOf(name: string | null, email: string) {
  const seed = encodeURIComponent(name || email || 'berberpazar');
  return `https://source.boringavatars.com/beam/64/${seed}?square=true`;
}
function fmtDate(s: string) {
  try { return new Intl.DateTimeFormat('tr-TR').format(new Date(s)); } catch { return s; }
}

/** ---------- yıldızlar ---------- */
function Star({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={filled ? 'fill-amber-400' : 'fill-zinc-700'}
      aria-hidden
    >
      <path d="M12 17.27 18.18 21 16.54 13.97 22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function StarsDisplay({ value, size = 18 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} filled={i <= full} size={size} />)}
    </div>
  );
}

function StarsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const v = hover || value || 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-1"
          aria-label={`${i} yıldız`}
        >
          <Star filled={i <= v} />
        </button>
      ))}
    </div>
  );
}

/** ---------- sayfa ---------- */
export const dynamic = 'force-dynamic';

export default function SellerReviewsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sellerId = Number(params?.id);

  const [data, setData] = useState<ApiGet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const sum = useMemo(() => data?.stats?.count ?? 0, [data]);
  const bars = useMemo(() => {
    const by = data?.stats?.byStar ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const max = Math.max(1, ...Object.values(by));
    // 5'ten 1'e doğru
    return [5, 4, 3, 2, 1].map((k) => {
      const c = by[String(k) as keyof typeof by] ?? 0;
      const w = Math.round((c / max) * 100);
      return { star: k, count: c, width: w };
    });
  }, [data]);

  async function fetchData() {
    if (!Number.isFinite(sellerId)) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/users/${sellerId}/reviews`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${r.status}`);
      const j: ApiGet = await r.json();
      setData(j);
      // var olan yorumumu forma koy
      if (j.myReview) {
        setRating(j.myReview.rating);
        setComment(j.myReview.comment ?? '');
      }
    } catch (e: any) {
      setError('Yorumlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [sellerId]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/users/${sellerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      if (r.status === 401) {
        router.push(`/login?redirect=/users/${sellerId}/reviews`);
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Kaydedilemedi');
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeMyReview() {
    if (!confirm('Yorumunuzu silmek istiyor musunuz?')) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/users/${sellerId}/reviews`, { method: 'DELETE' });
      if (r.status === 401) {
        router.push(`/login?redirect=/users/${sellerId}/reviews`);
        return;
      }
      if (!r.ok) throw new Error('Silinemedi');
      setComment('');
      setRating(5);
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Silinemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (!Number.isFinite(sellerId)) {
    return <div className="max-w-4xl mx-auto p-6">Geçersiz kullanıcı.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Satıcı puanları</h1>

        {/* Özet rozet */}
        <div className="flex items-center gap-2 text-sm">
          <StarsDisplay value={data?.stats?.average ?? 0} />
          <div className="text-zinc-400">
            <b className="text-zinc-100">{(data?.stats?.average ?? 0).toFixed(2)}</b> / 5 · {sum} oy
          </div>
        </div>
      </div>

      {/* dağılım çubukları */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="grid gap-2">
          {bars.map(({ star, count, width }) => (
            <div key={star} className="flex items-center gap-3">
              <div className="w-6 text-right text-sm text-zinc-400">{star}</div>
              <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden">
                <div style={{ width: `${width}%` }} className="h-full bg-zinc-600" />
              </div>
              <div className="w-8 text-right text-sm text-zinc-400">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* oy ver / düzenle */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="text-sm text-zinc-400">Bu satıcıyı oyla</div>
        <StarsInput value={rating} onChange={setRating} />
        <textarea
          placeholder="Kısa yorumunuz (opsiyonel)"
          value={comment}
          maxLength={500}
          onChange={(e) => setComment(e.target.value)}
          className="w-full min-h-[96px] rounded-xl border border-zinc-800 bg-zinc-900 p-3 outline-none"
        />
        {error && <div className="text-sm text-red-300">{error}</div>}
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {data?.myReview ? 'Güncelle' : 'Gönder'}
          </button>
          {data?.myReview && (
            <button
              onClick={removeMyReview}
              disabled={submitting}
              className="rounded-xl border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-60"
            >
              Yorumumu sil
            </button>
          )}
          <Link
            href={`/users/${sellerId}`}
            className="ml-auto text-sm text-zinc-400 underline underline-offset-4"
          >
            ← Satıcı sayfasına dön
          </Link>
        </div>
      </div>

      {/* yorum listesi */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        {loading ? (
          <div className="text-sm text-zinc-400">Yükleniyor…</div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="text-sm text-zinc-400">Henüz yorum yok.</div>
        ) : (
          <ul className="space-y-4">
            {data!.items.map((r) => (
              <li key={r.id} className="flex gap-3">
                <img
                  src={r.reviewer.avatarUrl || avatarOf(r.reviewer.name, r.reviewer.email)}
                  className="h-10 w-10 rounded-lg object-cover ring-1 ring-zinc-800"
                  alt={r.reviewer.name || r.reviewer.email}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{r.reviewer.name || r.reviewer.email}</div>
                    <StarsDisplay value={r.rating} size={14} />
                    <div className="text-xs text-zinc-500">{fmtDate(r.createdAt)}</div>
                  </div>
                  {r.comment && <div className="text-sm mt-1">{r.comment}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
