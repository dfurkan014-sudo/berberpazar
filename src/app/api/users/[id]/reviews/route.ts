// src/app/api/users/[id]/reviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "src/app/lib/prisma";
import { getCurrentUser } from "src/app/lib/authServer";

export const dynamic = "force-dynamic";

/** Yardımcılar */
function s(v: unknown) {
  return String(v ?? "").trim();
}
function clampRating(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}
function ok(data: any, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}
function bad(error: string, init?: number) {
  return NextResponse.json({ error }, { status: init ?? 400 });
}

/** GET: /api/users/[id]/reviews
 *  Liste + istatistik + kullanıcının kendi yorumu
 *  Query: page=1&pageSize=10
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sellerId = Number(id);
  if (!Number.isFinite(sellerId) || sellerId <= 0) {
    return bad("Geçersiz kullanıcı id.", 400);
  }

  // sayfalama
  const sp = new URL(_.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const pageSize = Math.max(1, Math.min(50, Number(sp.get("pageSize") ?? 10)));
  const skip = (page - 1) * pageSize;

  // veri
  const [items, count, byStarRaw, me] = await Promise.all([
    prisma.sellerReview.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        reviewer: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    }),
    prisma.sellerReview.count({ where: { sellerId } }),
    prisma.sellerReview.groupBy({
      by: ["rating"],
      where: { sellerId },
      _count: true,
    }),
    getCurrentUser().catch(() => null),
  ]);

  // yıldız dağılımı + ortalama
  const byStar: Record<"1" | "2" | "3" | "4" | "5", number> = {
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
  };
  for (const r of byStarRaw) {
    const k = String(r.rating) as keyof typeof byStar;
    if (k in byStar) byStar[k] = (r._count as unknown as number) || 0;
  }
  const sum = byStarRaw.reduce(
    (acc, r) => acc + (r.rating as number) * ((r._count as unknown as number) || 0),
    0
  );
  const average = count ? Number((sum / count).toFixed(2)) : 0;

  // kullanıcının kendi yorumu (varsa)
  let myReview: any = null;
  if (me?.id) {
    myReview = await prisma.sellerReview.findUnique({
      where: { sellerId_reviewerId: { sellerId, reviewerId: me.id } },
      include: {
        reviewer: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  return ok({
    sellerId,
    stats: { average, count, byStar },
    myReview,
    items,
    page,
    pageSize,
    hasMore: skip + items.length < count,
  });
}

/** POST: /api/users/[id]/reviews
 *  Body: { rating: 1..5, comment?: string }
 *  Not: Aynı kullanıcı aynı satıcıyı bir kez oylayabilir (güncelleme yapılır)
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser().catch(() => null);
  if (!me?.id) return bad("Giriş yapınız.", 401);

  const { id } = await ctx.params;
  const sellerId = Number(id);
  if (!Number.isFinite(sellerId) || sellerId <= 0) return bad("Geçersiz kullanıcı id.", 400);
  if (sellerId === me.id) return bad("Kendinizi oylayamazsınız.", 403);

  const body = await req.json().catch(() => ({}));
  const rating = clampRating(Number(body?.rating));
  const comment = s(body?.comment);

  if (!rating) return bad("Puan (1-5) zorunludur.", 400);

  // upsert (@@unique[sellerId, reviewerId])
  const created = await prisma.sellerReview.upsert({
    where: { sellerId_reviewerId: { sellerId, reviewerId: me.id } },
    create: { sellerId, reviewerId: me.id, rating, comment: comment || null },
    update: { rating, comment: comment || null },
    include: {
      reviewer: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  // yeni istatistikler
  const [count, byStarRaw] = await Promise.all([
    prisma.sellerReview.count({ where: { sellerId } }),
    prisma.sellerReview.groupBy({
      by: ["rating"],
      where: { sellerId },
      _count: true,
    }),
  ]);
  const byStar: Record<"1" | "2" | "3" | "4" | "5", number> = {
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
  };
  for (const r of byStarRaw) {
    const k = String(r.rating) as keyof typeof byStar;
    if (k in byStar) byStar[k] = (r._count as unknown as number) || 0;
  }
  const sum = byStarRaw.reduce(
    (acc, r) => acc + (r.rating as number) * ((r._count as unknown as number) || 0),
    0
  );
  const average = count ? Number((sum / count).toFixed(2)) : 0;

  return ok({
    ok: true,
    review: created,
    stats: { average, count, byStar },
  }, 201);
}

/** DELETE: /api/users/[id]/reviews
 *  Kullanıcının bu satıcıya bıraktığı yorumu siler.
 */
export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser().catch(() => null);
  if (!me?.id) return bad("Giriş yapınız.", 401);

  const { id } = await ctx.params;
  const sellerId = Number(id);
  if (!Number.isFinite(sellerId) || sellerId <= 0) return bad("Geçersiz kullanıcı id.", 400);

  const existing = await prisma.sellerReview.findUnique({
    where: { sellerId_reviewerId: { sellerId, reviewerId: me.id } },
    select: { id: true },
  });
  if (!existing) return ok({ ok: true }); // zaten yok

  await prisma.sellerReview.delete({ where: { id: existing.id } });

  // yeni istatistikler
  const [count, byStarRaw] = await Promise.all([
    prisma.sellerReview.count({ where: { sellerId } }),
    prisma.sellerReview.groupBy({
      by: ["rating"],
      where: { sellerId },
      _count: true,
    }),
  ]);
  const byStar: Record<"1" | "2" | "3" | "4" | "5", number> = {
    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
  };
  for (const r of byStarRaw) {
    const k = String(r.rating) as keyof typeof byStar;
    if (k in byStar) byStar[k] = (r._count as unknown as number) || 0;
  }
  const sum = byStarRaw.reduce(
    (acc, r) => acc + (r.rating as number) * ((r._count as unknown as number) || 0),
    0
  );
  const average = count ? Number((sum / count).toFixed(2)) : 0;

  return ok({
    ok: true,
    stats: { average, count, byStar },
  });
}
