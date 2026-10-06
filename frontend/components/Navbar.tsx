export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zoom-border bg-white px-5 sm:px-8">
      <a href="/" className="flex items-center text-[22px] font-bold tracking-tight text-zoom-blue">
        zoom
      </a>

      <div className="hidden w-full max-w-[420px] items-center gap-3 rounded-full border border-zoom-border bg-zoom-panel px-4 py-2 text-sm text-zoom-muted sm:flex">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>
        Search
        <span className="ml-auto rounded border border-zoom-border bg-white px-1.5 py-0.5 text-xs">⌘ K</span>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" aria-label="Notifications" className="rounded-full p-2 text-zoom-muted transition hover:bg-zoom-panel focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        </button>
        <button type="button" aria-label="Settings" className="rounded-full p-2 text-zoom-muted transition hover:bg-zoom-panel focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" /></svg>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zoom-selected text-xs font-bold text-zoom-blue">AM</div>
          <span className="hidden text-sm font-medium text-zoom-heading md:block">Alex Morgan</span>
          <svg viewBox="0 0 20 20" className="hidden h-4 w-4 text-zoom-muted md:block" fill="currentColor" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
        </div>
      </div>
    </header>
  );
}
