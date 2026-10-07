"use client";

import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-4 backdrop-blur-[1px]" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className="my-auto w-full max-w-[440px] rounded-xl border border-zoom-border bg-white p-4 shadow-[0_18px_60px_rgba(14,29,46,0.2)] sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <h2 id="modal-title" className="text-xl font-semibold text-zoom-heading">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}
