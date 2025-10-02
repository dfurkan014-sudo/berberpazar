import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { verifyJwt, AUTH_COOKIE } from './auth';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyJwt(token);
  if (!payload?.sub) return null;

  return prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, email: true, name: true },
  });
}
