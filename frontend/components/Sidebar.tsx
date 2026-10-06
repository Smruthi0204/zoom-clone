import Link from "next/link";

const items = [
  { label: "Home", href: "/", icon: "⌂", active: true },
  { label: "Meetings", href: "/meetings", icon: "▣" },
  { label: "Team Chat", href: "#", icon: "◌" },
  { label: "Whiteboards", href: "#", icon: "▤" },
  { label: "Apps", href: "#", icon: "⊞" },
];

export default function Sidebar({ current = "Home" }: { current?: string }) {
  return (
    <aside className="hidden w-[232px] shrink-0 border-r border-slate-200 bg-white px-4 py-7 lg:block">
      <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
      <nav className="space-y-1" aria-label="Main navigation">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${(item.label === current) ? "bg-[#edf3ff] text-[#0B5CFF]" : "text-slate-600 hover:bg-slate-50"}`}>
            <span className="w-5 text-center text-lg leading-none" aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-9 border-t border-slate-100 pt-6">
        <p className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Personal</p>
        <a href="#" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="w-5 text-center text-lg">⚙</span>Settings</a>
      </div>
      <div className="mt-10 rounded-2xl bg-[#f4f7ff] p-4">
        <p className="text-sm font-semibold text-slate-800">Make space for focus</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Bring your team together, wherever they are.</p>
        <button className="mt-3 text-xs font-semibold text-[#0B5CFF]">Explore plans →</button>
      </div>
    </aside>
  );
}
