// src/app/api/listings/route.ts
import { NextResponse } from 'next/server';
import type { DeviceType } from '@prisma/client';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** UI etiketlerini Prisma enum değerine çevirme tablosu */
const LABEL_TO_ENUM: Record<string, DeviceType> = {
  'SAC_KESME_MAKINESI': 'SAC_KESME_MAKINESI',
  'SAÇ KESME MAKİNESİ': 'SAC_KESME_MAKINESI',

  'TRAS_MAKINESI': 'TRAS_MAKINESI',
  'TIRAŞ MAKİNESİ': 'TRAS_MAKINESI',
  'TİRAŞ MAKİNESİ': 'TRAS_MAKINESI', // bazı klavyeler birleşik noktalı I üretir

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

/** Enum → sitede gösterdiğimiz label (listings sayfası "models=" için bunu bekliyor) */
const ENUM_TO_LABEL: Record<DeviceType, string> = {
  SAC_KESME_MAKINESI: 'Saç kesme makinesi',
  TRAS_MAKINESI:      'Tıraş makinesi',
  SAKAL_DUZELTICI:    'Sakal düzeltici',
  FON_MAKINESI:       'Fön makinesi',
  MAKAS:              'Makas',
  JILET:              'Jilet',
  DIGER:              'Diğer',
};

/** Girilen etiketi enum değerine dönüştürür; yoksa null döner */
function toEnumDeviceType(input: unknown): DeviceType | null {
  if (!input) return null;

  // Fazla boşlukları tek boşluk yap + kırp
  const raw = String(input).trim().replace(/\s+/g, ' ');

  // Zaten enum veya doğrudan eşleşen label geldiyse
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

/** Basit href kurucular (UI bu linkleri direkt kullanabilir) */
function buildBrandHref(brand: string | null) {
  return brand ? `/listings?brands=${encodeURIComponent(brand)}` : null;
}
function buildModelHref(dt: DeviceType | null) {
  if (!dt) return null;
  const label = ENUM_TO_LABEL[dt];
  return `/listings?models=${encodeURIComponent(label)}`;
}
function buildCityHref(city: string | null) {
  return city ? `/listings?city=${encodeURIComponent(city)}` : null;
}

/** İlan oluştur — GİRİŞ ZORUNLU */
export async function POST(req: Request) {
  try {
    // 0) Auth zorunlu — anonim kullanıcıya izin YOK
    const me = await getCurrentUser().catch(() => null);
    if (!me?.id) {
      return NextResponse.json(
        { error: 'Bu işlemi yapmak için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    // 1) Gövde
    const body = await req.json().catch(() => ({} as any));

    const title = String(body?.title ?? '').trim();
    const description =
      body?.description === null || body?.description === undefined
        ? null
        : String(body.description).trim() || null;

    const priceInput = String(body?.price ?? '').replace(',', '.').trim();
    const images = parseImages(body?.images);

    const brand = (body?.brand ? String(body.brand).trim() : '') || null;
    const city = (body?.city ? String(body.city).trim() : '') || null;
    const deviceType = toEnumDeviceType(body?.deviceType);

    // 2) Doğrulamalar
    if (title.length < 3) {
      return NextResponse.json({ error: 'Başlık en az 3 karakter olmalı' }, { status: 400 });
    }

    const priceNumber = Number.parseFloat(priceInput);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      return NextResponse.json({ error: 'Geçerli bir fiyat girin' }, { status: 400 });
    }
    const price = priceNumber.toFixed(2); // Prisma Decimal için güvenli

    // 3) Kayıt
    const created = await prisma.listing.create({
      data: {
        title,
        description,
        price,
        images,
        brand,
        city,
        deviceType: deviceType ?? null, // @prisma enum alanı
        sellerId: me.id,
      },
      select: { id: true, brand: true, city: true, deviceType: true },
    });

    // 4) SEO iç linkleri
    const brandHref = buildBrandHref(created.brand);
    const modelHref = buildModelHref(created.deviceType as DeviceType | null);
    const cityHref  = buildCityHref(created.city);

    return NextResponse.json(
      {
        id: created.id,
        links: {
          brandHref,
          modelHref,
          cityHref,
        },
        // UI isterse kanonik label’ı da kullanabilir
        canonical: {
          deviceType: created.deviceType,
          deviceTypeLabel: created.deviceType ? ENUM_TO_LABEL[created.deviceType as DeviceType] : null,
          brand: created.brand ?? null,
          city: created.city ?? null,
        },
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
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
    select: {
      id: true, title: true, brand: true, city: true, deviceType: true, createdAt: true
    },
  });

  // SEO linkleri ekleyerek dönelim (component bunu doğrudan kullanabilir)
  const items = last.map((x) => ({
    ...x,
    links: {
      brandHref: buildBrandHref(x.brand),
      modelHref: buildModelHref(x.deviceType as DeviceType | null),
      cityHref:  buildCityHref(x.city),
    },
    deviceTypeLabel: x.deviceType ? ENUM_TO_LABEL[x.deviceType as DeviceType] : null,
  }));

  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}
