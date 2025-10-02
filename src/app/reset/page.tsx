'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

function ResetInner() {
  const sp = useSearchParams();
  const token = sp.get('token') ?? '';

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !!token && pw1.length >= 8 && pw1 === pw2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setErr(null);
    setOk(null);

    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: pw1 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Şifre sıfırlanamadı');
      setOk('Şifre güncellendi. Artık giriş yapabilirsiniz.');
      setPw1('');
      setPw2('');
    } catch (e: any) {
      setErr(e?.message || 'Beklenmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Şifre Sıfırla</h1>

      {!token && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">
          Bu sayfaya e-postanızdaki bağlantı ile gelmelisiniz.
        </div>
      )}

      {err && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
          {err}
        </div>
      )}
      {ok && (
        <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">
          {ok}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Yeni şifre</label>
            <input
              type={show ? 'text' : 'password'}
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              minLength={8}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              placeholder="En az 8 karakter"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Yeni şifre (tekrar)</label>
            <input
              type={show ? 'text' : 'password'}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              minLength={8}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              placeholder="Tekrar girin"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            {show ? 'Gizle' : 'Göster'}
          </button>

          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? 'Gönderiliyor…' : 'Şifreyi Sıfırla'}
          </button>

          <Link href="/login" className="text-sm underline">
            Girişe dön
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPage() {
  // useSearchParams kullanıldığı için Next build'de Suspense istiyor
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto p-6 text-sm text-zinc-400">Yükleniyor…</div>}>
      <ResetInner />
    </Suspense>
  );
}
