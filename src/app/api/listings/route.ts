// src/app/api/listings/route.ts
import { NextResponse } from 'next/server';
import type { DeviceType } from '@prisma/client';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';

/** UI etiketlerini Prisma enum değerine çevirme tablosu */
const LABEL_TO_ENUM: Record<string, DeviceType> = {
  'SAC_KESME_MAKINESI': 'SAC_KESME_MAKINESI',
  'SAÇ KESME MAKİNESİ': 'SAC_KESME_MAKINESI',

  'TRAS_MAKINESI': 'TRAS_MAKINESI',
  'TİRAŞ MAKİNESİ': 'TRAS_MAKINESI',
  'TIRAŞ MAKİNESİ': 'TRAS_MAKINESI',

  'SAKAL_DUZELTICI': 'SAKAL_DUZELTICI',
  'SAKAL DÜZELTİCİ': 'SAKAL_DUZELTICI',

  'FON_MAKINESI': 'FON_MAKINESI',
  'FÖN MAKİNESİ': 'FON_MAKINESI',

  'MAKAS': 'MAKAS',

  'JILET': 'JILET',
  'JİLET': 'JILET',

  'DIGER': 'DIGER',
  'DİĞER': 'DIGER',
};

/** Girilen etiketi enum değerine dönüştürür; yoksa null döner */
function toEnumDeviceType(input: unknown): DeviceType | null {
  if (!input) return null;

  // Fazla boşlukları tek boşluk yap + kırp
  const raw = String(input).trim().replace(/\s+/g, ' ');

  // Zaten enum string geldiyse
  if (raw in LABEL_TO_ENUM) {
    return LABEL_TO_ENUM[raw as keyof typeof LABEL_TO_ENUM];
  }

  // TR büyük harf normalizasyonu ve Türkçe karakter dönüştürmeleri
  const upper = raw
    .toLocaleUpperCase('tr-TR')
    .replaceAll('Ş', 'S')
    .replaceAll('Ç', 'C')
    .replaceAll('Ğ', 'G')
    .replaceAll('Ü', 'U')
    .replaceAll('Ö', 'O')
    .replaceAll('İ', 'I')
    .replaceAll('Â', 'A')
    .replaceAll('Ê', 'E')
    .replaceAll('Ô', 'O');

  if (upper in LABEL_TO_ENUM) {
    return LABEL_TO_ENUM[upper as keyof typeof LABEL_TO_ENUM];
  }
  return null;
}

/** Body’den gelen görselleri temizler (string + dolu + uniq) */
function parseImages(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const cleaned = arr
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

/** İlan oluştur */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = String(body?.title ?? '').trim();
    const description =
      body?.description === null || body?.description === undefined
        ? null
        : String(body.description).trim() || null;

    const priceInput = String(body?.price ?? '').replace(',', '.').trim();
    const images = parseImages(body?.images);

    const sellerEmail = String(body?.sellerEmail ?? '').trim() || null;

    const brand = (body?.brand ? String(body.brand).trim() : '') || null;
    const city = (body?.city ? String(body.city).trim() : '') || null;
    const deviceType = toEnumDeviceType(body?.deviceType);

    // Doğrulamalar
    if (title.length < 3) {
      return NextResponse.json({ error: 'Başlık en az 3 karakter olmalı' }, { status: 400 });
    }

    const priceNumber = Number.parseFloat(priceInput);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return NextResponse.json({ error: 'Geçerli bir fiyat girin' }, { status: 400 });
    }
    const price = priceNumber.toFixed(2); // Prisma Decimal için güvenli

    // Satıcıyı belirle (önce login kullanıcı, yoksa e-posta)
    let sellerId: number | null = null;

    const me = await getCurrentUser().catch(() => null);
    if (me?.id) {
      sellerId = me.id;
    } else if (sellerEmail) {
      const user = await prisma.user.findUnique({ where: { email: sellerEmail } });
      if (!user) {
        return NextResponse.json(
          { error: 'Belirtilen e-posta ile kullanıcı bulunamadı' },
          { status: 400 },
        );
      }
      sellerId = user.id;
    } else {
      return NextResponse.json(
        { error: 'Satıcı belirlenemedi (giriş yapın veya sellerEmail gönderin)' },
        { status: 401 },
      );
    }

    const created = await prisma.listing.create({
      data: {
        title,
        description,
        price,
        images,
        brand,
        city,
        deviceType: deviceType ?? null,
        sellerId: sellerId!,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/listings error:', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

/** (Opsiyonel) Son eklenenlerden küçük bir feed */
export async function GET() {
  const last = await prisma.listing.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, title: true, brand: true, city: true, deviceType: true, createdAt: true },
  });
  return NextResponse.json({ items: last });
}
