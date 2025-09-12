import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';


export async function GET() {
  try {
    // Sadece bağlantıyı test et, sonucu dönme
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ db: 'ok' });
  } catch (e: any) {
    return NextResponse.json(
      { db: 'fail', error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
