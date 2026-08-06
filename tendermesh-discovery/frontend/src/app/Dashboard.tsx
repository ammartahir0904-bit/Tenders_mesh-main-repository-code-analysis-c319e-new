// "?"?"? Dashboard: Overview metrics & live feed "?"?"?

import React, { useMemo, useState } from 'react';
import { useTenders } from '../features/tenders/useTenders';
import { useApproveTender } from '../features/tenders/useApproveTender';
import TenderDetailDrawer from '../components/discovery/TenderDetailDrawer';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Icons } from '../components/ui';

const Dashboard: React.FC = () => {
  const { data, isLoading, refetch } = useTenders({ per_page: 50 });
  const [drawerTender, setDrawerTender] = useState<any>(null);
  const approveMutation = useApproveTender();

  const tenders = data?.data ?? [];
  
  // Realtime metric calculations
  const total = tenders.length;
  const totalValue = tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0);
  const aiMatches = tenders.filter(t => t.score?.recommendation === 'STRONG_YES' || t.score?.recommendation === 'YES').length;
  
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const deadlineAlerts = tenders.filter(t => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d >= now && d <= nextWeek;
  }).length;

  const metrics = [
    {
      label: 'Active Tenders',
      value: total,
      icon: <Icons.Dashboard className="w-6 h-6 text-white" />,
    },
    {
      label: 'Total Value',
      value: totalValue > 0 ? `Rs. ${(totalValue / 1000000).toFixed(1)}M PKR` : 'Cost Not Mentioned',
      icon: <Icons.Deliveries className="w-6 h-6 text-white" />,
    },
    {
      label: 'AI Matches',
      value: aiMatches.toString(),
      icon: <Icons.Settings className="w-6 h-6 text-white" />, // Placeholder icon
    },
    {
      label: 'Deadline Alerts',
      value: deadlineAlerts.toString(),
      icon: <Icons.Bell className="w-6 h-6 text-white" />,
    },
  ];

  // Dynamic Pie Chart Data
  const pieData = useMemo(() => {
    const cats: Record<string, number> = {};
    tenders.forEach(t => {
      const c = t.category || 'Other';
      cats[c] = (cats[c] || 0) + 1;
    });
    const colors = ['#1e3a8a', '#3b82f6', '#93c5fd', '#e2e8f0', '#64748b'];
    return Object.entries(cats).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }));
  }, [tenders]);

  // Dynamic Bar Chart Data
  const barData = useMemo(() => {
    const statuses: Record<string, number> = { 'APPROVED': 0, 'REJECTED': 0, 'PENDING': 0 };
    tenders.forEach(t => {
      const s = t.approval?.status || 'PENDING';
      statuses[s] = (statuses[s] || 0) + 1;
    });
    return [
      { name: 'Approved', value: statuses['APPROVED'], color: '#22c55e' },
      { name: 'Rejected', value: statuses['REJECTED'], color: '#ef4444' },
      { name: 'Pending', value: statuses['PENDING'], color: '#3b82f6' },
    ];
  }, [tenders]);

  const recentTenders = tenders.slice(0, 5);
  const displayRecent = recentTenders.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category || 'Other',
    deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : 'N/A',
    status: t.approval?.status || 'PENDING',
    rawTender: t
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tm-surface-soft p-5 rounded-[22px] space-y-3 h-24 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-8 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m) => (
          <div key={m.label} className="tm-surface p-5 flex items-center gap-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 shadow-sm shrink-0">
              {m.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Tenders by Category */}
        <div className="tm-surface p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Tenders by Category</h3>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData.length > 0 ? pieData : [{name: 'No Data', value: 1, color: '#e2e8f0'}]} cx="50%" cy="50%" innerRadius={0} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                  {(pieData.length > 0 ? pieData : [{name: 'No Data', value: 1, color: '#e2e8f0'}]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Status Distribution */}
        <div className="tm-surface p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Tender Status Distribution</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(241,245,249,1)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent AI Recommendations Table */}
      <div className="tm-surface p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Recent Discoveries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tender Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Category</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Deadline</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRecent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No tenders discovered yet. Run a scan!</td>
                </tr>
              ) : (
                displayRecent.map((tender, i) => (
                  <tr key={tender.id} className="hover:bg-slate-50/50 transition-colors animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Icons.Dashboard className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-900 line-clamp-1">{tender.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{tender.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{tender.deadline}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tender.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        tender.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {tender.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setDrawerTender(tender.rawTender)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Actions {'>'}
                      </button>
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
            approveMutation.mutate({ tender_id: drawerTender.id, status: 'APPROVED' });
            setDrawerTender(null);
          }
        }}
        onReject={() => {
          if (drawerTender) {
            approveMutation.mutate({ tender_id: drawerTender.id, status: 'REJECTED' });
            setDrawerTender(null);
          }
        }}
      />
    </div>
  );
};

export default Dashboard;
