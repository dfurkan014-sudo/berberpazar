'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
export const dynamic = 'force-dynamic';

function splitCsv(s: string | null) {
  return (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ActiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // URL'deki mevcut filtreleri oku
  const q       = sp.get('q') ?? '';
  const city    = sp.get('city') ?? '';
  const brands  = splitCsv(sp.get('brands'));
  const models  = splitCsv(sp.get('models'));
  const min     = sp.get('min') ?? '';
  const max     = sp.get('max') ?? '';
  const sort    = sp.get('sort') ?? '';

  // Gösterilecek rozetleri hesapla
  const chips = useMemo(() => {
    const items: Array<{ key: string; label: string; value?: string }> = [];

    if (q)      items.push({ key: 'q', label: `Arama: ${q}` });
    if (city)   items.push({ key: 'city', label: `Şehir: ${city}` });
    brands.forEach((b) => items.push({ key: 'brands', value: b, label: `Marka: ${b}` }));
    models.forEach((m) => items.push({ key: 'models', value: m, label: `Tür: ${m}` }));
    if (min)    items.push({ key: 'min', label: `Min ₺${min}` });
    if (max)    items.push({ key: 'max', label: `Max ₺${max}` });

    if (sort) {
      const text =
        sort === 'price_asc'  ? 'Sıralama: Fiyat Artan'  :
        sort === 'price_desc' ? 'Sıralama: Fiyat Azalan' :
        sort === 'oldest'     ? 'Sıralama: En Eski'      :
        'Sıralama: En Yeni';
      items.push({ key: 'sort', label: text });
    }

    return items;
  }, [q, city, brands.join(','), models.join(','), min, max, sort]);

  if (chips.length === 0) return null;

  function removeChip(key: string, value?: string) {
    const p = new URLSearchParams(sp.toString());

    // Sayfayı 1'e çek
    p.delete('page');

    if (value) {
      // CSV param'dan tek bir değeri çıkar (brands/models)
      const current = splitCsv(p.get(key));
      const next = current.filter((x) => x !== value);
      if (next.length > 0) p.set(key, next.join(','));
      else p.delete(key);
    } else {
      // Tekil param
      p.delete(key);
    }

    router.push(`${pathname}?${p.toString()}`);
  }

  function clearAll() {
    const p = new URLSearchParams(sp.toString());
    ['q','city','brands','models','min','max','sort','page'].forEach((k) => p.delete(k));
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c, i) => (
        <button
          key={`${c.key}-${c.value ?? i}`}
          type="button"
          onClick={() => removeChip(c.key, c.value)}
          className="group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition"
          title="Bu filtreyi kaldır"
        >
          <span>{c.label}</span>
          <span className="rounded-full w-5 h-5 grid place-items-center border text-xs opacity-80 group-hover:opacity-100">✕</span>
        </button>
      ))}

      <button
        type="button"
        onClick={clearAll}
        className="ml-1 text-xs underline opacity-80 hover:opacity-100"
        title="Tüm filtreleri temizle"
      >
        Hepsini temizle
      </button>
    </div>
  );
}
