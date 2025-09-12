'use client';

import { useState } from 'react';

export default function NewListingPage() {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [imagesText, setImagesText] = useState(''); // virgülle ayır: url1, url2
  const [uploaded, setUploaded] = useState<string[]>([]); // önizleme için
  const [sellerEmail, setSellerEmail] = useState('furkan@example.com'); // Prisma Studio’da eklediğin e-mail

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setStatus(null);

    const newUrls: string[] = [];
    try {
      // birden fazla seçimi sırayla yükleyelim
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? res.statusText);
        newUrls.push(data.url);
      }

      // form alanına virgüllü olarak ekle
      setImagesText((prev) => {
        const prevArr = prev
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const merged = [...prevArr, ...newUrls];
        return merged.join(', ');
      });
      setUploaded((prev) => [...prev, ...newUrls]);
      setStatus(`✔️ ${newUrls.length} görsel yüklendi`);
    } catch (e: any) {
      setStatus(`Yükleme hatası: ${e?.message ?? String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const images = imagesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price,
          images,
          sellerEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(`Hata: ${data?.error ?? res.statusText}`);
      } else {
        setStatus(`✔️ Oluşturuldu (id: ${data.id})`);
        // formu temizle
        setTitle('');
        setPrice('');
        setDescription('');
        setImagesText('');
        setUploaded([]);
      }
    } catch (err: any) {
      setStatus(`Hata: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function removeImage(url: string) {
    setUploaded((prev) => prev.filter((u) => u !== url));
    setImagesText((prev) => {
      const rest = prev
        .split(',')
        .map((s) => s.trim())
        .filter((u) => u && u !== url);
      return rest.join(', ');
    });
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Yeni İlan</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Başlık</label>
          <input
            className="w-full border rounded p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Örn: Profesyonel saç kesme makinesi"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Fiyat (₺)</label>
          <input
            className="w-full border rounded p-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="0.01"
            required
            placeholder="Örn: 1500"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Açıklama</label>
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ürün durumu, aksesuarlar vb."
          />
        </div>

        {/* Cloudinary Upload */}
        <div className="space-y-2">
          <label className="block text-sm mb-1">Görseller yükle</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
          />
          {uploading && <p className="text-sm">Yükleniyor…</p>}

          {uploaded.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {uploaded.map((url) => (
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
          <label className="block text-sm mb-1">
            Görsel URL’leri (virgülle ayır) — yüklediklerin otomatik eklenir
          </label>
          <input
            className="w-full border rounded p-2"
            value={imagesText}
            onChange={(e) => setImagesText(e.target.value)}
            placeholder="https://..., https://..."
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Satıcı e-mail</label>
          <input
            className="w-full border rounded p-2"
            value={sellerEmail}
            onChange={(e) => setSellerEmail(e.target.value)}
            placeholder="furkan@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Kaydediliyor…' : 'İlanı Oluştur'}
        </button>
      </form>

      {status && <p className="text-sm mt-2">{status}</p>}
    </div>
  );
}
