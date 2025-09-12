'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Listing = {
  id: number;
  title: string;
  description: string | null;
  price: string;      // API string döndürüyor
  images: string[];
};

export default function EditListingPage() {
  const router = useRouter();
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(Array.isArray(idParam) ? idParam[0] : idParam);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [imagesText, setImagesText] = useState('');   // virgüllü alan
  const [uploaded, setUploaded] = useState<string[]>([]); // önizleme

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`GET ${res.status}`);
        const data: Listing = await res.json();
        if (!active) return;

        setTitle(data.title ?? '');
        setPrice(String(data.price ?? ''));
        setDescription(data.description ?? '');

        const imgs = Array.isArray(data.images)
          ? data.images.filter((x: any): x is string => typeof x === 'string')
          : [];
        setImagesText(imgs.join(', '));
        setUploaded(imgs);
      } catch (e: any) {
        setStatus(`Hata: ${e?.message ?? String(e)}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatus(null);

    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? r.statusText);
        newUrls.push(data.url);
      }

      setUploaded(prev => [...prev, ...newUrls]);
      setImagesText(prev => {
        const prevArr = prev.split(',').map(s => s.trim()).filter(Boolean);
        return [...prevArr, ...newUrls].join(', ');
      });
      setStatus(`✔️ ${newUrls.length} görsel yüklendi`);
    } catch (e: any) {
      setStatus(`Yükleme hatası: ${e?.message ?? String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setUploaded(prev => prev.filter(u => u !== url));
    setImagesText(prev =>
      prev.split(',').map(s => s.trim()).filter(u => u && u !== url).join(', ')
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const images = imagesText.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          price,
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? res.statusText);

      setStatus('✔️ Güncellendi');
      setTimeout(() => router.push(`/listings/${id}`), 800);
    } catch (e: any) {
      setStatus(`Hata: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  if (!Number.isFinite(id)) {
    return <div className="max-w-xl mx-auto p-6"><p className="text-red-600">Geçersiz ilan id.</p></div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">İlanı Düzenle</h1>
        <Link href={`/listings/${id}`} className="text-sm underline">Detaya dön</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Başlık</label>
          <input
            className="w-full border rounded p-2"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Fiyat (₺)</label>
          <input
            className="w-full border rounded p-2"
            type="number"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Açıklama</label>
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ürün durumu, aksesuarlar vb."
          />
        </div>

        {/* Cloudinary Upload */}
        <div className="space-y-2">
          <label className="block text-sm mb-1">Görseller yükle</label>
          <input type="file" accept="image/*" multiple onChange={e => handleUpload(e.target.files)} />
          {uploading && <p className="text-sm">Yükleniyor…</p>}

          {uploaded.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {uploaded.map(url => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-24 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Görsel URL’leri (virgülle ayır)</label>
          <input
            className="w-full border rounded p-2"
            value={imagesText}
            onChange={e => setImagesText(e.target.value)}
            placeholder="https://..., https://..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Kaydediliyor…' : 'Güncelle'}
        </button>
      </form>

      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
