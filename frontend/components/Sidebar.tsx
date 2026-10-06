import Link from "next/link";

const items = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Meetings", href: "/meetings", icon: "▦" },
];

export default function Sidebar({ current = "Home" }: { current?: string }) {
  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-zoom-border bg-zoom-panel px-3 py-5 lg:block">
      <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-zoom-muted">Workspace</p>
      <nav className="space-y-1" aria-label="Main navigation">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-zoom-blue ${item.label === current ? "bg-zoom-selected text-zoom-blue" : "text-slate-700 hover:bg-white"}`}>
            <span className="w-5 text-center text-base leading-none" aria-hidden="true">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
