import React from 'react';

interface CriteriaRowProps {
  title: string;
  text: string;
}

export const CriteriaRow: React.FC<CriteriaRowProps> = ({ title, text }) => {
  return (
    <div className="rounded-xl border border-white/5 bg-black/35 px-4 py-3">
      <div className="text-xs font-bold text-white tracking-wide">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-400 font-medium">{text}</div>
    </div>
  );
};

export default CriteriaRow;
