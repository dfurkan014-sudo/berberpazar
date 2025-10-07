'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function isEmail(x: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.trim());
}

/** 81 il – kanonik yazımla */
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

/** Türkçe duyarlı normalize: küçük harfe indir, aksanları at. */
function normTr(s: string) {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i'); // Türkçe ı→i
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    city: '',
    phone: '',
    email: '',
    password: '',
    password2: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onChange<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /** Öneriler: yazılana göre filtrele, boşsa ilk 8 ili göster */
  const citySuggestions = useMemo(() => {
    const q = form.city.trim();
    if (!q) return TR_CITIES.slice(0, 8);
    const nq = normTr(q);
    return TR_CITIES.filter((c) => normTr(c).includes(nq)).slice(0, 8);
  }, [form.city]);

  /** Geçerli mi? – Aynı şehri kanonik yazıma eşleştirir */
  const canonicalCity = useMemo(() => {
    const q = form.city.trim();
    if (!q) return '';
    const hit = TR_CITIES.find((c) => normTr(c) === normTr(q));
    return hit || '';
  }, [form.city]);

  const isCityValid = !!canonicalCity;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Şehri zorunlu tutuyoruz ve sadece 81 ilden biri kabul.
    if (!isCityValid) {
      return setError('Lütfen listeden geçerli bir il seçin.');
    }
    if (!isEmail(form.email)) return setError('Geçerli bir e-posta girin.');
    if (form.password.length < 8 || form.password.length > 72) {
      return setError('Şifre 8–72 karakter olmalı.');
    }
    if (form.password !== form.password2) {
      return setError('Şifreler eşleşmiyor.');
    }

    setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          city: canonicalCity,            // kanonik şehri gönder
          phone: form.phone || undefined, // Sunucu 05xxxxxxxxx formatına çevirir
          email: form.email,
          password: form.password,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error || 'Kayıt başarısız.');
      router.push('/login');
    } catch (err: any) {
      setError(err?.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen py-12">
      
      <h1 className="text-2xl font-semibold mb-6">Kayıt ol</h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
        <div>
          <label className="block text-sm mb-1">Ad Soyad</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            maxLength={80}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Örn: Furkan Deniz"
            autoComplete="name"
          />
        </div>

        {/* Şehir (öneriler + sadece 81 il) */}
        <div>
          <label className="block text-sm mb-1">Şehir</label>
          <input
            type="text"
            list="city-list"
            value={form.city}
            onChange={(e) => onChange('city', e.target.value)}
            onBlur={() => {
              // Kullanıcı Eskişehir gibi yazdıysa kanoniğe oturt
              if (canonicalCity) onChange('city', canonicalCity);
            }}
            maxLength={80}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="İl yazmaya başla…"
            autoComplete="off"
            aria-invalid={form.city ? (!isCityValid) : undefined}
          />
          {/* HTML datalist – yerleşik öneri açılır listesi */}
          <datalist id="city-list">
            {citySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="mt-1 text-xs">
            {!form.city ? (
              <span className="text-zinc-500">Örnek: İstanbul, Ankara, İzmir…</span>
            ) : isCityValid ? (
              <span className="text-emerald-400">Seçili il: {canonicalCity}</span>
            ) : (
              <span className="text-red-400">Geçerli bir il seçin (yalnızca 81 il).</span>
            )}
          </div>

          {/* İstersen ek görsel öneri listesi (tıkla-seç) */}
          {citySuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {citySuggestions.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => onChange('city', c)}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-800"
                  title={c}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Telefon (opsiyonel)</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="05xxxxxxxxx"
            autoComplete="tel"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Biçim serbest; kayıtta 05xxxxxxxxx formatına çevrilir.
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1">E-posta</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="ornek@mail.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Şifre</label>
          <div className="flex gap-2">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => onChange('password', e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              placeholder="En az 8 karakter"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((x) => !x)}
              className="rounded-lg border border-zinc-700 px-3 text-sm"
              aria-label="Şifreyi göster/gizle"
            >
              {showPw ? 'Gizle' : 'Göster'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Şifre (tekrar)</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={form.password2}
            onChange={(e) => onChange('password2', e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || (!!form.city && !isCityValid)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? 'Kaydediliyor…' : 'Kayıt ol'}
          </button>
          <Link href="/login" className="text-sm underline">
            Zaten hesabın var mı? Giriş yap
          </Link>
        </div>
      </form>
    </div>
  );
}
