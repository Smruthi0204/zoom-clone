import type { ReactNode } from "react";

type ActionTileProps = {
  icon: ReactNode;
  label: string;
  color: string;
};

export default function ActionTile({ icon, label, color }: ActionTileProps) {
  return (
    <button type="button" className="group flex min-h-[150px] flex-col items-start justify-between rounded-2xl p-5 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-[172px]" style={{ backgroundColor: color }}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">{icon}</span>
      <span className="flex w-full items-center justify-between text-base font-semibold">
        {label}<span className="text-lg transition group-hover:translate-x-1" aria-hidden="true">→</span>
      </span>
    </button>
  );
}
