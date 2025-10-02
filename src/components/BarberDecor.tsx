'use client';

type PoleProps = { mirrored?: boolean };

/**
 * Ekranın sol/sağında sürekli dönen berber direkleri.
 * - Hep üstte: z-[100]
 * - Tıklamayı engellemesin: pointer-events-none
 * - Ekranın ortasına hizalı: top-1/2 + -translate-y-1/2
 * Not: Amblem/watermark BİLEREK yok (sadece favicon kalsın).
 */
export default function BarberDecor() {
  return (
    <>
      {/* Sol direk */}
      <div
        className="pointer-events-none fixed left-3 top-1/2 -translate-y-1/2 z-[100]"
        aria-hidden="true"
      >
        <Pole />
      </div>

      {/* Sağ direk */}
      <div
        className="pointer-events-none fixed right-3 top-1/2 -translate-y-1/2 z-[100]"
        aria-hidden="true"
      >
        <Pole mirrored />
      </div>
    </>
  );
}

function Pole({ mirrored = false }: PoleProps) {
  return (
    <div className={mirrored ? 'mirror' : undefined}>
      <div className="barber-cap" />
      <div className="barber-pole">
        <div className="barber-glass" />
      </div>
      <div className="barber-base" />
    </div>
  );
}
