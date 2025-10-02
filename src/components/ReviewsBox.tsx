"use client";
import React from "react";
import { Stars } from "./Stars";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { id: number; name: string | null; email: string; avatarUrl: string | null };
};

export default function ReviewsBox({ listingId }: { listingId: number }) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Review[]>([]);
  const [avg, setAvg] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [byStar, setByStar] = React.useState<Record<1|2|3|4|5, number>>({1:0,2:0,3:0,4:0,5:0});
  const [my, setMy] = React.useState<Review | null>(null);

  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/listings/${listingId}/reviews`);
    const d = await res.json();
    setItems(d.items ?? []);
    setAvg(d?.stats?.average ?? 0);
    setCount(d?.stats?.count ?? 0);
    setByStar(d?.stats?.byStar ?? {1:0,2:0,3:0,4:0,5:0});
    setMy(d?.myReview ?? null);
    if (d?.myReview) {
      setRating(d.myReview.rating);
      setComment(d.myReview.comment ?? "");
    } else {
      setRating(0);
      setComment("");
    }
    setLoading(false);
  }, [listingId]);

  React.useEffect(() => { load(); }, [load]);

  async function submit() {
    const r = await fetch(`/api/listings/${listingId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    if (r.status === 401) { window.location.href = "/login"; return; }
    const d = await r.json();
    if (d?.ok) load();
  }

  async function removeMine() {
    const r = await fetch(`/api/listings/${listingId}/reviews`, { method: "DELETE" });
    if (r.status === 401) { window.location.href = "/login"; return; }
    const d = await r.json();
    if (d?.ok) { setRating(0); setComment(""); load(); }
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-3">Yorumlar</h2>

      {/* Özet */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="text-3xl font-bold">{avg.toFixed(1)}</div>
        <Stars value={avg} />
        <div className="text-sm opacity-80">{count} yorum</div>
        <div className="flex gap-2 text-xs opacity-80">
          {[5,4,3,2,1].map(s => (
            <span key={s}>{s}★ {byStar[s as 1|2|3|4|5]}</span>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-zinc-700 p-4 mb-6 bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <span className="text-sm">Puanınız:</span>
          <Stars value={rating} interactive onChange={setRating} />
        </div>
        <textarea
          placeholder="Deneyimini yaz (opsiyonel)"
          className="mt-3 w-full rounded-lg bg-zinc-900 border border-zinc-700 p-2 text-sm"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={submit}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
          >
            Gönder
          </button>
          {my && (
            <button
              onClick={removeMine}
              className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-700 text-white text-sm"
            >
              Yorumumu sil
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="opacity-70 text-sm">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="opacity-70 text-sm">Henüz yorum yok.</div>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="border border-zinc-700 rounded-xl p-3 bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{r.author.name ?? r.author.email}</div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="mt-1 text-sm opacity-90">{r.comment}</p>}
              <div className="mt-1 text-xs opacity-60">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
