// ─── FilterBar: Search, dropdowns, date pickers ───

import React, { useEffect, useRef } from 'react';
import type { TenderFilters } from '../../types/tender';
import { Icons, Button, Select } from '../ui';

interface FilterBarProps {
  filters: TenderFilters;
  onChange: (updates: Partial<TenderFilters>) => void;
  onTriggerScan: () => void;
  isScanLoading?: boolean;
  total?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onTriggerScan,
  isScanLoading = false,
  total = 0,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener to focus search (Ctrl+K or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeFilters = [
    { key: 'source', value: filters.source, label: 'Source' },
    { key: 'recommendation', value: filters.recommendation, label: 'Score' },
    { key: 'approval_status', value: filters.approval_status, label: 'Approval' },
    { key: 'search', value: filters.search?.trim() ? 'Search' : undefined, label: 'Search' },
  ].filter((f) => Boolean(f.value));

  const handleRemoveFilter = (key: string) => {
    onChange({ [key]: undefined });
  };

  const handleClearAll = () => {
    onChange({
      source: undefined,
      recommendation: undefined,
      approval_status: undefined,
      search: undefined,
    });
  };

  return (
    <section className="tm-surface rounded-[24px] p-4 border border-white/5">
      <div className="flex flex-col gap-3">
        {/* Filter chips row */}
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.length > 0 ? (
            <>
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  onClick={() => handleRemoveFilter(f.key)}
                  className="inline-flex items-center gap-1 cursor-pointer select-none rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-200 hover:bg-cyan-400/15 transition-all duration-200"
                  title={`Click to clear ${f.label} filter`}
                >
                  <span>{f.label}: {String(f.value).replace('_', ' ')}</span>
                  <Icons.X className="h-3 w-3 text-cyan-400 shrink-0" />
                </span>
              ))}
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-white transition-colors duration-200"
              >
                Clear All
              </button>
            </>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500">No filters applied</span>
          )}
        </div>

        {/* Inputs panel */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input wrapper */}
          <div className="relative min-w-[200px] flex-1">
            <Icons.Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="tender-search"
              name="search"
              ref={searchInputRef}
              type="text"
              autoComplete="off"
              placeholder="Search tenders... (⌘K)"
              value={filters.search ?? ''}
              onChange={(e) => onChange({ search: e.target.value })}
              className="tm-focus h-10 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3.5 text-sm text-white placeholder:text-slate-500 transition-colors duration-200 hover:border-white/15 focus-visible:border-cyan-400/30"
            />
          </div>

          <div className="w-40">
            <Select
              value={filters.source ?? ''}
              onChange={(e) => onChange({ source: e.target.value || undefined })}
            >
              <option value="">All Sources</option>
              <optgroup label="Pakistan Federal">
                <option value="PPRA_AI">PPRA (Federal)</option>
                <option value="PAKISTAN_GOV">Pakistan.gov.pk</option>
                <option value="PEC">Pakistan Engineering Council</option>
                <option value="NHA">National Highway Authority</option>
                <option value="CDA">Capital Development Authority</option>
                <option value="FBR">Federal Board of Revenue</option>
                <option value="NEPRA">NEPRA</option>
                <option value="OGRA">OGRA</option>
                <option value="NTDC">NTDC</option>
                <option value="PIA">PIA Procurement</option>
                <option value="PAK_RAILWAYS">Pakistan Railways</option>
              </optgroup>
              <optgroup label="Pakistan Provincial">
                <option value="SPPRA">SPPRA (Sindh)</option>
                <option value="KPPRA">KPPRA (KPK)</option>
                <option value="BPPRA">BPPRA (Balochistan)</option>
                <option value="PRA_PUNJAB">PRA Punjab</option>
              </optgroup>
              <optgroup label="International">
                <option value="SAM_GOV">SAM.gov (US)</option>
                <option value="UNDP">UNDP</option>
                <option value="WORLD_BANK">World Bank</option>
                <option value="UNGM">UN Global Marketplace</option>
                <option value="ADB">Asian Development Bank</option>
                <option value="ISDB">Islamic Development Bank</option>
              </optgroup>
            </Select>
          </div>

          <div className="w-40">
            <Select
              value={filters.recommendation ?? ''}
              onChange={(e) => onChange({ recommendation: (e.target.value || undefined) as any })}
            >
              <option value="">All Recommendations</option>
              <option value="STRONG_YES">Strong Yes</option>
              <option value="YES">Yes</option>
              <option value="MAYBE">Maybe</option>
              <option value="NO">No</option>
            </Select>
          </div>

          <div className="w-40">
            <Select
              value={filters.approval_status ?? ''}
              onChange={(e) => onChange({ approval_status: (e.target.value || undefined) as any })}
            >
              <option value="">All Approvals</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>

          <Button
            variant="primary"
            onClick={onTriggerScan}
            loading={isScanLoading}
            className="min-w-[100px]"
            icon={<Icons.Refresh className="h-4 w-4" />}
          >
            Scan Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FilterBar;

