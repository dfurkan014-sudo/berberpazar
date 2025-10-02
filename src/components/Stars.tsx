"use client";
import React from "react";

export function Stars({
  value = 0,
  size = 18,
  interactive = false,
  onChange,
}: {
  value?: number;           // 0..5
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} yıldız`}
          className={`p-0 ${interactive ? "cursor-pointer" : "cursor-default"}`}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(null)}
          onClick={() => interactive && onChange?.(i)}
          disabled={!interactive}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" className={i <= shown ? "opacity-100" : "opacity-40"}>
            <path
              d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
              fill="currentColor"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
