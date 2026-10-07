"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function updateSearch(value: string) {
    setSearch(value);
    // The current page owns its meeting list and applies the shared search text.
    window.dispatchEvent(new CustomEvent("meeting-search", { detail: value }));
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zoom-border bg-white px-3 sm:px-8">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-zoom-heading hover:bg-zoom-panel focus-visible:ring-2 focus-visible:ring-zoom-blue lg:hidden"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <a href="/" className="flex items-center text-[22px] font-bold tracking-tight text-zoom-blue">zoom</a>
      </div>

      <label className="hidden w-full max-w-[420px] items-center gap-3 rounded-full border border-zoom-border bg-zoom-panel px-4 py-2 text-sm text-zoom-muted sm:flex">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>
        <input aria-label="Search meetings" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search meetings" className="min-w-0 flex-1 bg-transparent text-sm text-zoom-heading outline-none placeholder:text-zoom-muted" />
      </label>

      <div ref={menuRef} className="relative flex items-center gap-2">
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Settings" aria-expanded={menuOpen} className="rounded-full p-2 text-zoom-muted transition hover:bg-zoom-panel focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" /></svg>
        </button>
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Alex Morgan profile" aria-expanded={menuOpen} className="flex items-center gap-2 rounded-full p-1 hover:bg-zoom-panel focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zoom-selected text-xs font-bold text-zoom-blue">AM</span>
          <span className="hidden text-sm font-medium text-zoom-heading md:block">Alex Morgan</span>
          <svg viewBox="0 0 20 20" className="hidden h-4 w-4 text-zoom-muted md:block" fill="currentColor" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
        </button>
        {menuOpen && <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-zoom-border bg-white p-2 shadow-xl">
          <div className="border-b border-zoom-border px-3 py-2.5"><p className="text-sm font-semibold text-zoom-heading">Alex Morgan</p><p className="mt-0.5 text-xs text-zoom-muted">alex.morgan@example.com</p></div>
          <button type="button" onClick={() => setMenuOpen(false)} className="mt-1 w-full cursor-default rounded-lg px-3 py-2 text-left text-sm text-slate-400">Settings</button>
          <button type="button" onClick={() => setMenuOpen(false)} className="w-full cursor-default rounded-lg px-3 py-2 text-left text-sm text-slate-400">Sign out</button>
        </div>}
      </div>
      {drawerOpen && <div className="fixed inset-0 z-40 lg:hidden">
        <button type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-y-0 left-0 pt-14"><Sidebar drawer onNavigate={() => setDrawerOpen(false)} /></div>
      </div>}
    </header>
  );
}
