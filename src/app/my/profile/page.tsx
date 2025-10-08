// src/app/my/profile/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Profile = {
  id: number;
  email: string;
  secondaryEmail: string | null;
  phone: string | null;
  name: string | null;
  city: string | null;
  avatarUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

/* —— Arka plan görseli (public/...) —— */
const BG_URL = '/my_profile_bg.png';

function PageBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BG_URL}
        alt=""
        className="w-full h-full object-cover object-center
                   opacity-80 brightness-115 contrast-110"
      />
      {/* Okunurluk için yumuşak overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/35" />
      {/* Hafif vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_75%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}

// 81 il – kanonik isimlerle
const TR_CITIES = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın",
  "Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa",
  "Çanakkale","Çankırı","Çorum",
  "Denizli","Diyarbakır",
  "Edirne","Elazığ","Erzincan","Erzurum","Eskişehir",
  "Gaziantep","Giresun","Gümüşhane",
  "Hakkâri","Hatay",
  "Isparta","Mersin",
  "İstanbul","İzmir",
  "Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya",
  "Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde",
  "Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli",
  "Şanlıurfa","Uşak","Van","Yozgat","Zonguldak",
  "Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"
];

// Türkçe duyarlı normalize: küçük harfe indir, aksanları at
function normTr(s: string) {
  return (s || '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

// Boring Avatars presetleri (hazır avatar)
function presetAvatars(seed: string) {
  const s = encodeURIComponent(seed || 'berberpazar');
  return [
    `https://source.boringavatars.com/beam/120/${s}?square=true`,
    `https://source.boringavatars.com/marble/120/${s}?square=true`,
    `https://source.boringavatars.com/pixel/120/${s}?square=true`,
    `https://source.boringavatars.com/ring/120/${s}?square=true`,
    `https://source.boringavatars.com/sunset/120/${s}?square=true`,
    `https://source.boringavatars.com/baau/120/${s}?square=true`,
  ];
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState<Profile | null>(null);

  // Şifre değiştir alanı
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwNew2, setPwNew2] = useState('');
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);

  // Öneri aç/kapat
  const [cityOpen, setCityOpen] = useState(false);

  // Avatar upload durumu
  const [avatarUploading, setAvatarUploading] = useState(false);

  const presets = useMemo(
    () => presetAvatars(form?.name || form?.email || 'berberpazar'),
    [form?.name, form?.email]
  );

  // Profili getir
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/profile', { cache: 'no-store' });
        if (r.status === 401) {
          setError('Önce giriş yapmalısınız.');
          setLoading(false);
          return;
        }
        if (!r.ok) throw new Error('Profili getirirken hata');
        const data: Profile = await r.json();
        if (!alive) return;
        setForm(data);
      } catch (e: any) {
        setError(e?.message || 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function onChange<K extends keyof Profile>(key: K, val: Profile[K]) {
    if (!form) return;
    setForm({ ...form, [key]: (val as any) ?? null });
  }

  // Şehir önerileri (yerelde filtrele)
  const citySuggestions = useMemo(() => {
    const q = (form?.city ?? '').trim();
    if (!q) return TR_CITIES.slice(0, 8);
    const nq = normTr(q);
    return TR_CITIES.filter((c) => normTr(c).includes(nq)).slice(0, 8);
  }, [form?.city]);

  // Kanonik eşleşme (yalnızca 81 ilden biri kabul)
  const canonicalCity = useMemo(() => {
    const q = (form?.city ?? '').trim();
    if (!q) return '';
    const hit = TR_CITIES.find((c) => normTr(c) === normTr(q));
    return hit || '';
  }, [form?.city]);
  const isCityValid = !form?.city || !!canonicalCity;

  function pickCity(c: string) {
    onChange('city', c);
    setCityOpen(false);
  }

  /* ---------------- Avatar Upload (düzeltilmiş) ---------------- */
  async function onUploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError(null);
    setOk(null);

    // Tip / boyut doğrulama
    if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.type)) {
      setError('Sadece JPEG/PNG/WebP/GIF yükleyin.');
      input.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Maksimum 8MB dosya yüklenebilir.');
      input.value = '';
      return;
    }

    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Alt metin/bağlam ekleyelim (isteğe bağlı)
      const who = form?.name || form?.email || 'kullanıcı';
      fd.append('alt', `${who} avatar`);
      const res = await fetch('/api/upload?scope=avatar', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error || res.statusText);

      // API { url } döndürüyor; fallback olarak secure_url alanını da deneriz
      const url: string | undefined = json?.url || json?.secure_url || json?.original_secure_url;
      if (!url) throw new Error('Upload yanıtında URL bulunamadı.');

      onChange('avatarUrl', url);
      setOk('Avatar yüklendi. Profilinizi güncellemek için “Kaydet”e basın.');
    } catch (err: any) {
      setError(err?.message || 'Yükleme hatası.');
    } finally {
      input.value = '';
      setAvatarUploading(false);
    }
  }
  /* -------------------------------------------------------------- */

  async function onSubmitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null); setOk(null);

    // Şehir girildiyse 81 ilden biri olmalı
    if (form.city && !isCityValid) {
      setSaving(false);
      return setError('Lütfen listeden geçerli bir il seçin (yalnızca 81 il).');
    }

    try {
      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name ?? '',
          city: form.city ? (canonicalCity || '') : '',
          phone: form.phone ?? '',
          secondaryEmail: form.secondaryEmail ?? '',
          avatarUrl: form.avatarUrl ?? '',
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || 'Kaydedilemedi');
      setForm(json as Profile);
      setOk('Profil güncellendi.');
    } catch (e: any) {
      setError(e?.message || 'Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null); setPwOk(null);

    if (!pwNew || pwNew.length < 8 || pwNew.length > 72) {
      return setPwError('Yeni şifre 8–72 karakter olmalı.');
    }
    if (pwNew !== pwNew2) {
      return setPwError('Yeni şifreler eşleşmiyor.');
    }

    setPwSaving(true);
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNew,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error || 'Şifre değiştirilemedi.');
      setPwOk('Şifre güncellendi.');
      setPwCurrent(''); setPwNew(''); setPwNew2('');
    } catch (err: any) {
      setPwError(err?.message || 'Beklenmeyen hata.');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageBg />
        <div className="mx-auto max-w-4xl p-6">
          <h1 className="text-2xl font-semibold mb-4">Profilim</h1>
          <div className="animate-pulse text-sm text-zinc-400">Yükleniyor…</div>
        </div>
      </>
    );
  }

  if (error && !form) {
    return (
      <>
        <PageBg />
        <div className="mx-auto max-w-2xl p-6">
          <p className="text-red-400 mb-4">{error}</p>
          <Link className="underline" href="/login">Giriş yap</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBg />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold mb-6">Profilim</h1>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">{error}</div>}
        {ok && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">{ok}</div>}

        {/* PROFİL BİLGİLERİ */}
        <form onSubmit={onSubmitProfile} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sol kolon: avatar */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form?.avatarUrl || presets[0]}
                alt="avatar"
                className="h-24 w-24 rounded-2xl object-cover ring-1 ring-zinc-700"
                onError={(ev) => { (ev.currentTarget as HTMLImageElement).src = presets[0]; }}
              />
              <div className="text-sm text-zinc-400">
                <div className="font-medium text-zinc-200">{form?.name || form?.email}</div>
                <div>{form?.email}</div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm mb-2">Avatar yükle</label>
              <input
                type="file"
                accept="image/*"
                onChange={onUploadAvatar}
                disabled={avatarUploading}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-zinc-600 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-100 disabled:opacity-60"
              />
              {avatarUploading && (
                <div className="mt-1 text-xs text-zinc-400">Yükleniyor…</div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm mb-1">Avatar URL (isteğe bağlı)</label>
              <input
                type="url"
                value={form?.avatarUrl ?? ''}
                onChange={(e) => onChange('avatarUrl', e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Sağ kolon: form alanları */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm mb-1">Ad Soyad</label>
              <input
                type="text"
                value={form?.name ?? ''}
                onChange={(e) => onChange('name', e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                maxLength={80}
                placeholder="Örn: Furkan Deniz"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Şehir (önerili + 81 il ile sınırlı) */}
              <div className="relative">
                <label className="block text-sm mb-1">Şehir</label>
                <input
                  type="text"
                  value={form?.city ?? ''}
                  onFocus={() => setCityOpen(true)}
                  onChange={(e) => { onChange('city', e.target.value); setCityOpen(true); }}
                  onBlur={() => {
                    setTimeout(() => setCityOpen(false), 150);
                    if (form?.city && canonicalCity) onChange('city', canonicalCity);
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                  placeholder="İl yazmaya başla…"
                  autoComplete="off"
                  aria-invalid={form?.city ? !isCityValid : undefined}
                />

                {cityOpen && citySuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg max-h-60 overflow-auto">
                    {citySuggestions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickCity(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-1 text-xs">
                  {!form?.city ? (
                    <span className="text-zinc-500">Örnek: İstanbul, Ankara, İzmir…</span>
                  ) : isCityValid ? (
                    <span className="text-emerald-400">Seçili il: {canonicalCity}</span>
                  ) : (
                    <span className="text-red-400">Geçerli bir il seçin (yalnızca 81 il).</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Telefon</label>
                <input
                  type="tel"
                  value={form?.phone ?? ''}
                  onChange={(e) => onChange('phone', e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                  placeholder="05xxxxxxxxx"
                />
                <p className="mt-1 text-xs text-zinc-500">Biçim serbest; kayıtta 05xxxxxxxxx formatına çevrilir.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Ana e-posta (değiştirilemez)</label>
              <input
                value={form?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-400"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">İkinci e-posta (opsiyonel)</label>
              <input
                type="email"
                value={form?.secondaryEmail ?? ''}
                onChange={(e) => onChange('secondaryEmail', e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                placeholder="ornek@eposta.com"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || (!!form?.city && !isCityValid)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <Link href="/my" className="text-sm underline">İlanlarıma dön</Link>
            </div>
          </div>
        </form>

        {/* ŞİFRE DEĞİŞTİR */}
        <div className="mt-10 border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-semibold mb-3">Güvenlik</h2>

          {pwError && <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">{pwError}</div>}
          {pwOk && <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">{pwOk}</div>}

          <form onSubmit={onSubmitPassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Mevcut şifre</label>
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                autoComplete="current-password"
                placeholder="Mevcut şifreniz"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Yeni şifre</label>
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                autoComplete="new-password"
                placeholder="En az 8 karakter"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Yeni şifre (tekrar)</label>
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwNew2}
                onChange={(e) => setPwNew2(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                autoComplete="new-password"
                placeholder="Yeni şifreyi tekrar girin"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPwShow((x) => !x)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm"
              >
                {pwShow ? 'Şifreyi gizle' : 'Şifreyi göster'}
              </button>

              <button
                type="submit"
                disabled={pwSaving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {pwSaving ? 'Güncelleniyor…' : 'Şifreyi değiştir'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
