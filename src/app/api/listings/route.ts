// src/app/api/listings/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
// Geçici olarak relatif import: route.ts konumu -> src/lib/prisma
import { prisma } from '../../lib/prisma';

// Tüm ilanları listele
export async function GET() {
  const listings = await prisma.listing.findMany({
    include: { seller: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(listings);
}

// Yeni ilan oluştur
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title: string = body?.title ?? '';
    const description: string | null = body?.description ?? null;
    const priceRaw = body?.price;
    const sellerEmail: string | undefined = body?.sellerEmail;
    let images: string[] = [];

    // images: ["url1","url2"] veya "url1, url2" ikisini de destekle
    if (Array.isArray(body?.images)) {
      images = body.images.filter(Boolean);
    } else if (typeof body?.images === 'string') {
      images = body.images.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (!title || priceRaw === undefined || priceRaw === null) {
      return NextResponse.json({ error: 'title ve price zorunlu' }, { status: 400 });
    }

    // Satıcıyı bul (gönderilen email varsa onu kullan; yoksa ilk kullanıcıyı al)
    const seller =
      (sellerEmail
        ? await prisma.user.findUnique({ where: { email: sellerEmail } })
        : await prisma.user.findFirst()) ?? null;

    if (!seller) {
      return NextResponse.json({ error: 'Önce bir User oluşturmalısın.' }, { status: 400 });
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price: new Prisma.Decimal(priceRaw),
        images,
        sellerId: seller.id,
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
