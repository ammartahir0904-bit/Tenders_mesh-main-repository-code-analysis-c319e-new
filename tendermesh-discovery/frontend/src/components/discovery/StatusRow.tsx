import React from 'react';

interface StatusRowProps {
  label: string;
  value: string;
  accent?: boolean;
}

export const StatusRow: React.FC<StatusRowProps> = ({
  label,
  value,
  accent = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/35 px-3.5 py-3">
      <span className="text-slate-400 text-xs font-semibold">{label}</span>
      <span className={`text-xs font-bold ${accent ? 'text-cyan-300' : 'text-white'}`}>{value}</span>
    </div>
  );
};

export default StatusRow;
