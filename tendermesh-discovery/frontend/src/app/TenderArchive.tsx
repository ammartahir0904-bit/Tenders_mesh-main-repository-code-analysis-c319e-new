import React, { useState } from 'react';
import { useTenders } from '../features/tenders/useTenders';
import { useApproveTender } from '../features/tenders/useApproveTender';
import { Button } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import TenderDetailDrawer from '../components/discovery/TenderDetailDrawer';
import type { TenderWithDetails } from '../types/tender';

const TenderArchive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  const [drawerTender, setDrawerTender] = useState<TenderWithDetails | null>(null);
  const { success, error } = useToast();

  const approveMutation = useApproveTender();

  // Load tenders with specific approval status
  const { data, isLoading } = useTenders({
    approval_status: activeTab === 'ALL' ? 'DECIDED' : activeTab,
    per_page: 50,
  });

  const tenders = (data?.data ?? []).filter(t => t.approval?.status && t.approval.status !== 'PENDING');

  const handleAction = (tenderId: string, status: 'APPROVED' | 'REJECTED') => {
    approveMutation.mutate({ tender_id: tenderId, status }, {
      onSuccess: () => {
        if (status === 'APPROVED') {
          success("✓ Tender re-sent and approved successfully!");
        } else {
          success("✕ Tender rejected successfully.");
        }
      },
      onError: () => {
        error(`Failed to update tender to ${status}.`);
      }
    });
  };

  return (
    <div className="animate-slide-up flex flex-col gap-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tender Archive</h1>
          <p className="text-sm text-slate-500 mt-1">Permanent record of all decided tenders. Re-approve or re-send to supplier agents anytime.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'ALL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Decided
        </button>
        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'APPROVED' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'REJECTED' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Rejected
        </button>
      </div>

      <div className="tm-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Tender Title</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Organization</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Decision Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Dispatch</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">Loading archive...</td>
                </tr>
              ) : tenders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <div className="text-4xl mb-4">🗄️</div>
                    <p>No tenders found in this archive.</p>
                  </td>
                </tr>
              ) : (
                tenders.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 line-clamp-1">{item.title}</div>
                      <div className="text-xs text-slate-500 mt-1 flex gap-2">
                        <span>{item.category || 'Uncategorized'}</span>
                        {item.location && <span>• {item.location}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.buying_org || item.source}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.approval?.approved_at ? new Date(item.approval.approved_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {item.approval?.status === 'APPROVED' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                          ✓ APPROVED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          ✕ REJECTED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.approval?.status === 'APPROVED' ? (
                        item.deliveries && item.deliveries.some(d => d.delivered) ? (
                          <span className="text-xs font-semibold text-emerald-600">Delivered</span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-600">Pending/Failed</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          className="text-xs px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50"
                          onClick={() => setDrawerTender(item)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={approveMutation.isPending}
                          onClick={() => handleAction(item.id, 'APPROVED')}
                        >
                          🔄 Re-Send / Approve
                        </Button>
                        {item.approval?.status === 'APPROVED' && (
                          <Button
                            variant="danger"
                            className="text-xs px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            disabled={approveMutation.isPending}
                            onClick={() => handleAction(item.id, 'REJECTED')}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TenderDetailDrawer
        tender={drawerTender}
        isOpen={drawerTender !== null}
        onClose={() => setDrawerTender(null)}
        onApprove={() => {
          if (drawerTender) {
            handleAction(drawerTender.id, 'APPROVED');
            setDrawerTender(null);
          }
        }}
        onReject={() => {
          if (drawerTender) {
            handleAction(drawerTender.id, 'REJECTED');
            setDrawerTender(null);
          }
        }}
      />
    </div>
  );
};

export default TenderArchive;
