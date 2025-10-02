import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt, AUTH_COOKIE } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });

  const payload = await verifyJwt(token);
  if (!payload?.sub) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, email: true, name: true }
  });

  return NextResponse.json({ user });
}
