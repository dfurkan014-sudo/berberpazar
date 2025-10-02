// src/app/api/auth/change-password/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getCurrentUser } from '../../../lib/authServer';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function s(v: unknown) {
  return String(v ?? '').trim();
}

export async function POST(req: Request) {
  try {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const currentPassword = s(body.currentPassword);
    const newPassword = s(body.newPassword);

    if (!newPassword) {
      return NextResponse.json({ error: 'Yeni şifre zorunlu.' }, { status: 400 });
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      return NextResponse.json({ error: 'Yeni şifre 8–72 karakter olmalı.' }, { status: 400 });
    }

    // Kullanıcıyı çek
    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    // Mevcut şifresi varsa doğrula
    if (user.passwordHash) {
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Mevcut şifre yanlış.' }, { status: 401 });
      }
    } else {
      // passwordHash yoksa (ör. harici kayıt senaryosu), mevcut şifre zorunlu tutmuyoruz
      if (!currentPassword) {
        // bilgi amaçlı: ilk kez şifre belirleniyor
      }
    }

    // Aynı şifreyi engelle (isteğe bağlı)
    if (user.passwordHash) {
      const same = await bcrypt.compare(newPassword, user.passwordHash);
      if (same) {
        return NextResponse.json({ error: 'Yeni şifre eski şifreyle aynı olamaz.' }, { status: 400 });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('POST /api/auth/change-password', e);
    return NextResponse.json({ error: e?.message ?? 'Beklenmeyen hata' }, { status: 500 });
  }
}
