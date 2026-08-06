// â”€â”€â”€ TenderDetailDrawer: Slide-out panel for tender details â”€â”€â”€

import React, { useState, useEffect } from 'react';
import type { TenderWithDetails } from '../../types/tender';
import { formatCurrency, formatDate, scoreToPercent } from '../../lib/utils';
import ScoreRadar from './ScoreRadar';
import { useDeliveries } from '../../features/tenders/useDeliveries';
import DeliveryStatusBadge from './DeliveryStatusBadge';
import { Icons, Badge, Button, ProgressRing, Skeleton } from '../ui';

interface TenderDetailDrawerProps {
  tender: TenderWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const TenderDetailDrawer: React.FC<TenderDetailDrawerProps> = ({
  tender,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'score' | 'reqs' | 'deliveries'>('overview');

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset active tab to overview when drawer opens with a new tender
  useEffect(() => {
    if (tender) {
      setActiveTab('overview');
    }
  }, [tender]);

  const tenderId = tender?.id ?? null;
  const { data: deliveries = [], isLoading: deliveriesLoading } = useDeliveries(tenderId);

  if (!tender) return null;

  const mandatoryRequirements = Array.isArray(tender.mandatory_reqs) ? tender.mandatory_reqs : [];
  const scoreReasons = tender.score?.score_reasons ?? {};
  const recommendationText = tender.score?.recommendation?.replace('_', ' ') ?? 'No recommendation';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tender-detail-title"
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-full sm:max-w-lg md:max-w-2xl border-l border-slate-200 bg-white shadow-[-40px_0_120px_-48px_rgba(0,0,0,0.95)] backdrop-blur-2xl
          transform transition-transform duration-300 ease-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sticky Header Section */}
        <div className="border-b border-slate-200 bg-white px-6 py-5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3">
                <span className="tm-pill">
                  <Icons.Eye className="h-3.5 w-3.5 text-blue-700" />
                  Tender Review
                </span>
                {tender.score && (
                  <Badge variant="info">
                    Match: {scoreToPercent(tender.score.overall_score)}
                  </Badge>
                )}
              </div>
              <h2 id="tender-detail-title" className="mt-3 text-xl font-bold leading-snug text-slate-900 tracking-tight">
                {tender.title}
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 font-semibold">
                {tender.source} Â· {tender.source_id}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tender details"
              className="tm-focus rounded-xl border border-slate-200 bg-white/5 p-2 text-slate-600 transition-colors duration-200 hover:bg-white/10 hover:text-slate-900"
            >
              <Icons.X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HeaderMetric
              label="Estimated Value"
              value={formatCurrency(tender.estimated_value, tender.currency)}
            />
            <HeaderMetric
              label="Deadline"
              value={formatDate(tender.deadline)}
            />
            <HeaderMetric
              label="Approval Status"
              value={tender.approval?.status ?? 'PENDING'}
            />
          </div>

          {/* Tab Selection Row */}
          <div className="flex border-b border-slate-200 mt-5 -mx-6 px-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabButton>
            <TabButton active={activeTab === 'score'} onClick={() => setActiveTab('score')}>AI Fit Analysis</TabButton>
            <TabButton active={activeTab === 'reqs'} onClick={() => setActiveTab('reqs')}>Mandatory Requirements</TabButton>
            <TabButton active={activeTab === 'deliveries'} onClick={() => setActiveTab('deliveries')}>Deliveries</TabButton>
          </div>
        </div>

        {/* Scrollable Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard label="Organisation" value={tender.buying_org ?? 'â€”'} />
                <InfoCard label="Category" value={tender.category ?? 'â€”'} />
                <InfoCard label="Location" value={tender.location ?? 'â€”'} />
                <InfoCard label="Source Portal" value={tender.source} />
                <InfoCard label="Portal Reference ID" value={tender.source_id} />
                <InfoCard label="Tender Status" value={tender.status} />
              </div>
              {tender.description ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Description</div>
                  <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-700">{tender.description}</p>
                </div>
              ) : null}
              {tender.source_url && (
                <a
                  href={tender.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tm-focus inline-flex items-center gap-2 rounded-xl border border-blue-600/20 bg-blue-600/5 px-4 py-2.5 text-xs font-bold text-blue-700 transition-colors duration-200 hover:bg-blue-600/10"
                >
                  View Original Posting
                  <Icons.ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          {activeTab === 'score' && (
            <div className="space-y-6 animate-fade-in">
              {tender.score ? (
                <div className="tm-surface rounded-[20px] p-5 border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Fit Analysis</div>
                      <h3 className="mt-1 text-base font-bold text-slate-900 tracking-tight">AI Match Score</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressRing value={tender.score.overall_score} size={50} strokeWidth={4} />
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          {scoreToPercent(tender.score.overall_score)}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                          {recommendationText}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
                    <div className="flex-1 max-w-[280px] mx-auto lg:mx-0">
                      <ScoreRadar scoreReasons={scoreReasons} />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 flex-1 text-xs">
                      {Object.entries(scoreReasons).map(([reason, value]) => (
                        <div key={reason} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="capitalize text-[10px] font-semibold text-slate-500 tracking-wide">
                            {reason.split('_').join(' ')}
                          </div>
                          <div className="mt-1.5 font-bold text-slate-900">{scoreToPercent(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm font-semibold">
                  No matching score data available for this tender.
                </div>
              )}
            </div>
          )}

          {activeTab === 'reqs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Mandatory Requirements</h3>
                <Icons.Requirement className="h-5 w-5 text-blue-700 tm-icon-float" />
              </div>
              {mandatoryRequirements.length > 0 ? (
                <ul className="space-y-2">
                  {mandatoryRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs text-slate-700">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
                      <span className="leading-relaxed font-medium">{req}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm font-semibold">
                  No specific mandatory requirements extracted.
                </div>
              )}
            </div>
          )}

          {activeTab === 'deliveries' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Supplier Dispatch Records</h3>
                <DeliveryStatusBadge deliveries={deliveries} size="md" />
              </div>

              {deliveriesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveries.length > 0 ? (
                    deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-bold text-slate-900">{delivery.supplier_name}</div>
                            <div className="mt-1 text-[10px] text-slate-500 font-semibold">
                              Attempted {formatDate(delivery.attempted_at)}
                            </div>
                          </div>
                          <Badge variant={delivery.delivered ? 'success' : 'danger'}>
                            {delivery.delivered ? `Delivered (${delivery.status_code})` : 'Failed'}
                          </Badge>
                        </div>
                        {delivery.error_message && (
                          <div className="mt-2.5 rounded-lg bg-red-50 border border-red-500/10 p-2 text-[10px] leading-relaxed text-red-700 font-semibold">
                            {delivery.error_message}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs leading-relaxed text-slate-500 font-semibold">
                      No supplier delivery attempts recorded.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 backdrop-blur-md flex gap-3">
          <Button
            variant="primary"
            onClick={() => onApprove(tender.id)}
            className="flex-1"
          >
            Approve & Dispatch
          </Button>
          <Button
            variant="secondary"
            onClick={() => onReject(tender.id)}
            className="flex-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          >
            Reject Tender
          </Button>
        </div>
      </div>
    </>
  );
};

interface InfoCardProps {
  label: string;
  value: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1.5 break-words text-xs font-bold leading-relaxed text-slate-800">{value}</div>
    </div>
  );
};

interface HeaderMetricProps {
  label: string;
  value: string;
}

const HeaderMetric: React.FC<HeaderMetricProps> = ({ label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-1.5 text-xs font-bold text-slate-800 tracking-tight">{value}</div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-xs font-bold transition-all relative border-b-2
        ${
          active
            ? 'border-blue-600 text-blue-700'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
    >
      {children}
    </button>
  );
};

export default TenderDetailDrawer;


