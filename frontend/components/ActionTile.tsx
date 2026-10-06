import type { ReactNode } from "react";

type ActionTileProps = {
  icon: ReactNode;
  label: string;
  color: string;
  onClick: () => void;
};

export default function ActionTile({ icon, label, color, onClick }: ActionTileProps) {
  return (
    <button type="button" onClick={onClick} className="group flex w-[132px] flex-col items-center gap-3 text-center focus-visible:ring-2 focus-visible:ring-zoom-blue">
      <span className="flex h-[132px] w-[132px] items-center justify-center rounded-xl text-white shadow-sm transition group-hover:brightness-90" style={{ backgroundColor: color }}>
        <span className="flex h-12 w-12 items-center justify-center">{icon}</span>
      </span>
      <span className="text-sm font-semibold text-zoom-heading">{label}</span>
    </button>
  );
}
