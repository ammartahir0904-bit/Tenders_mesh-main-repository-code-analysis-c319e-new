// "?"?"? AdminDeliveries: Global delivery log dashboard "?"?"?

import React, { useState } from 'react';
import { useAdminDeliveries, useDeliveryStats } from '../features/tenders/useDeliveries';
import { Icons } from '../components/ui';

const AdminDeliveries: React.FC = () => {
  const [supplierFilter, setSupplierFilter] = useState('');
  const [deliveredFilter, setDeliveredFilter] = useState<string>('');

  const { data: stats } = useDeliveryStats();
  const { data: adminData, isLoading } = useAdminDeliveries({
    supplier_name: supplierFilter || undefined,
    delivered: deliveredFilter === '' ? undefined : deliveredFilter === 'true',
  });

  const deliveries = adminData?.data ?? [];
  const deliveryStats = adminData?.stats ?? stats;

  const total = deliveryStats?.total || 0;
  const success = deliveryStats?.delivered || 0;
  const failed = total - success;

  const displayDeliveries = deliveries.map(d => ({
    id: `TM-${d.id.substring(0,4).toUpperCase()}`,
    title: (d as any).tender_title || `Tender ${d.tender_id.substring(0,8)}`,
    supplier: d.supplier_name || 'Unknown',
    date: new Date(d.attempted_at).toLocaleDateString(),
    status: d.delivered ? 'Delivered' : 'Failed',
    error_message: d.error_message
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="tm-surface p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Icons.Deliveries className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Total Deliveries:</div>
            <div className="text-2xl font-bold text-slate-900">{total.toLocaleString()}</div>
          </div>
        </div>
        <div className="tm-surface p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Icons.Seal className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Successful Deliveries:</div>
            <div className="text-2xl font-bold text-slate-900">{success.toLocaleString()}</div>
          </div>
        </div>
        <div className="tm-surface p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <Icons.AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">Failed Deliveries:</div>
            <div className="text-2xl font-bold text-slate-900">{failed.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="tm-surface overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="relative w-72">
            <Icons.Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Deliveries..." 
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
              value={deliveredFilter}
              onChange={(e) => setDeliveredFilter(e.target.value)}
            >
              <option value="">Filter by Status</option>
              <option value="true">Delivered</option>
              <option value="false">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Tender ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Project Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Supplier</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">Loading deliveries...</td>
                </tr>
              ) : displayDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No deliveries found.</td>
                </tr>
              ) : (
                displayDeliveries.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">{item.id}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{item.title}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{item.supplier}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{item.date}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        {item.status === 'Delivered' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 w-fit">
                            {item.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 w-fit">
                            {item.status}
                          </span>
                        )}
                        {item.status === 'Failed' && item.error_message && (
                          <span className="text-[10px] text-red-500 font-medium">
                            {item.error_message}
                          </span>
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
    </div>
  );
};

export default AdminDeliveries;
