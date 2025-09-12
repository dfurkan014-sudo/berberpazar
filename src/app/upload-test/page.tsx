'use client';

import { useState } from 'react';

export default function UploadTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setUrl(null);

    if (!file) {
      setStatus('Önce bir dosya seç.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? res.statusText);
      setUrl(data.url);
      setStatus('✔️ Yüklendi');
    } catch (err: any) {
      setStatus(`Hata: ${err?.message ?? String(err)}`);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Cloudinary Upload Test</h1>

      <form onSubmit={handleUpload} className="space-y-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full"
        />
        <button className="px-4 py-2 rounded bg-black text-white">
          Yükle
        </button>
      </form>

      {status && <p className="text-sm">{status}</p>}
      {url && (
        <div className="space-y-2">
          <div className="text-sm break-all">URL: {url}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="preview" className="w-full rounded" />
        </div>
      )}
    </div>
  );
}
