// src/app/api/listings/[id]/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
// Not: Bu import yolu dizinine göre değişir.
// Önce şunu deneyin (çoğu projede doğru):
import { prisma } from '../../../lib/prisma';
// Eğer "Module not found" hatası alırsan bunu dener misin:
// import { prisma } from '../../../../../lib/prisma';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { seller: { select: { id: true, name: true, email: true } } },
  });
  if (!listing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(listing);
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }

    const body = await req.json();

    const data: any = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (typeof body.description === 'string' || body.description === null) data.description = body.description;

    if (body.price !== undefined && body.price !== null) {
      data.price = new Prisma.Decimal(body.price);
    }

    if (Array.isArray(body.images)) {
      data.images = body.images.filter(Boolean);
    } else if (typeof body.images === 'string') {
      data.images = body.images
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    const updated = await prisma.listing.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
