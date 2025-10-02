'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

/* ——— Yardımcı sabitler ——— */
const DEVICE_TYPES = [
  { value: 'SAC_KESME_MAKINESI', label: 'Saç kesme makinesi' },
  { value: 'TRAS_MAKINESI',      label: 'Tıraş makinesi' },
  { value: 'SAKAL_DUZELTICI',    label: 'Sakal düzeltici' },
  { value: 'FON_MAKINESI',       label: 'Fön makinesi' },
  { value: 'MAKAS',              label: 'Makas' },
  { value: 'JILET',              label: 'Jilet' },
  { value: 'DIGER',              label: 'Diğer' },
] as const;

const BRANDS = [
  'Wahl','Andis','Babyliss','Moser','Philips','Remington','Panasonic',
  'Braun','Rowenta','Xiaomi','JRL','Kemei',
];

const TR_CITIES = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin',
  'Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa',
  'Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum',
  'Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul','İzmir',
  'Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kırıkkale','Kırklareli','Kırşehir',
  'Kilis','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir',
  'Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Şanlıurfa','Şırnak',
  'Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak',
];

/* ——— Türler ——— */
type CreateListingResponse = { id: number } | { error: string };

export default function NewListingPage() {
  const router = useRouter();

  // temel alanlar
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');

  // görseller
  const [imagesText, setImagesText] = useState('');   // virgülle ayrılmış url’ler
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // yeni alanlar (filtreler için)
  const [brand, setBrand] = useState('');
  const [city, setCity] = useState('');
  const [deviceType, setDeviceType] = useState<string>('');

  // giriş yapılmadıysa opsiyonel satıcı e-mail
  const [sellerEmail, setSellerEmail] = useState('');

  // durum
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // şehir önerileri (local)
  const citySuggestions = useMemo(() => {
    const q = city.toLocaleLowerCase('tr').trim();
    if (!q) return [];
    return TR_CITIES.filter(c => c.toLocaleLowerCase('tr').startsWith(q)).slice(0, 8);
  }, [city]);

  /* ——— Upload ——— */
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setStatus(null);

    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        // basit tip/boyut kontrolü
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
          throw new Error('Sadece JPEG/PNG/WebP/GIF yükleyin.');
        }
        if (file.size > 8 * 1024 * 1024) {
          throw new Error('Max 8MB dosya yüklenebilir.');
        }

        const fd = new FormData();
        fd.append('file', file);

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? res.statusText);
        newUrls.push(String(data.url));
      }

      // input’a ve önizlemeye ekle
      setImagesText(prev => {
        const prevArr = prev.split(',').map(s => s.trim()).filter(Boolean);
        const merged = Array.from(new Set([...prevArr, ...newUrls]));
        return merged.join(', ');
      });
      setUploaded(prev => Array.from(new Set([...prev, ...newUrls])));

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
      prev
        .split(',')
        .map(s => s.trim())
        .filter(u => u && u !== url)
        .join(', ')
    );
  }

  /* ——— Submit ——— */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // fiyatı normalize et
      const priceNumber = Number.parseFloat(price.replace(',', '.'));
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        throw new Error('Lütfen geçerli bir fiyat girin.');
      }
      const priceString = priceNumber.toFixed(2);

      // görselleri temizle
      const images = Array.from(
        new Set(
          imagesText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        )
      );

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: priceString,
        images,
        // yeni alanlar
        brand: brand.trim() || null,
        city: city.trim() || null,
        deviceType: deviceType || null,
        // opsiyonel satıcı e-mail (giriş yoksa)
        sellerEmail: sellerEmail.trim() || undefined,
      };

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: CreateListingResponse = await res.json();
      if (!res.ok) throw new Error(('error' in data && data.error) || res.statusText);

      const id = (data as { id: number }).id;
      setStatus(`✔️ Oluşturuldu (id: ${id})`);
      setTimeout(() => router.push(`/listings/${id}`), 500);
    } catch (err: any) {
      setStatus(`Hata: ${err?.message ?? String(err)}`);
    } finally {
      setLoading(false);
    }
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
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="Örn: Profesyonel saç kesme makinesi"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Fiyat (₺)</label>
            <input
              className="w-full border rounded p-2"
              value={price}
              onChange={e => setPrice(e.target.value)}
              type="number"
              step="0.01"
              required
              placeholder="Örn: 1500"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Marka</label>
            <input
              list="brand-list"
              className="w-full border rounded p-2"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="Örn: Philips"
            />
            <datalist id="brand-list">
              {BRANDS.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm mb-1">Şehir</label>
            <input
              className="w-full border rounded p-2"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Şehir girin"
              list="city-list"
            />
            <datalist id="city-list">
              {(city ? citySuggestions : TR_CITIES.slice(0, 8)).map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm mb-1">Tür</label>
            <select
              className="w-full border rounded p-2 bg-transparent"
              value={deviceType}
              onChange={e => setDeviceType(e.target.value)}
            >
              <option value="">Seçiniz</option>
              {DEVICE_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
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
          <label className="block text-sm mb-1">
            Görsel URL’leri (virgülle ayır) — yükledikleriniz otomatik eklenir
          </label>
          <input
            className="w-full border rounded p-2"
            value={imagesText}
            onChange={e => setImagesText(e.target.value)}
            placeholder="https://..., https://..."
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Satıcı e-mail (opsiyonel)</label>
          <input
            className="w-full border rounded p-2"
            value={sellerEmail}
            onChange={e => setSellerEmail(e.target.value)}
            placeholder="Giriş yaptıysanız boş bırakın"
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
