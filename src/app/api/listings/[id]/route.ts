// src/app/api/listings/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import type { DeviceType } from '@prisma/client';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';

/* -------------------- yardımcılar -------------------- */

async function parseId(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const num = Number(id);
  return Number.isFinite(num) ? num : null;
}

/** TR-normalizasyon: büyük harf + aksan sadeleştirme + boşluk/altçizgi */
function normTr(s: string) {
  return s
    .toLocaleUpperCase('tr')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replaceAll('.', ' ')
    .replaceAll('Ş', 'S')
    .replaceAll('Ç', 'C')
    .replaceAll('Ğ', 'G')
    .replaceAll('Ü', 'U')
    .replaceAll('Ö', 'O')
    .replaceAll('İ', 'I')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Etiket → Prisma enum eşlemesi (normTr uygulanmış anahtarlar) */
const DEVICE_MAP: Record<string, DeviceType> = {
  'SAC KESME MAKINESI': 'SAC_KESME_MAKINESI',
  'TRAS MAKINESI': 'TRAS_MAKINESI',
  'TIRAS MAKINESI': 'TRAS_MAKINESI',
  'SAKAL DUZELTICI': 'SAKAL_DUZELTICI',
  'FON MAKINESI': 'FON_MAKINESI',
  'MAKAS': 'MAKAS',
  'JILET': 'JILET',
  'DIGER': 'DIGER',
  'YEDEK BICAK': 'DIGER',
};

function toEnumDeviceType(input: unknown): DeviceType | null | undefined {
  if (input === undefined) return undefined; // hiç gönderilmemiş
  if (input === null) return null;           // bilerek temizlemek için
  const label = normTr(String(input));
  return DEVICE_MAP[label] ?? null;
}

function parseImages(arr: unknown): string[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

/* -------------------- handlers -------------------- */

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

  return NextResponse.json(listing);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { sellerId: true },
  });
  if (!listing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  if (listing.sellerId !== me.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  // Esnek/parçalı update: sadece gönderilen alanları set et
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title);
  if (body.description !== undefined) {
    data.description =
      body.description === null ? null : String(body.description || '').trim() || null;
  }

  if (body.price !== undefined) {
    const priceNum = Number.parseFloat(String(body.price).replace(',', '.'));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: 'Geçerli bir fiyat girin' }, { status: 400 });
    }
    data.price = priceNum.toFixed(2); // Decimal için güvenli string
  }

  const imgs = parseImages(body.images);
  if (imgs !== undefined) data.images = imgs;

  if (body.brand !== undefined) {
    const b = String(body.brand || '').trim();
    data.brand = b || null;
  }
  if (body.city !== undefined) {
    const c = String(body.city || '').trim();
    data.city = c || null;
  }
  const devType = toEnumDeviceType(body.deviceType);
  if (devType !== undefined) data.deviceType = devType; // null gelebilir → temizler

  const updated = await prisma.listing.update({
    where: { id },
    data,
    include: { seller: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { sellerId: true },
  });
  if (!listing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
  if (listing.sellerId !== me.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.listing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
