import Link from "next/link";

const items = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Meetings", href: "/meetings", icon: "▦" },
];

export default function Sidebar({ current = "Home", drawer = false, onNavigate }: { current?: string; drawer?: boolean; onNavigate?: () => void }) {
  return (
    <aside className={`${drawer ? "h-full w-[min(280px,85vw)] border-r border-zoom-border bg-white shadow-xl" : "hidden w-[220px] shrink-0 border-r border-zoom-border bg-zoom-panel lg:block"} px-3 py-5`}>
      <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-zoom-muted">Workspace</p>
      <nav className="space-y-1" aria-label="Main navigation">
        {items.map((item) => (
          <Link key={item.label} href={item.href} onClick={onNavigate} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-zoom-blue ${item.label === current ? "bg-zoom-selected text-zoom-blue" : "text-slate-700 hover:bg-white"}`}>
            <span className="w-5 text-center text-base leading-none" aria-hidden="true">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
