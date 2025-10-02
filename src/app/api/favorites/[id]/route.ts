import { NextResponse } from 'next/server';
import { prisma } from 'src/app/lib/prisma';
import { getCurrentUser } from 'src/app/lib/authServer';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = Number(id);
  if (!Number.isFinite(listingId)) {
    return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
  }

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Kayıt yoksa sessiz geçiyoruz
  await prisma.favorite
    .delete({
      where: { userId_listingId: { userId: me.id, listingId } },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
