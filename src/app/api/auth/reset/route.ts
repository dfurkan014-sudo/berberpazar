import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function s(v: unknown) { return String(v ?? '').trim(); }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const token = s(body.token);
    const newPassword = s(body.newPassword);

    if (!token) return NextResponse.json({ error: 'Token gerekli' }, { status: 400 });
    if (!newPassword || newPassword.length < 8 || newPassword.length > 72) {
      return NextResponse.json({ error: 'Yeni şifre 8–72 karakter olmalı' }, { status: 400 });
    }

    // 1) Token içinden userId al (verify ETMEDEN)
    const decoded = jwt.decode(token) as any;
    const userId = Number(decoded?.sub);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Token geçersiz' }, { status: 400 });
    }

    // 2) Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: 'Token geçersiz' }, { status: 400 });

    // 3) **/forgot** ile BİREBİR AYNI secret
    const base = process.env.JWT_SECRET || 'dev';
    const secret = `${base}::reset::${user.id}`; // forgot/route.ts ile aynı olmalı!

    try {
      jwt.verify(token, secret); // süre & imza kontrolü
    } catch {
      return NextResponse.json({ error: 'Token süresi dolmuş ya da geçersiz' }, { status: 400 });
    }

    // 4) Şifreyi güncelle
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('POST /api/auth/reset error:', e);
    return NextResponse.json({ error: e?.message || 'Beklenmeyen hata' }, { status: 500 });
  }
}
