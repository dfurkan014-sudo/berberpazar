'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  images: string[];
  alt?: string;
};

export default function Gallery({ images, alt }: Props) {
  // Geçerli ve tekilleştirilmiş URL listesi
  const list = useMemo(
    () =>
      Array.from(
        new Set(
          (images ?? [])
            .filter((u): u is string => typeof u === 'string')
            .map((u) => u.trim())
            .filter(Boolean)
        )
      ),
    [images]
  );

  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  // Lightbox açıkken klavye kısayolları
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % list.length);
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + list.length) % list.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, list.length]);

  if (list.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
        <span className="text-gray-500 text-sm">Görsel yok</span>
      </div>
    );
  }

  const current = list[Math.min(idx, list.length - 1)];

  return (
    <div className="w-full">
      {/* Ana görsel */}
      <button
        type="button"
        title="Büyüt"
        onClick={() => setOpen(true)}
        className="aspect-video w-full bg-gray-100 rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-black"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={alt || ''} className="w-full h-full object-cover" />
      </button>

      {/* Thumbnail şeridi */}
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setIdx(i)}
              title={`Görsel ${i + 1}`}
              className={`shrink-0 w-28 h-20 rounded overflow-hidden border 
                ${i === idx ? 'ring-2 ring-black' : 'opacity-90 hover:opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt || ''} - ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-6xl w-[95vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt={alt || ''} className="w-full h-full object-contain" />

            {list.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded bg-white/10 hover:bg-white/20"
                  onClick={() => setIdx((i) => (i - 1 + list.length) % list.length)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded bg-white/10 hover:bg-white/20"
                  onClick={() => setIdx((i) => (i + 1) % list.length)}
                >
                  ›
                </button>
              </>
            )}

            <button
              type="button"
              className="absolute top-2 right-2 px-3 py-1 rounded bg-white/10 hover:bg-white/20"
              onClick={() => setOpen(false)}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
