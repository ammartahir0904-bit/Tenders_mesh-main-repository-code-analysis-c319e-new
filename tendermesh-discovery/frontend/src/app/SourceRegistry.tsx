import React, { useState } from 'react';
import {
  useSources,
  useAddSource,
  useUpdateSource,
  useDeleteSource
} from '../features/settings/useSettings';
import { Button, Icons, Skeleton, Badge } from '../components/ui';
import type { TenderSource } from '../types/tender';

const SourceRegistry: React.FC = () => {
  const { data: sources, isLoading } = useSources();
  const addSource = useAddSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TenderSource>>({});

  const handleEdit = (source: TenderSource) => {
    setEditingId(source.id);
    setForm({
      name: source.name,
      label: source.label,
      region: source.region,
      urls: source.urls,
      enabled: source.enabled,
      parser_type: source.parser_type,
      use_playwright: source.use_playwright
    });
  };

  const handleSave = () => {
    if (editingId === 'new') {
      addSource.mutate(form, {
        onSuccess: () => {
          setEditingId(null);
          setForm({});
        }
      });
    } else if (editingId) {
      updateSource.mutate({ id: editingId, data: form }, {
        onSuccess: () => {
          setEditingId(null);
          setForm({});
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this source?')) {
      deleteSource.mutate(id);
    }
  };

  const handleUrlChange = (val: string) => {
    setForm({ ...form, urls: val.split(',').map(s => s.trim()).filter(Boolean) });
  };

  return (
    <section className="rounded-[20px] border bg-white border-slate-200 shadow-sm p-6 mt-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50">
          <Icons.Discovery className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Tender Sources</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Manage target websites for the AI agent to scrape.
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
          {sources?.map(source => (
            <div key={source.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-3">
              {editingId === source.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" className="tm-input" placeholder="System Name (e.g. CUSTOM_GOV)" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                    <input type="text" className="tm-input" placeholder="Display Label" value={form.label || ''} onChange={e => setForm({...form, label: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select className="tm-input" value={form.region || 'PAKISTAN_FEDERAL'} onChange={e => setForm({...form, region: e.target.value as any})}>
                      <option value="PAKISTAN_FEDERAL">Pakistan Federal</option>
                      <option value="PAKISTAN_PROVINCIAL">Pakistan Provincial</option>
                      <option value="INTERNATIONAL">International</option>
                    </select>
                    <select className="tm-input" value={form.parser_type || 'ai'} onChange={e => setForm({...form, parser_type: e.target.value as any})}>
                      <option value="ai">Generic AI Parser</option>
                      <option value="ppra_ai">PPRA Specialized Parser</option>
                    </select>
                  </div>
                  <input type="text" className="tm-input w-full" placeholder="URLs (comma separated)" value={form.urls?.join(', ') || ''} onChange={e => handleUrlChange(e.target.value)} />
                  <div className="flex items-center gap-4 mt-2">
                    <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.enabled ?? true} onChange={e => setForm({...form, enabled: e.target.checked})} className="rounded border-slate-300 bg-white" />
                      Enabled
                    </label>
                    <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.use_playwright ?? true} onChange={e => setForm({...form, use_playwright: e.target.checked})} className="rounded border-slate-300 bg-white" />
                      Use Playwright (Headless Browser)
                    </label>
                    <div className="flex-1" />
                    <Button className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none shadow-none" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} loading={updateSource.isPending}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{source.label}</span>
                      <Badge variant={source.enabled ? 'success' : 'neutral'}>{source.enabled ? 'Enabled' : 'Disabled'}</Badge>
                      <Badge variant="info">{source.region}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate max-w-lg">
                      {source.urls?.join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none shadow-none" onClick={() => handleEdit(source)}>Edit</Button>
                    <Button className="bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none" onClick={() => handleDelete(source.id)}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {editingId === 'new' ? (
             <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 space-y-3">
               <div className="grid grid-cols-2 gap-3">
                 <input type="text" className="tm-input" placeholder="System Name (e.g. CUSTOM_GOV)" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                 <input type="text" className="tm-input" placeholder="Display Label" value={form.label || ''} onChange={e => setForm({...form, label: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <select className="tm-input" value={form.region || 'PAKISTAN_FEDERAL'} onChange={e => setForm({...form, region: e.target.value as any})}>
                   <option value="PAKISTAN_FEDERAL">Pakistan Federal</option>
                   <option value="PAKISTAN_PROVINCIAL">Pakistan Provincial</option>
                   <option value="INTERNATIONAL">International</option>
                 </select>
                 <select className="tm-input" value={form.parser_type || 'ai'} onChange={e => setForm({...form, parser_type: e.target.value as any})}>
                   <option value="ai">Generic AI Parser</option>
                   <option value="ppra_ai">PPRA Specialized Parser</option>
                 </select>
               </div>
               <input type="text" className="tm-input w-full" placeholder="URLs (comma separated)" value={form.urls?.join(', ') || ''} onChange={e => handleUrlChange(e.target.value)} />
               <div className="flex items-center gap-4 mt-2">
                 <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={form.enabled ?? true} onChange={e => setForm({...form, enabled: e.target.checked})} className="rounded border-slate-300 bg-white" />
                   Enabled
                 </label>
                 <label className="text-xs text-slate-600 flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={form.use_playwright ?? true} onChange={e => setForm({...form, use_playwright: e.target.checked})} className="rounded border-slate-300 bg-white" />
                   Use Playwright (Headless Browser)
                 </label>
                 <div className="flex-1" />
                 <Button className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none shadow-none" onClick={() => setEditingId(null)}>Cancel</Button>
                 <Button variant="primary" onClick={handleSave} loading={addSource.isPending}>Add Source</Button>
               </div>
             </div>
          ) : (
            <Button 
              className="w-full py-3 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50 text-slate-600 shadow-none"
              onClick={() => {
                setEditingId('new'); 
                setForm({ 
                  enabled: true, 
                  use_playwright: true,
                  region: 'PAKISTAN_FEDERAL',
                  parser_type: 'ai',
                  urls: []
                }); 
              }}
            >
              + Add Tender Source
            </Button>
          )}
        </div>
      )}
    </section>
  );
};

export default SourceRegistry;


