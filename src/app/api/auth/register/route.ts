// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt, AUTH_COOKIE } from '../../../lib/auth';

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

function s(v: unknown) {
  return String(v ?? '').trim();
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

/** TR telefonu tek formata indir: 05xxxxxxxxx */
function normalizePhone(raw: unknown): string | null {
  const digits = s(raw).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 && digits.startsWith('5')) return '0' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits;
  if (digits.length === 12 && digits.startsWith('90')) return '0' + digits.slice(2);
  return null; // desteklenmeyen biçim
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const email = s(body.email).toLowerCase();
    const password = s(body.password);
    const name = s(body.name) || null;
    const phone = normalizePhone(body.phone);
    const cityRaw = s(body.city);
    const city = cityRaw ? canonicalCity(cityRaw) : null; // kanoniğe oturttuk

    if (!email || !password) {
      return NextResponse.json({ error: 'email ve password zorunlu' }, { status: 400 });
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'Şifre 8–72 karakter olmalı' }, { status: 400 });
    }
    if (cityRaw && !city) {
      return NextResponse.json({ error: 'Geçerli bir il seçin (yalnızca 81 il)' }, { status: 400 });
    }
    if (body.secondaryEmail) {
      return NextResponse.json({ error: 'İkinci e-posta kayıt sırasında verilmez' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        city, // kanonik isim
      },
      select: { id: true, email: true, name: true },
    });

    // Otomatik giriş (çerez)
    const token = await signJwt({
      sub: String(user.id),
      email: user.email,
      name: user.name ?? null,
    });

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err: any) {
    // benzersiz alanlar
    if (err?.code === 'P2002') {
      const t = (err?.meta?.target ?? []) as string[];
      if (t.includes('email')) return NextResponse.json({ error: 'Bu e-posta kayıtlı' }, { status: 409 });
      if (t.includes('phone')) return NextResponse.json({ error: 'Bu telefon kayıtlı' }, { status: 409 });
    }
    console.error('POST /api/auth/register', err);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
