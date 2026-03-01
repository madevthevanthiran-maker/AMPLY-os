"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
  onClick?: () => void;
  durationMs?: number;
};

export default function Toast({
  message,
  onClose,
  onClick,
  durationMs = 3500,
}: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [onClose, durationMs]);

  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      <button
        type="button"
        onClick={onClick}
        className="w-[320px] rounded-xl border border-white/10 bg-black/90 p-3 text-left shadow-xl backdrop-blur hover:bg-black/80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">New notification</div>
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
            className="shrink-0 rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            ✕
          </span>
        </div>
      </button>
    </div>
  );
}
