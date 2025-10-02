'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
export const dynamic = 'force-dynamic';

type FiltersProps = {
  brandsOptions?: string[];
  modelOptions?: string[];
};

/* ---------- Yardımcılar ---------- */

function toSet(csv: string | null) {
  return new Set((csv ?? '').split(',').map(s => s.trim()).filter(Boolean));
}

function normalizeTR(s: string) {
  // Türkçe karakter ve aksanları normalize et
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

function normalizePrice(v: string) {
  const cleaned = v.replace(/\./g, '').replace(',', '.').trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

/* 81 İl – alfabetik */
const TURKISH_CITIES = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin',
  'Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur',
  'Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan',
  'Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkâri','Hatay','Iğdır','Isparta','İstanbul',
  'İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kırıkkale','Kırklareli','Kırşehir',
  'Kilis','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş',
  'Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas',
  'Şanlıurfa','Şırnak','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak'
];

/* ---------- Bileşen ---------- */

export default function Filters({
  brandsOptions,
  modelOptions,
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // Varsayılan seçenek listeleri
  const defaultBrands = useMemo(
    () => brandsOptions ?? ['Wahl', 'Andis', 'Babyliss', 'Moser', 'Philips', 'Remington', 'Panasonic'],
    [brandsOptions],
  );
  const defaultModels = useMemo(
    () => modelOptions ?? ['Saç kesme makinesi', 'Tıraş makinesi', 'Sakal düzeltici', 'Fön makinesi', 'Yedek bıçak'],
    [modelOptions],
  );

  // URL → state
  const [brandSet, setBrandSet] = useState<Set<string>>(new Set());
  const [modelSet, setModelSet] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sort, setSort] = useState<string>('');
  const [cityText, setCityText] = useState<string>(''); // tek şehir

  // Aç/kapa
  const [openBrands, setOpenBrands] = useState(true);
  const [openModels, setOpenModels] = useState(true);
  const [openCity, setOpenCity] = useState(true);
  const [openPrice, setOpenPrice] = useState(true);
  const [openSort, setOpenSort] = useState(true);

  // Şehir öneri kutusu görünürlüğü
  const [cityFocus, setCityFocus] = useState(false);

  useEffect(() => {
    setBrandSet(toSet(sp.get('brands')));
    setModelSet(toSet(sp.get('models')));
    setMinPrice(sp.get('min') ?? '');
    setMaxPrice(sp.get('max') ?? '');
    setSort(sp.get('sort') ?? '');
    setCityText(sp.get('city') ?? '');
  }, [sp]);

  function toggle(setter: (v: Set<string>) => void, current: Set<string>, value: string) {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function apply() {
    const p = new URLSearchParams(sp.toString());

    const brandsCsv = Array.from(brandSet).join(',');
    const modelsCsv = Array.from(modelSet).join(',');

    if (brandsCsv) p.set('brands', brandsCsv); else p.delete('brands');
    if (modelsCsv) p.set('models', modelsCsv); else p.delete('models');

    if (minPrice.trim()) p.set('min', normalizePrice(minPrice)); else p.delete('min');
    if (maxPrice.trim()) p.set('max', normalizePrice(maxPrice)); else p.delete('max');

    const city = cityText.trim();
    if (city) p.set('city', city); else p.delete('city');

    if (sort) p.set('sort', sort); else p.delete('sort');

    // filtre değişince sayfayı 1'e çek
    p.delete('page');

    router.push(`${pathname}?${p.toString()}`);
  }

  function clearAll() {
    const p = new URLSearchParams(sp.toString());
    ['brands','models','min','max','sort','city','page'].forEach(k => p.delete(k));
    router.push(`${pathname}?${p.toString()}`);
  }

  // Şehir öneri listesi
  const filteredCities = useMemo(() => {
    const q = normalizeTR(cityText.trim());
    if (!q) return TURKISH_CITIES.slice(0, 10);
    return TURKISH_CITIES
      .filter(c => normalizeTR(c).startsWith(q))
      .slice(0, 10);
  }, [cityText]);

  return (
    <aside className="w-full sm:w-64 shrink-0 border rounded-lg p-3 bg-black/5 dark:bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-medium">Filtreler</h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs underline opacity-80 hover:opacity-100"
        >
          Temizle
        </button>
      </div>

      {/* Marka */}
      <Section title="Marka" open={openBrands} onToggle={() => setOpenBrands(v => !v)}>
        <ul className="space-y-1">
          {defaultBrands.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <input
                id={`brand-${b}`}
                type="checkbox"
                className="accent-black"
                checked={brandSet.has(b)}
                onChange={() => toggle(setBrandSet, brandSet, b)}
              />
              <label htmlFor={`brand-${b}`} className="text-sm cursor-pointer select-none">
                {b}
              </label>
            </li>
          ))}
        </ul>
      </Section>

      {/* Model / Tür */}
      <Section title="Model / Tür" open={openModels} onToggle={() => setOpenModels(v => !v)}>
        <ul className="space-y-1">
          {defaultModels.map((m) => (
            <li key={m} className="flex items-center gap-2">
              <input
                id={`model-${m}`}
                type="checkbox"
                className="accent-black"
                checked={modelSet.has(m)}
                onChange={() => toggle(setModelSet, modelSet, m)}
              />
              <label htmlFor={`model-${m}`} className="text-sm cursor-pointer select-none">
                {m}
              </label>
            </li>
          ))}
        </ul>
      </Section>

      {/* Şehir (typeahead) */}
      <Section title="Şehir" open={openCity} onToggle={() => setOpenCity(v => !v)}>
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              className="w-full border rounded p-2 text-sm"
              placeholder="Şehir yazmaya başla…"
              value={cityText}
              onChange={(e) => setCityText(e.target.value)}
              onFocus={() => setCityFocus(true)}
              onBlur={() => setTimeout(() => setCityFocus(false), 150)} // tıklamaya fırsat ver
            />
            {cityText && (
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded"
                onClick={() => setCityText('')}
                aria-label="Şehri temizle"
              >
                Temizle
              </button>
            )}
          </div>

          {cityFocus && (
            <ul className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-auto border rounded bg-white dark:bg-neutral-900 shadow">
              {filteredCities.length === 0 ? (
                <li className="px-3 py-2 text-sm opacity-70">Sonuç yok</li>
              ) : (
                filteredCities.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={() => {
                        setCityText(c);
                        setCityFocus(false);
                      }}
                    >
                      {c}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </Section>

      {/* Fiyat */}
      <Section title="Fiyat aralığı (₺)" open={openPrice} onToggle={() => setOpenPrice(v => !v)}>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            type="number"
            step="0.01"
            placeholder="Min"
            className="w-full border rounded p-2 text-sm"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span className="opacity-60">—</span>
          <input
            inputMode="decimal"
            type="number"
            step="0.01"
            placeholder="Max"
            className="w-full border rounded p-2 text-sm"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </Section>

      {/* Sırala */}
      <Section title="Sırala" open={openSort} onToggle={() => setOpenSort(v => !v)}>
        <select
          className="w-full border rounded p-2 text-sm bg-transparent"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="">Varsayılan (yeniden eskiye)</option>
          <option value="price_asc">Fiyat: Artan</option>
          <option value="price_desc">Fiyat: Azalan</option>
          <option value="newest">En yeni</option>
          <option value="oldest">En eski</option>
        </select>
      </Section>

      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full px-3 py-2 rounded bg-black text-white text-sm"
      >
        Uygula
      </button>
    </aside>
  );
}

/* ---------- Alt bileşen ---------- */
function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t first:border-t-0 py-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs opacity-70">{open ? 'Kapat' : 'Aç'}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
