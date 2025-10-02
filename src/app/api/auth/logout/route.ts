import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const accept = req.headers.get('accept') || '';

  // HTML istekler (Header'daki <form> gibi) için redirect yanıtı hazırla
  if (accept.includes('text/html')) {
    const res = NextResponse.redirect(new URL('/', req.url));
    // Çerezi sil: maxAge=0 veya geçmiş bir expires
    res.cookies.set('token', '', { maxAge: 0, path: '/' });
    return res;
  }

  // JSON istekler için JSON yanıtı hazırla
  const res = NextResponse.json({ ok: true });
  res.cookies.set('token', '', { maxAge: 0, path: '/' });
  return res;
}
