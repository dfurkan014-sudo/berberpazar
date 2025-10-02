// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { signJwt, AUTH_COOKIE } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// Yardımcılar
function s(v: unknown) {
  return String(v ?? '').trim();
}
/** TR telefonu tek formata indir: 05xxxxxxxxx (11 hane) */
function normalizePhone(raw: unknown): string {
  const digits = s(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 && digits.startsWith('5')) return '0' + digits;      // 5xx... → 05xx...
  if (digits.length === 11 && digits.startsWith('0')) return digits;            // 05xx...
  if (digits.length === 12 && digits.startsWith('90')) return '0' + digits.slice(2); // 90... → 0...
  return ''; // desteklenmeyen biçim
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // UI şu an { email, password } gönderiyor olabilir; "identifier"ı da destekle
    const identifier = s(body.identifier || body.email).toLowerCase();
    const password = s(body.password);

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Kimlik (e-posta/telefon) ve şifre zorunlu.' }, { status: 400 });
    }

    const isEmail = identifier.includes('@');
    const emailKey = identifier;
    const phoneKey = normalizePhone(identifier);

    // Kullanıcıyı e-posta / ikinci e-posta / telefon ile ara
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(isEmail ? [{ email: emailKey }, { secondaryEmail: emailKey }] as const : []),
          ...(phoneKey ? [{ phone: phoneKey }] as const : []),
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    // Güvenli genel hata
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı/şifre.' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı/şifre.' }, { status: 401 });
    }

    const token = await signJwt({
      sub: String(user.id),
      email: user.email,
      name: user.name ?? null,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 gün
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'login error' }, { status: 500 });
  }
}
