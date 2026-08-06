// Discovery: Main tender exploration and processing view

import React, { useState } from 'react';
import { useTenders } from '../features/tenders/useTenders';
import { useTriggerScan } from '../features/tenders/useTriggerScan';
import { useApproveTender } from '../features/tenders/useApproveTender';
import { subscribeToSSEEvents } from '../lib/sse';
import { useEffect } from 'react';
import { Button, Icons } from '../components/ui';
import TenderDetailDrawer from '../components/discovery/TenderDetailDrawer';
import LiveScanLogs from '../components/discovery/LiveScanLogs';
import type { TenderWithDetails, TenderFilters } from '../types/tender';
import { useToast } from '../components/ui/Toast';

// Country-wise categories structure
const COUNTRY_CATEGORIES: Record<string, { flag: string; categories: string[] }> = {
  'Pakistan': {
    flag: '🇵🇰',
    categories: ['IT Equipment', 'IT Services', 'Software Development', 'Information Technology Services'],
  },
  'United States': {
    flag: '🇺🇸',
    categories: ['IT Equipment', 'IT Services', 'Software Development', 'Healthcare IT'],
  },
  'International': {
    flag: '🌍',
    categories: ['IT Services', 'Software Development'],
  },
  'European Union': {
    flag: '🇪🇺',
    categories: ['IT Services', 'Software Development', 'Tech Infrastructure'],
  },
  'Gulf Region': {
    flag: '🇦🇪🇸🇦',
    categories: ['IT Equipment', 'Software Development', 'Smart City'],
  },
};

// City list for Pakistan tenders (from .env SUPPLIER_REGIONS)
const PAKISTAN_CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar',
  'Quetta', 'Faisalabad', 'Multan', 'Gujranwala', 'Hyderabad',
  'Sukkur', 'Gilgit', 'Muzaffarabad',
];

