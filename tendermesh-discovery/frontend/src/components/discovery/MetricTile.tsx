import React from 'react';

interface MetricTileProps {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  note,
  icon,
}) => {
  return (
    <div className="tm-surface-soft rounded-[22px] p-4 border border-white/5 bg-white/[0.015] shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
        <span className="rounded-xl border border-white/5 bg-white/5 p-2 text-cyan-300 shadow-inner">{icon}</span>
      </div>
      <div className="mt-3.5 text-3xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400 font-medium">{note}</div>
    </div>
  );
};

export default MetricTile;
