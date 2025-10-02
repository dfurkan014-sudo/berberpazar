import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* ================= Rate Limit (in-memory) ================= */
type RLState = { count: number; resetAt: number };
const __rl: Map<string, RLState> =
  (globalThis as any).__reviews_rl ?? new Map<string, RLState>();
(globalThis as any).__reviews_rl = __rl;

function now() { return Date.now(); }

function isLimitedWith(key: string, windowMs: number, max: number): boolean {
  const t = now();
  const st = __rl.get(key);
  if (!st || t >= st.resetAt) {
    __rl.set(key, { count: 1, resetAt: t + windowMs });
    return false;
  }
  if (st.count >= max) return true;
  st.count++;
  return false;
}

function ipFrom(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return (req as any).ip ?? '0.0.0.0';
}

/* ================= helpers ================= */
const toInt = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : d;
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const s = (v: unknown) => String(v ?? '').trim();
const sanitize = (v: unknown) =>
  s(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, 1000);

/* ================= GET ================= */
/** GET /api/listings/:id/reviews?page=&pageSize= */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const listingId = toInt(id, 0);
  if (!listingId) return NextResponse.json({ error: 'Geçersiz ilan id' }, { status: 400 });

  const url = new URL(req.url);
  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSize = clamp(toInt(url.searchParams.get('pageSize'), 10), 1, 50);
  const skip = (page - 1) * pageSize;

  const me = await getCurrentUser().catch(() => null);

  const exists = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true },
  });
  if (!exists) return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 });

  const itemsRaw = await prisma.listingReview.findMany({
    where: { listingId },
    include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize + 1,
  });
  const hasMore = itemsRaw.length > pageSize;
  if (hasMore) itemsRaw.pop();

  const agg = await prisma.listingReview.aggregate({
    where: { listingId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const byStarRaw = await prisma.listingReview.groupBy({
    by: ['rating'],
    where: { listingId },
    _count: { rating: true },
  });
  const byStar: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of byStarRaw) {
    const r = clamp(row.rating, 1, 5) as 1 | 2 | 3 | 4 | 5;
    byStar[r] = row._count.rating;
  }

  // benim yorumum
  let myReview: null | { id: number; rating: number; comment: string | null; createdAt: string } = null;
  if (me?.id) {
    const r = await prisma.listingReview.findUnique({
      where: { authorId_listingId: { authorId: me.id, listingId } },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });
    if (r) {
      myReview = {
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    }
  }

  return NextResponse.json({
    listingId,
    stats: {
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      count: agg._count._all,
      byStar,
    },
    myReview,
    items: itemsRaw.map((it) => ({
      id: it.id,
      rating: it.rating,
      comment: it.comment ?? null,
      createdAt: it.createdAt.toISOString(),
      author: {
        id: it.author.id,
        name: it.author.name ?? null,
        email: it.author.email,
        avatarUrl: it.author.avatarUrl ?? null,
      },
    })),
    page,
    pageSize,
    hasMore,
  });
}

/* ================= POST ================= */
/** Body: { rating:1..5, comment?:string } */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const listingId = toInt(id, 0);
  if (!listingId) return NextResponse.json({ error: 'Geçersiz ilan id' }, { status: 400 });

  // yumuşak rate-limit: 5dk/8 istek
  const rlKey = `rev:post:${me.id}:${ipFrom(req)}:${listingId}`;
  if (isLimitedWith(rlKey, 5 * 60_000, 8)) {
    return NextResponse.json(
      { error: 'Çok sık istek. Lütfen biraz sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': '300' } }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const rating = clamp(toInt(body?.rating, 0), 1, 5);
  const comment = sanitize(body?.comment);
  if (!rating) return NextResponse.json({ error: 'Puan (1-5) zorunlu' }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true },
  });
  if (!listing) return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 });
  if (listing.sellerId === me.id) {
    return NextResponse.json({ error: 'Kendi ilanınıza yorum yazamazsınız' }, { status: 403 });
  }

  // DB tabanlı kısa cooldown: aynı user->aynı ilan 10sn’de 1 kez
  const existing = await prisma.listingReview.findUnique({
    where: { authorId_listingId: { authorId: me.id, listingId } },
    select: { updatedAt: true },
  });
  if (existing) {
    const diff = now() - existing.updatedAt.getTime();
    if (diff < 10_000) {
      return NextResponse.json(
        { error: 'Çok hızlı ardışık işlem. Birkaç saniye sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((10_000 - diff) / 1000)) } }
      );
    }
  }

  const saved = await prisma.listingReview.upsert({
    where: { authorId_listingId: { authorId: me.id, listingId } },
    create: {
      rating,
      comment: comment || null,
      author: { connect: { id: me.id } },
      listing: { connect: { id: listingId } },
    },
    update: { rating, comment: comment || null },
    include: { author: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  const agg = await prisma.listingReview.aggregate({
    where: { listingId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    ok: true,
    review: {
      id: saved.id,
      rating: saved.rating,
      comment: saved.comment ?? null,
      createdAt: saved.createdAt.toISOString(),
      author: {
        id: saved.author.id,
        name: saved.author.name ?? null,
        email: saved.author.email,
        avatarUrl: saved.author.avatarUrl ?? null,
      },
    },
    stats: {
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      count: agg._count._all,
    },
  });
}

/* ================= DELETE ================= */
/** Kendi yorumunu siler; idempotent. Her zaman ok:true döner. */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const listingId = toInt(id, 0);
  if (!listingId) return NextResponse.json({ error: 'Geçersiz ilan id' }, { status: 400 });

  // Silme için daha esnek limit: 1dk/20 istek (kullanıcı yanlışlıkla çok tıklarsa bile sorun çıkmasın)
  const rlKey = `rev:del:${me.id}:${ipFrom(req)}:${listingId}`;
  if (isLimitedWith(rlKey, 60_000, 20)) {
    return NextResponse.json(
      { error: 'Çok sık silme isteği. Lütfen 1 dakika sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // İlan var mı (net hata yerine idempotent davranış için sadece kontrol)?
  const exists = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!exists) {
    // İlan yoksa da "ok:true, deleted:0" dönerek idempotent davran.
    return NextResponse.json({ ok: true, deleted: 0, stats: { average: 0, count: 0 } });
  }

  // Silme + güncel istatistik tek transaction içinde
  const [delRes, agg] = await prisma.$transaction([
    prisma.listingReview.deleteMany({ where: { listingId, authorId: me.id } }),
    prisma.listingReview.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: delRes.count, // 0 olabilir: idempotent
    stats: {
      average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      count: agg._count._all,
    },
  });
}
