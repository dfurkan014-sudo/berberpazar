// src/app/listings/new/page.tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/* —— Arka plan görseli —— */
const BG_URL = '/listings_new_bg.png';

function PageBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG_URL}
        alt=""
        className="w-full h-full object-cover object-center opacity-80 brightness-115 contrast-110"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_75%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}

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

/* ——— Araçlar ——— */
function normTr(s: string) {
  return (s || '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}
function slugTr(s: string) {
  return (s || '')
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ş]/g, 's').replace(/[ç]/g, 'c').replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u').replace(/[ö]/g, 'o').replace(/[ı]/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
function deviceLabelFromValue(v?: string | null) {
  switch (v) {
    case 'SAC_KESME_MAKINESI': return 'Saç kesme makinesi';
    case 'TRAS_MAKINESI':      return 'Tıraş makinesi';
    case 'SAKAL_DUZELTICI':    return 'Sakal düzeltici';
    case 'FON_MAKINESI':       return 'Fön makinesi';
    case 'MAKAS':              return 'Makas';
    case 'JILET':              return 'Jilet';
    case 'DIGER':              return 'Diğer';
    default:                   return '';
  }
}

/* —— URL yardımcıları (VİRGÜLSÜZ!) —— */
const URL_REGEX = /https?:\/\/[^\s'"]+/g;
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
function extractUrls(s: string): string[] {
  return uniq((s.match(URL_REGEX) || []).map(u => u.trim()));
}
function joinUrls(urls: string[]): string {
  // metin alanında her url ayrı satır: virgül YOK
  return urls.join('\n');
}

/* Öneri inputu (marka/şehir) */
function SuggestInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  limit?: number;
  canonical?: boolean;
}) {
  const {
    label, value, onChange, options, placeholder,
    required, limit = 8, canonical = false
  } = props;

  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim();
    if (!q) return options.slice(0, limit);
    const nq = normTr(q);
    const hits = options.filter(o => normTr(o).includes(nq));
    hits.sort((a, b) => normTr(a).indexOf(nq) - normTr(b).indexOf(nq));
    return hits.slice(0, limit);
  }, [value, options, limit]);

  function handleBlur() {
    setTimeout(() => setOpen(false), 120);
    if (!canonical) return;
    const q = value.trim();
    if (!q) return;
    const hit = options.find(o => normTr(o) === normTr(q));
    if (hit) onChange(hit);
  }

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label className="block text-sm mb-1">{label}</label>
      <input
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg max-h-60 overflow-auto">
          {suggestions.map((opt) => (
            <button
              key={opt}
              type="button"
              className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {!value && (
        <div className="mt-1 text-xs text-zinc-500">
          {placeholder || 'Yazmaya başla…'}
        </div>
      )}
    </div>
  );
}

/* Şık Dropzone (drag&drop + tıklayıp seç) */
function FileDropzone({
  onFiles,
  uploading,
}: {
  onFiles: (files: FileList) => void;
  uploading: boolean;
}) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.currentTarget.files && e.currentTarget.files.length) {
      onFiles(e.currentTarget.files);
      e.currentTarget.value = '';
    }
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setActive(true);
  }
  function onDragLeave() {
    setActive(false);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      onFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer',
          'bg-zinc-900/60 backdrop-blur',
          active
            ? 'border-emerald-500/70 bg-emerald-500/5'
            : 'border-zinc-600/70 hover:border-emerald-500/70'
        ].join(' ')}
      >
        {/* icon */}
        <svg width="42" height="42" viewBox="0 0 24 24" className="mx-auto mb-2 opacity-80">
          <path fill="currentColor" d="M19 15v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4H3l9-9l9 9h-2Zm-7-7l-5 5v5h10v-5l-5-5Zm-1 4h2v4h-2v-4Zm0 5h2v2h-2v-2Z"/>
        </svg>
        <div className="font-medium">Görselleri sürükleyip bırakın</div>
        <div className="text-sm opacity-80">veya <span className="underline">dosya seçin</span></div>
        <div className="mt-2 text-xs opacity-70">PNG / JPG / WebP / GIF · maksimum 8 MB</div>

        {/* gizli input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onChange}
        />
      </div>

      {uploading && <p className="text-sm">Yükleniyor…</p>}
    </div>
  );
}

/* ——— Türler ——— */
type CreateListingResponse = { id: number } | { error: string };

export default function NewListingPage() {
  const router = useRouter();

  // temel alanlar
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');

  // görseller
  const [imagesText, setImagesText] = useState('');   // çoklu URL: satır satır
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

  const isCityValid = !city || TR_CITIES.some(c => normTr(c) === normTr(city));

  /* —— SEO yardımcıları —— */
  function buildImageAlt() {
    const parts = [
      brand || '',
      deviceLabelFromValue(deviceType) || '',
      title || '',
      city ? `(${city})` : '',
      'berber ekipmanı',
    ].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  function buildImageCaption() {
    const parts = [
      title || '',
      brand || '',
      deviceLabelFromValue(deviceType) || '',
      city || '',
    ].filter(Boolean);
    const cap = parts.join(' · ');
    return cap || 'Berber ekipmanı';
  }
  function buildImageTags() {
    const base = [
      'berber','kuaför','berber ekipmanları','berber malzemeleri',
      'tıraş','sakal','saç','makine','aksesuar',
      'ikinci el','2. el','ikinciel','sıfır','0',
      'barber','barbershop','hair','clipper','trimmer'
    ];
    const dyn = [
      brand, deviceLabelFromValue(deviceType), city,
      ...title.split(/\s+/).slice(0,5)
    ].filter(Boolean);
    const uniqTags = uniq([...dyn, ...base].map(t => t.toString().toLowerCase()));
    return uniqTags.slice(0, 18);
  }
  function buildPublicId(originalName: string) {
    const ext = (originalName.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    const stem = slugTr([brand, deviceLabelFromValue(deviceType), title].filter(Boolean).join('-')) || 'berberpazar';
    return `${stem}-${Date.now()}.${ext}`;
  }

  /* ——— Upload ——— */
  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setStatus(null);

    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
          throw new Error('Sadece JPEG/PNG/WebP/GIF yükleyin.');
        }
        if (file.size > 8 * 1024 * 1024) {
          throw new Error('Max 8MB dosya yüklenebilir.');
        }

        const alt = buildImageAlt();
        const caption = buildImageCaption();
        const tags = buildImageTags();
        const publicId = buildPublicId(file.name);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('alt', alt);
        fd.append('caption', caption);
        fd.append('tags', JSON.stringify(tags));
        fd.append('publicId', publicId);

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? res.statusText);

        const url = typeof data === 'string'
          ? data
          : (Array.isArray(data) ? data[0] : (data?.url || data?.urls?.[0]));
        if (!url) throw new Error('Yüklenen görsel URL’i alınamadı.');
        newUrls.push(String(url));
      }

      setUploaded(prev => uniq([...prev, ...newUrls]));
      setImagesText(prev => joinUrls(uniq([...extractUrls(prev), ...newUrls])));

      setStatus(`✔️ ${newUrls.length} görsel yüklendi`);
    } catch (e: any) {
      setStatus(`Yükleme hatası: ${e?.message ?? String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setUploaded(prev => prev.filter(u => u !== url));
    setImagesText(prev => joinUrls(extractUrls(prev).filter(u => u !== url)));
  }

  /* ——— Submit ——— */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const priceNumber = Number.parseFloat(price.replace(',', '.'));
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        throw new Error('Lütfen geçerli bir fiyat girin.');
      }
      const priceString = priceNumber.toFixed(2);

      // ARTIK VİRGÜL YOK — metin alanından URL’leri regex ile çekiyoruz
      const textUrls = extractUrls(imagesText);
      const images = uniq([...uploaded, ...textUrls]);

      const canonicalCity = TR_CITIES.find(c => normTr(c) === normTr(city)) || city.trim() || null;

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: priceString,
        images,
        brand: brand.trim() || null,
        city: canonicalCity,
        deviceType: deviceType || null,
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

  const previewAlt = buildImageAlt();

  return (
    <>
      <PageBg />
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Yeni İlan</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Başlık</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
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
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                value={price}
                onChange={e => setPrice(e.target.value)}
                type="number"
                step="0.01"
                required
                placeholder="Örn: 1500"
              />
            </div>

            <SuggestInput
              label="Marka"
              value={brand}
              onChange={setBrand}
              options={BRANDS}
              placeholder="Örn: Philips"
            />

            <div className="sm:col-span-1">
              <SuggestInput
                label="Şehir"
                value={city}
                onChange={setCity}
                options={TR_CITIES}
                placeholder="İl yazmaya başla…"
                canonical
              />
              {!!city && !isCityValid && (
                <div className="mt-1 text-xs text-red-400">
                  Geçerli bir il seçin (yalnızca 81 il).
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">Tür</label>
              <select
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
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

          {/* —— Dropzone —— */}
          <div className="space-y-2">
            <label className="block text-sm mb-1">Görseller yükle</label>
            <FileDropzone onFiles={(f) => handleUpload(f)} uploading={uploading} />
          </div>

          {/* Yüklenmiş görseller (önizleme) */}
          {uploaded.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {uploaded.map(url => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={previewAlt} title={buildImageCaption()} className="w-full h-24 object-cover rounded" />
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

          <div>
            <label className="block text-sm mb-1">
              Görsel URL’leri (opsiyonel)
            </label>
            {/* URL’ler artık satır satır; virgül KULLANMAYIN */}
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 min-h-[96px]"
              value={imagesText}
              onChange={e => setImagesText(e.target.value)}
              placeholder={`Her URL'i ayrı satıra yazın veya yapıştırın.\nÖrn:\nhttps://res.cloudinary.com/.../image/upload/f_auto,q_auto/...jpg\nhttps://.../ikinci-url.webp`}
            />
            <p className="mt-1 text-xs text-zinc-500">
              İpucu: Virgül kullanmayın. URL’ler satır satır veya boşlukla ayrılabilir.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1">Satıcı e-mail (opsiyonel)</label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              value={sellerEmail}
              onChange={e => setSellerEmail(e.target.value)}
              placeholder="Giriş yaptıysanız boş bırakın"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!!city && !isCityValid)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? 'Kaydediliyor…' : 'İlanı Oluştur'}
          </button>
        </form>

        {status && <p className="text-sm mt-2">{status}</p>}
      </div>
    </>
  );
}