const Discovery: React.FC = () => {
  const [filters, setFilters] = useState<TenderFilters>({ page: 1, per_page: 25, approval_status: 'PENDING' });
  const { data, isLoading, refetch } = useTenders(filters);
  const scanMutation = useTriggerScan();
  const approveMutation = useApproveTender();
  const { success, error } = useToast();

  const [drawerTender, setDrawerTender] = useState<TenderWithDetails | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [expandedCountry, setExpandedCountry] = useState<string | null>('Pakistan');
  const [scanTargetCountry, setScanTargetCountry] = useState<string>('Worldwide');

  useEffect(() => {
    const unsubscribe = subscribeToSSEEvents((event) => {
      if (event.type === 'DUPLICATE_TENDER') {
        success(`Duplicate skipped: A tender from ${event.source} is already in the database.`);
      } else if (event.type === 'SCAN_COMPLETED' || event.type === 'NEW_TENDER') {
        refetch();
      }
    });
    return unsubscribe;
  }, [success, refetch]);

  const tenders = data?.data ?? [];

  const handleApprove = (id: string) => {
    approveMutation.mutate({ tender_id: id, status: 'APPROVED' }, {
      onSuccess: () => {
        setDrawerTender(null);
        success("✓ Tender approved & dispatched to supplier. Moved to Archive.");
        refetch();
      },
      onError: () => {
        error("Failed to approve tender.");
      }
    });
  };

  const handleReject = (id: string) => {
    approveMutation.mutate({ tender_id: id, status: 'REJECTED' }, {
      onSuccess: () => {
        setDrawerTender(null);
        success("✕ Tender rejected. Moved to Archive.");
        refetch();
      },
      onError: () => {
        error("Failed to reject tender.");
      }
    });
  };

  const handleScan = () => {
    scanMutation.mutate({ targetCountry: scanTargetCountry }, {
      onSuccess: () => {
        setScanMessage(`Scan started for ${scanTargetCountry}! Checking websites for new tenders...`);
        setTimeout(() => setScanMessage(null), 10000);
        setTimeout(() => refetch(), 15000);
        setTimeout(() => refetch(), 30000);
      }
    });
  };

  const toggleCategory = (country: string, cat: string) => {
    const countryLocationMap: Record<string, string> = {
      'Pakistan': 'Pakistan',
      'United States': 'United States',
      'European Union': 'European Union',
      'Gulf Region': 'UAE',
      'International': 'International',
    };
    const targetLoc = countryLocationMap[country];

    setFilters(prev => {
      const isAlreadyActive = prev.category === cat && (prev.location === targetLoc || prev.location?.includes(targetLoc));
      return {
        ...prev,
        category: isAlreadyActive ? undefined : cat,
        location: isAlreadyActive ? undefined : targetLoc,
        page: 1,
      };
    });
  };

  const toggleLocation = (loc: string) => {
    setFilters(prev => ({ ...prev, location: prev.location === loc ? undefined : loc, page: 1 }));
  };

  const activeFilterCount = [filters.category, filters.location, filters.search].filter(Boolean).length;

  return (
    <div className="animate-slide-up flex flex-col gap-6 relative">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tender Discovery</h1>
          <p className="text-sm text-slate-500 mt-1">{data?.total ?? 0} tenders found {activeFilterCount > 0 && `(${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={scanTargetCountry}
            onChange={(e) => setScanTargetCountry(e.target.value)}
          >
            <option value="Worldwide">🌍 Worldwide (All)</option>
            <option value="Pakistan">🇵🇰 Pakistan</option>
            <option value="United States">🇺🇸 United States</option>
            <option value="Gulf Region">🇦🇪 UAE / Gulf</option>
            <option value="European Union">🇪🇺 European Union</option>
            <option value="International">🌐 International (World Bank, UN)</option>
          </select>
          <Button 
            variant="primary" 
            onClick={handleScan} 
            loading={scanMutation.isPending}
            className="rounded-full px-6 bg-blue-900 hover:bg-blue-800 shadow-sm"
          >
            Scan Sources
          </Button>
        </div>
      </div>

      {scanMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
             <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
             <span className="font-semibold text-sm">{scanMessage}</span>
          </div>
          <button onClick={() => setScanMessage(null)} className="text-blue-500 hover:text-blue-700">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
      )}

      <LiveScanLogs />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
        
        {/* Left side: List of Tenders */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="tm-surface p-6 h-40 tm-skeleton" />
              ))}
            </div>
          ) : tenders.length === 0 ? (
            <div className="tm-surface p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-700">No tenders found</h3>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters or click Scan Sources.</p>
              {activeFilterCount > 0 && (
                <button 
                  onClick={() => setFilters({ page: 1, per_page: 25 })}
                  className="mt-4 text-sm text-blue-600 font-semibold hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            tenders.map((tender, index) => (
              <div 
                key={tender.id} 
                onClick={() => setDrawerTender(tender)}
                className={`tm-surface p-5 md:p-6 flex flex-col gap-3 hover:shadow-lg transition-all animate-fade-in cursor-pointer border-l-4 ${tender.approval?.status === 'APPROVED' ? 'border-l-green-500' : tender.approval?.status === 'REJECTED' ? 'border-l-red-500' : 'border-l-blue-200'}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 line-clamp-1">{tender.title}</h3>
                    <div className="flex flex-wrap gap-2 items-center mt-1.5">
                      <span className="text-xs font-medium text-slate-500">
                        {tender.buying_org || tender.source}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">
                        📍 {tender.location || 'N/A'}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">
                        Due: {tender.deadline ? new Date(tender.deadline).toLocaleDateString() : 'N/A'}
                      </span>
                      {tender.category && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {tender.category}
                          </span>
                        </>
                      )}
                      {tender.approval?.status && tender.approval.status !== 'PENDING' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tender.approval.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {tender.approval.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 whitespace-nowrap shrink-0 shadow-sm">
                    {tender.score?.overall_score ? Math.round(tender.score.overall_score * 100) : 85}%
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <Button variant="secondary" className="text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5" onClick={() => setDrawerTender(tender)}>
                    Details
                  </Button>
                  <Button variant="secondary" className="text-xs bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-3 py-1.5" onClick={() => handleApprove(tender.id)} disabled={approveMutation.isPending}>
                    ✓ Approve
                  </Button>
                  <Button variant="secondary" className="text-xs bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-3 py-1.5" onClick={() => handleReject(tender.id)}>
                    ✕ Reject
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button 
                disabled={filters.page === 1}
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500 font-medium">
                Page {data.page} of {data.total_pages}
              </span>
              <button 
                disabled={(filters.page ?? 1) >= data.total_pages}
                onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right side: Country-wise Category Filters */}
        <aside className="space-y-6 xl:pl-6 xl:border-l border-slate-200">
          
          {/* Search */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">🔍 Search</h3>
            <div className="relative">
              <Icons.Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search titles, orgs..." 
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-shadow"
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              />
            </div>
          </div>

          {/* Country-wise Categories */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">🌐 Categories by Country</h3>
            <div className="space-y-3">
              {Object.entries(COUNTRY_CATEGORIES).map(([country, { flag, categories }]) => {
                const isExpanded = expandedCountry === country;
                return (
                  <div key={country} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all">
                    <button 
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedCountry(isExpanded ? null : country)}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-lg">{flag}</span>
                        <span className="font-semibold text-slate-800 text-sm">{country}</span>
                      </span>
                      <Icons.ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? '-rotate-90' : 'rotate-180'}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3 animate-fade-in">
                        {categories.map(cat => {
                          const isActive = filters.category === cat;
                          return (
                            <label 
                              key={cat} 
                              className="flex items-center gap-3 cursor-pointer group py-1"
                              onClick={() => toggleCategory(country, cat)}
                            >
                              <div className={`w-4.5 h-4.5 rounded border transition-all flex items-center justify-center ${isActive ? 'bg-blue-600 border-blue-600 shadow-sm' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                                {isActive && <Icons.Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className={`text-sm transition-colors ${isActive ? 'text-blue-900 font-semibold' : 'text-slate-600 group-hover:text-slate-800'}`}>{cat}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* City / Location Filter */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">📍 Location</h3>
            <div className="flex flex-wrap gap-2">
              {PAKISTAN_CITIES.map(city => {
                const isActive = filters.location === city;
                return (
                  <button
                    key={city}
                    onClick={() => toggleLocation(city)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                      isActive 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Clear All */}
          {activeFilterCount > 0 && (
            <button 
              onClick={() => { setFilters({ page: 1, per_page: 25 }); setExpandedCountry('Pakistan'); }}
              className="w-full py-2.5 text-sm text-red-500 font-semibold hover:text-red-700 border border-red-100 rounded-xl hover:bg-red-50 transition-all"
            >
              ✕ Clear All Filters ({activeFilterCount})
            </button>
          )}
          
        </aside>
      </div>

      <TenderDetailDrawer
        tender={drawerTender}
        isOpen={drawerTender !== null}
        onClose={() => setDrawerTender(null)}
        onApprove={() => { if(drawerTender) handleApprove(drawerTender.id) }}
        onReject={() => { if(drawerTender) handleReject(drawerTender.id) }}
      />
    </div>
  );
};

export default Discovery;
