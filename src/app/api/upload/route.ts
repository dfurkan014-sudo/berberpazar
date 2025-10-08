// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import cloudinary from 'src/app/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ---------------- helpers ---------------- */
function normTr(s: string) {
  return (s || '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .trim();
}
function slugTag(s: string) {
  return normTr(s)
    .replace(/[^a-z0-9\s\-_.]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
}
function toArrayMaybeJson(input: string | null | undefined): string[] {
  if (!input) return [];
  const raw = String(input).trim();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* not json */ }
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/* Build absolute Cloudinary URL that always works */
function buildOptimizedUrl(opts: {
  public_id: string;
  format?: string | null;
  version?: number | string | null;
}): string {
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    // @ts-ignore
    (cloudinary as any)?.config?.().cloud_name ||
    '';

  const fmt = (opts.format || '').toString().trim() || 'jpg';
  const ver = opts.version ? `v${opts.version}` : '';
  const pub = opts.public_id; // can include folder segments (e.g. berberpazar/foo/bar)

  if (cloudName) {
    const base = `https://res.cloudinary.com/${cloudName}/image/upload`;
    // f_auto,q_auto before version/public_id
    return `${base}/f_auto,q_auto${ver ? `/${ver}` : ''}/${pub}.${fmt}`;
  }

  // Fallback: inject transformation into secure_url later if needed by caller.
  return `https://res.cloudinary.com/undefined-cloud/image/upload/f_auto,q_auto/${pub}.${fmt}`;
}

/* ---------------- handler ---------------- */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "form-data'da 'file' alanı gerekli" },
        { status: 400 }
      );
    }

    // Optional SEO/context fields
    const title      = (form.get('title') as string) || '';
    const brand      = (form.get('brand') as string) || '';
    const deviceType = (form.get('deviceType') as string) || '';
    const city       = (form.get('city') as string) || '';

    const alt       = (form.get('alt') as string) || '';
    const caption   = (form.get('caption') as string) || '';
    const publicId0 = ((form.get('publicId') as string) || '').replace(/\.[a-z0-9]+$/i, '');

    const userTags  = toArrayMaybeJson(form.get('tags') as string);

    // Derived tags (uniq + limit)
    const derivedCandidates = [
      title, brand, deviceType, city,
      'berber','kuafor','berber-malzeme','berber-ekipman',
      'kuafor-ekipman','berber-pazari','ikinci-el','2-el','2el','sifir',
    ];
    const tags = Array.from(
      new Set(
        [...userTags, ...derivedCandidates].map(slugTag).filter(Boolean)
      )
    ).slice(0, 25);

    // File guards
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Max 8MB' }, { status: 400 });
    }
    const contentType = file.type || '';
    if (!/^image\/(jpeg|png|webp|gif)$/.test(contentType)) {
      return NextResponse.json({ error: 'Sadece jpeg/png/webp/gif' }, { status: 400 });
    }

    // To buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = process.env.CLOUDINARY_FOLDER || 'uploads';

    // Prepare clean context (Cloudinary context values MUST be non-empty strings)
    const cleanContext: Record<string, string> = {};
    const ctxRaw = {
      alt: alt || `${[brand, deviceType, title].filter(Boolean).join(' ')}`.trim(),
      caption: caption || `${[brand, deviceType, city].filter(Boolean).join(' · ')}`.trim(),
      brand, deviceType, city, title,
    };
    for (const [k, v] of Object.entries(ctxRaw)) {
      const val = String(v ?? '').trim();
      if (val) cleanContext[k] = val;
    }

    // Upload via stream
    const uploaded: any = await new Promise((resolve, reject) => {
      const stream = (cloudinary as any).uploader.upload_stream(
        {
          folder,
          public_id: publicId0 || undefined,
          overwrite: true,
          resource_type: 'image',
          tags: tags.length ? tags : undefined,
          context: cleanContext,
        },
        (err: any, res: any) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    // Build robust absolute optimized URL
    let optimizedUrl = buildOptimizedUrl({
      public_id: uploaded.public_id,
      format: uploaded.format,
      version: uploaded.version,
    });

    // If cloud name missing in env (edge case), fall back by injecting transform
    if (optimizedUrl.includes('undefined-cloud') && uploaded.secure_url) {
      optimizedUrl = String(uploaded.secure_url).replace(
        '/image/upload',
        '/image/upload/f_auto,q_auto'
      );
    }

    return NextResponse.json(
      {
        url: optimizedUrl,                 // use this in UI/DB
        public_id: uploaded.public_id,
        version: uploaded.version,
        bytes: uploaded.bytes,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        tags: uploaded.tags,
        context: uploaded.context,
        original_secure_url: uploaded.secure_url, // for debugging / fallback
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
