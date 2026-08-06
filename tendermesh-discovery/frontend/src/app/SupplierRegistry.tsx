import React, { useState } from 'react';
import {
  useSuppliers,
  useAddSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useTestSupplier,
  useUpdateGlobalEndpoint
} from '../features/settings/useSettings';
import { Button, Icons, Skeleton, Badge } from '../components/ui';
import type { SupplierMachine } from '../types/tender';

const SupplierRegistry: React.FC = () => {
  const { data: suppliers, isLoading } = useSuppliers();
  const addSupplier = useAddSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const testSupplier = useTestSupplier();
  const updateGlobal = useUpdateGlobalEndpoint();

  const [globalEndpoint, setGlobalEndpoint] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<SupplierMachine>>({});
  
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  const handleEdit = (supplier: SupplierMachine) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      endpoint: supplier.endpoint,
      api_key: supplier.api_key,
      categories: supplier.categories,
      regions: supplier.regions,
      is_active: supplier.is_active
    });
  };

  const formatEndpoint = (val: string) => {
    if (!val) return val;
    val = val.trim();
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      const hasPort = val.includes(':');
      const base = hasPort ? val : `${val}:8000`;
      const hasPath = base.includes('/');
      return `http://${base}${hasPath ? '' : '/tenders/receive'}`;
    }
    return val;
  };

  const handleSave = () => {
    const formattedData = {
      ...form,
      endpoint: form.endpoint ? formatEndpoint(form.endpoint) : form.endpoint
    };
    if (editingId === 'new') {
      addSupplier.mutate(formattedData, {
        onSuccess: () => {
          setEditingId(null);
          setForm({});
        }
      });
    } else if (editingId) {
      updateSupplier.mutate({ id: editingId, data: formattedData }, {
        onSuccess: () => {
          setEditingId(null);
          setForm({});
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplier.mutate(id);
    }
  };

  const handleTest = (id: string) => {
    testSupplier.mutate(id, {
      onSuccess: (result) => {
        setTestResults(prev => ({ ...prev, [id]: result }));
      },
      onError: (err) => {
        setTestResults(prev => ({ ...prev, [id]: { success: false, error: err.message } }));
      }
    });
  };

  const handleGlobalUpdate = () => {
    if (globalEndpoint) {
      updateGlobal.mutate(formatEndpoint(globalEndpoint));
    }
  };

  return (
    <section className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 mt-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/5">
          <Icons.Settings className="h-4 w-4 text-indigo-300" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Supplier Machines (A2A)</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Manage target agent endpoints for tender dispatch.
          </p>
        </div>
      </div>
      

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {suppliers?.map(supplier => (
            <div key={supplier.id} className="p-4 rounded-xl border border-white/10 bg-black/20 flex flex-col gap-3">
              {editingId === supplier.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" className="tm-input" placeholder="Name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                    <input type="text" className="tm-input" placeholder="Endpoint URL" value={form.endpoint || ''} onChange={e => setForm({...form, endpoint: e.target.value})} />
                  </div>
                  <input type="password" className="tm-input w-full" placeholder="API Key" value={form.api_key || ''} onChange={e => setForm({...form, api_key: e.target.value})} />
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm({...form, is_active: e.target.checked})} className="rounded border-slate-600 bg-slate-800" />
                      Active
                    </label>
                    <div className="flex-1" />
                    <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} loading={updateSupplier.isPending}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{supplier.name}</span>
                      <Badge variant={supplier.is_active ? 'success' : 'neutral'}>{supplier.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">{supplier.endpoint}</div>
                    
                    {testResults[supplier.id] && (
                      <div className={`text-[10px] mt-2 font-bold ${testResults[supplier.id].success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {testResults[supplier.id].success ? 'Connection successful' : `Connection failed: ${testResults[supplier.id].error}`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => handleTest(supplier.id)} loading={testSupplier.isPending}>Test</Button>
                    <Button variant="secondary" onClick={() => handleEdit(supplier)}>Edit</Button>
                    <Button variant="danger" onClick={() => handleDelete(supplier.id)}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editingId === 'new' ? (
             <div className="p-4 rounded-xl border border-cyan-400/30 bg-cyan-400/5 space-y-3">
               <div className="grid grid-cols-2 gap-3">
                 <input type="text" className="tm-input" placeholder="Name (e.g. Acme IT)" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                 <input type="text" className="tm-input" placeholder="Endpoint URL" value={form.endpoint || ''} onChange={e => setForm({...form, endpoint: e.target.value})} />
               </div>
               <input type="text" className="tm-input w-full" placeholder="API Key" value={form.api_key || ''} onChange={e => setForm({...form, api_key: e.target.value})} />
               <div className="flex justify-end gap-2 mt-2">
                 <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                 <Button variant="primary" onClick={handleSave} loading={addSupplier.isPending}>Add Supplier</Button>
               </div>
             </div>
          ) : (
            <Button 
              variant="secondary" 
              className="w-full py-3 border-dashed border-white/20 hover:border-white/40"
              onClick={() => { setEditingId('new'); setForm({ is_active: true }); }}
            >
              + Add Supplier Machine
            </Button>
          )}
        </div>
      )}
    </section>
  );
};

export default SupplierRegistry;
