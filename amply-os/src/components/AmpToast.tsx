"use client";

import { useEffect } from "react";

export default function AmpToast({
  message,
  onClose,
  onClick,
  ms = 3500,
}: {
  message: string;
  onClose: () => void;
  onClick?: () => void;
  ms?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, ms);
    return () => clearTimeout(t);
  }, [onClose, ms]);

  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      <button
        type="button"
        onClick={onClick}
        className="w-[340px] rounded-2xl border border-white/10 bg-black/90 p-3 text-left shadow-2xl backdrop-blur hover:bg-black/80"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-white/60">AMP</div>
            <div className="mt-1 text-sm font-semibold text-white">
              Incoming alert
            </div>
            <div className="mt-1 text-xs text-white/70 line-clamp-2">
              {message}
            </div>
          </div>

          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            ✕
          </span>
        </div>
      </button>
    </div>
  );
}
