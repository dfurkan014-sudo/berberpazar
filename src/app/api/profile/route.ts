// src/app/api/profile/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';

export const dynamic = 'force-dynamic';

// ---------- Şehir yardımcıları ----------
const TR_CITIES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın",
  "Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa",
  "Çanakkale","Çankırı","Çorum",
  "Denizli","Diyarbakır",
  "Edirne","Elazığ","Erzincan","Erzurum","Eskişehir",
  "Gaziantep","Giresun","Gümüşhane",
  "Hakkâri","Hatay",
  "Isparta","Mersin",
  "İstanbul","İzmir",
  "Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya",
  "Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde",
  "Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli",
  "Şanlıurfa","Uşak","Van","Yozgat","Zonguldak",
  "Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"
];

function s(v: unknown): string {
  return String(v ?? '').trim();
}
function nOrNull(v: unknown): string | null {
  const t = s(v);
  return t ? t : null;
}
function normTr(x: string) {
  return x
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}
function canonicalCity(input: unknown): string | null {
  const q = s(input);
  if (!q) return null;
  const hit = TR_CITIES.find((c) => normTr(c) === normTr(q));
  return hit ?? null;
}
/** +90, boşluk, tire vb. temizle; tek format 0xxxxxxxxxx */
function normalizePhone(v: unknown): string | null {
  const raw = s(v);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith('5')) return '0' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits;
  if (digits.length === 12 && digits.startsWith('90')) return '0' + digits.slice(2);
  return null;
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      id: true,
      email: true,
      secondaryEmail: true,
      phone: true,
      name: true,
      city: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));

  // Şehir validasyonu ve kanonikleştirme
  let cityUpdate: string | null | undefined = undefined;
  if (body.city !== undefined) {
    const raw = s(body.city);
    if (!raw) {
      cityUpdate = null; // temizle
    } else {
      const canon = canonicalCity(raw);
      if (!canon) {
        return NextResponse.json(
          { error: 'Geçerli bir il seçin (yalnızca 81 il).' },
          { status: 400 }
        );
      }
      cityUpdate = canon; // kanonik isim
    }
  }

  const data: Prisma.UserUpdateInput = {
    ...(body.name !== undefined ? { name: nOrNull(body.name) } : {}),
    ...(cityUpdate !== undefined ? { city: cityUpdate } : {}),
    ...(body.phone !== undefined ? { phone: normalizePhone(body.phone) } : {}),
    ...(body.secondaryEmail !== undefined ? { secondaryEmail: nOrNull(body.secondaryEmail) } : {}),
    ...(body.avatarUrl !== undefined ? { avatarUrl: nOrNull(body.avatarUrl) } : {}),
  };

  // basit kontroller
  if (typeof data.name === 'string' && (data.name as string).length > 80) {
    return NextResponse.json({ error: 'Görünen ad 80 karakteri geçmemeli' }, { status: 400 });
  }
  if (typeof data.secondaryEmail === 'string' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.secondaryEmail as string)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta girin (ikinci e-posta)' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: me.id },
      data,
      select: {
        id: true,
        email: true,
        secondaryEmail: true,
        phone: true,
        name: true,
        city: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]) : [];
      if (target.includes('phone')) {
        return NextResponse.json({ error: 'Bu telefon başka bir hesapta kullanılıyor' }, { status: 409 });
      }
      if (target.includes('secondaryEmail')) {
        return NextResponse.json({ error: 'Bu ikinci e-posta başka bir hesapta kullanılıyor' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Benzersiz alan çakışması' }, { status: 409 });
    }
    console.error('PUT /api/profile error:', err);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
