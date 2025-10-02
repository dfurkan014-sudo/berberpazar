import { NextResponse } from 'next/server';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';

export const dynamic = 'force-dynamic';

// body'den listingId okur
async function readListingId(req: Request) {
  try {
    const body = await req.json();
    const n = Number(body?.listingId);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

// Favorilerimi listele
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      listingId: true,
      createdAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          seller: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, favorites });
}

// Favoriye ekle (idempotent)
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const listingId = await readListingId(req);
  if (!listingId) {
    return NextResponse.json({ error: 'Geçersiz listingId' }, { status: 400 });
  }

  const favorite = await prisma.favorite.upsert({
    where: { userId_listingId: { userId: me.id, listingId } },
    update: {},
    create: { userId: me.id, listingId },
  });

  return NextResponse.json({ ok: true, favorite });
}

// Favoriden çıkar (idempotent)
export async function DELETE(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const listingId = await readListingId(req);
  if (!listingId) {
    return NextResponse.json({ error: 'Geçersiz listingId' }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: { userId: me.id, listingId },
  });

  return NextResponse.json({ ok: true });
}
