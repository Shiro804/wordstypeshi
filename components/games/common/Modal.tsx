"use client";

import { ReactNode, useEffect } from "react";
import { useTranslations } from "@/lib/i18n";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  transparent?: boolean;
};

export default function Modal({ open, title, children, onClose, footer, transparent }: Props) {
  const t = useTranslations();
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain">
      <button
        className={`absolute inset-0 bg-[color:var(--modal-overlay)] backdrop-blur-sm transition-opacity duration-300 ${transparent ? "opacity-0" : ""}`}
        aria-label="Close modal"
        onClick={onClose}
      />

      <div className={`relative w-full max-w-lg overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--modal-bg)] shadow-2xl transition-all duration-300 ${transparent ? "opacity-0 translate-y-4 scale-95" : "opacity-100"}`}>
        {/* mobile: keep modal within viewport */}
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--border)] px-5 py-4">
          <div className="text-base font-semibold text-[color:var(--fg)]">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-medium text-[color:var(--fg)] transition hover:bg-[color:var(--surface2)]"
          >
            {t.common.close}
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-auto px-5 py-4 text-sm text-[color:var(--fg)]/85">{children}</div>

        {footer ? <div className="border-t border-[color:var(--border)] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
