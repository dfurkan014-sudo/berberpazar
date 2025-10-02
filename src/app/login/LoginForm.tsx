"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
export const dynamic = 'force-dynamic';

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("redirect") || "/listings";

  const [identifier, setIdentifier] = useState(""); // e-posta / ikinci e-posta / telefon
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) {
      setError("E-posta/telefon ve şifre zorunlu.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error || "Giriş başarısız.");
      // Başarılı giriş → yönlendir + header yenilensin
      router.replace(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Beklenmeyen hata.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">E-posta veya Telefon</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="ornek@mail.com ya da 05xxxxxxxxx"
            autoComplete="username"
          />
          <p className="mt-1 text-xs text-zinc-500">
            İkinci e-posta veya telefonla da giriş yapabilirsiniz.
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1">Şifre</label>
          <div className="flex gap-2">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              autoComplete="current-password"
              placeholder="Şifreniz"
            />
            <button
              type="button"
              onClick={() => setShowPw((x) => !x)}
              className="rounded-lg border border-zinc-700 px-3 text-sm"
              aria-label="Şifreyi göster/gizle"
            >
              {showPw ? "Gizle" : "Göster"}
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>

          <Link href="/register" className="text-sm underline">
            Hesabın yok mu? Kayıt ol
          </Link>

          <Link href="/forgot" className="text-sm underline">
            Şifremi unuttum?
          </Link>
        </div>
      </form>
    </div>
  );
}
