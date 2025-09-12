// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
// route.ts (api) konumundan src/lib/cloudinary'a relatif yol:
import cloudinary from '../../lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: "form-data'da 'file' alanı gerekli" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const folder = process.env.CLOUDINARY_FOLDER || 'uploads';

    const uploaded: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    return NextResponse.json({
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
