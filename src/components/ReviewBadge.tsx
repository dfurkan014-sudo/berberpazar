"use client";
import React from "react";
import { Stars } from "./Stars";

export default function ReviewBadge({
  listingId,
  variant = "small", // "small" | "large"
  className = "",
}: { listingId: number; variant?: "small" | "large"; className?: string }) {
  const [avg, setAvg] = React.useState<number | null>(null);
  const [count, setCount] = React.useState<number>(0);

  React.useEffect(() => {
    let ok = true;
    fetch(`/api/listings/${listingId}/reviews`)
      .then(r => r.json())
      .then(d => { if (!ok) return; setAvg(d?.stats?.average ?? 0); setCount(d?.stats?.count ?? 0); })
      .catch(() => {});
    return () => { ok = false; };
  }, [listingId]);

  const box =
    variant === "large" ? "px-2.5 py-1.5 text-sm rounded-xl" : "px-1.5 py-0.5 text-xs rounded-lg";

  return (
    <span className={`inline-flex items-center gap-1 bg-zinc-800/70 text-zinc-100 ${box} ${className}`}>
      <Stars value={avg ?? 0} size={variant === "large" ? 18 : 14} />
      <span>{avg?.toFixed(1) ?? "—"}</span>
      <span className="opacity-70">({count})</span>
    </span>
  );
}
