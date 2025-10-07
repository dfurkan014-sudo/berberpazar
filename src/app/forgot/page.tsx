'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPage() {
  const [idv, setIdv] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOk(null);
    setErr(null);
    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: idv }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Gönderilemedi');

      let via = j?.channel === 'whatsapp' ? 'WhatsApp'
              : j?.channel === 'sms' ? 'SMS'
              : 'e-posta';
      setOk(`Sıfırlama bağlantısı ${via} ile gönderildi (varsa spam klasörünü de kontrol edin).`);
      setIdv('');
    } catch (e: any) {
      setErr(e?.message || 'Beklenmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  return (
   <div className="auth-screen py-12">
      <h1 className="text-2xl font-semibold mb-4">Şifremi Unuttum</h1>

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
        <div>
          <label className="block text-sm mb-1">E-posta veya telefon</label>
          <input
            type="text"
            value={idv}
            onChange={(e) => setIdv(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="ornek@eposta.com veya 05xxxxxxxxx"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!idv || busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
          </button>

          <Link href="/login" className="text-sm underline">Girişe dön</Link>
        </div>
      </form>
    </div>
  );
}
