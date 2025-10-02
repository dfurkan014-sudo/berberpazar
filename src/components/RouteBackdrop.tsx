// src/components/RouteBackdrop.tsx
'use client';

import { usePathname } from "next/navigation";
import { useEffect } from "react";
export const dynamic = 'force-dynamic';

export default function RouteBackdrop() {
  const pathname = usePathname() || "/";
  useEffect(() => {
    document.body.dataset.route = pathname;
    return () => { delete document.body.dataset.route; };
  }, [pathname]);

  return <div className="route-backdrop" aria-hidden />;
}
