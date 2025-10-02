import { Suspense } from "react";
import LoginForm from "./LoginForm";


export const dynamic = "force-dynamic"; // prerender sırasında güvenli

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-6">Giriş yap</h1>

      {/* useSearchParams kullanan client bileşeni Suspense ile sarıyoruz */}
      <Suspense fallback={<div className="text-sm text-zinc-400">Yükleniyor…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
