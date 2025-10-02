'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  async function onClick() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }
  return (
    <button onClick={onClick} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-black">
      Çıkış
    </button>
  );
}
