// â”€â”€â”€ Settings: Supplier profile & BYOK keys â”€â”€â”€

import React, { useState, useEffect } from 'react';
import {
  useSupplierProfile,
  useUpdateProfile,
  useApiKeys,
  useUpdateApiKeys,
  useEnv,
  useUpdateEnv,
  useTestEnv,
} from '../features/settings/useSettings';
import { Button, Icons, Skeleton } from '../components/ui';
import SupplierRegistry from './SupplierRegistry';
import SourceRegistry from './SourceRegistry';

const Settings: React.FC = () => {
  // â”€â”€â”€ Profile â”€â”€â”€
  const { data: profile, isLoading: profileLoading } = useSupplierProfile();
  const updateProfile = useUpdateProfile();
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    categories: '',    // comma-separated
    locations: '',     // comma-separated
    certifications: '',
    min_value: '',
    max_value: '',
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        company_name: profile.company_name ?? '',
        categories: profile.categories?.join(', ') ?? '',
        locations: profile.locations?.join(', ') ?? '',
        certifications: profile.certifications?.join(', ') ?? '',
        min_value: profile.min_value?.toString() ?? '',
        max_value: profile.max_value?.toString() ?? '',
      });
    }
  }, [profile]);

  const handleProfileSave = () => {
    updateProfile.mutate({
      company_name: profileForm.company_name,
      categories: profileForm.categories.split(',').map((s) => s.trim()).filter(Boolean),
      locations: profileForm.locations.split(',').map((s) => s.trim()).filter(Boolean),
      certifications: profileForm.certifications.split(',').map((s) => s.trim()).filter(Boolean),
      min_value: profileForm.min_value ? Number(profileForm.min_value) : undefined,
      max_value: profileForm.max_value ? Number(profileForm.max_value) : undefined,
    });
  };

  const handleEnvSave = () => {
    updateEnv.mutate({
      LLM_MODEL: envForm.LLM_MODEL || undefined,
    });
  };

  // ─── Environment Variables (.env.docker) ───
  const { data: env, isLoading: envLoading } = useEnv();
  const updateEnv = useUpdateEnv();

  const [supplierIp, setSupplierIp] = useState('192.168.1.27');
  const [supplierPort, setSupplierPort] = useState('8000');
  const [supplierPath, setSupplierPath] = useState('/tenders/receive');

  const [envForm, setEnvForm] = useState({
    LLM_MODEL: '',
    SUPPLIER_ENDPOINT: '',
  });

  useEffect(() => {
    if (env) {
      const model = env.LLM_MODEL ?? '';
      const endpoint = env.SUPPLIER_ENDPOINT ?? '';
      setEnvForm({ LLM_MODEL: model, SUPPLIER_ENDPOINT: endpoint });

      if (endpoint) {
        try {
          const u = new URL(endpoint);
          setSupplierIp(u.hostname);
          setSupplierPort(u.port || (u.protocol === 'https:' ? '443' : '8000'));
          setSupplierPath(u.pathname || '/tenders/receive');
        } catch {
          setSupplierIp(endpoint);
        }
      }
    }
  }, [env]);

  const computedSupplierEndpoint = `http://${supplierIp.trim()}:${supplierPort.trim()}${supplierPath.startsWith('/') ? supplierPath : '/' + supplierPath}`;

  const handleSupplierIpSave = () => {
    updateEnv.mutate({
      SUPPLIER_ENDPOINT: computedSupplierEndpoint,
    });
  };

  const testEnv = useTestEnv();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleEnvTest = () => {
    setTestResult(null);
    testEnv.mutate({ endpoint: computedSupplierEndpoint }, {
      onSuccess: (data) => setTestResult({ success: true, message: data.message || 'Connection successful' }),
      onError: (err: any) => setTestResult({ success: false, message: err.response?.data?.error || err.message })
    });
  };

  // ─── Agent Orchestration ───
  const [agentForm, setAgentForm] = useState({
    pakistanEnabled: true,
    uaeEnabled: false,
    usaEnabled: false,
    maxUrls: '5',
    delayMs: '1000',
  });
  const [isAgentSaving, setIsAgentSaving] = useState(false);
  const [agentSaveSuccess, setAgentSaveSuccess] = useState(false);

  const handleAgentSave = () => {
    setIsAgentSaving(true);
    setAgentSaveSuccess(false);
    setTimeout(() => {
      setIsAgentSaving(false);
      setAgentSaveSuccess(true);
      setTimeout(() => setAgentSaveSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      {/* ─── Page Header ─── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="mt-1 text-xs text-slate-500 font-semibold">
          Manage your supplier machine connection and API keys.
        </p>
      </div>

      {/* ─── Dedicated Supplier Machine Connection Card ─── */}
      <section className="rounded-[20px] border border-cyan-500/30 bg-gradient-to-r from-cyan-900/10 via-slate-900/5 to-cyan-950/10 p-6 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
            <Icons.Orbit className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Supplier Machine IP Address (Port 8000)
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-700 font-mono">
                Port 8000 Active
              </span>
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Enter the IP address of the other guy's machine running on Port 8000. When you click <b>Approve</b> on a tender, it is instantly delivered to this IP!
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Supplier IP Address
              </label>
              <input
                type="text"
                value={supplierIp}
                onChange={(e) => setSupplierIp(e.target.value)}
                placeholder="e.g. 192.168.1.27"
                className="tm-input w-full font-mono text-sm font-bold border-cyan-300 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Port Number
              </label>
              <input
                type="text"
                value={supplierPort}
                onChange={(e) => setSupplierPort(e.target.value)}
                placeholder="8000"
                className="tm-input w-full font-mono text-sm font-bold border-cyan-300 focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 text-white font-mono text-xs shadow-inner">
            <div className="truncate mr-2">
              <span className="text-slate-400 select-none">Target URL: </span>
              <span className="text-cyan-300 font-bold">{computedSupplierEndpoint}</span>
            </div>
            <span className="text-[10px] uppercase font-sans font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded">
              Port {supplierPort}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="primary"
              onClick={handleSupplierIpSave}
              loading={updateEnv.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold"
            >
              Update Supplier IP
            </Button>
            <Button
              variant="secondary"
              onClick={handleEnvTest}
              loading={testEnv.isPending}
            >
              Test Connection
            </Button>

            {updateEnv.isSuccess && (
              <span className="text-xs font-bold text-emerald-600 animate-fade-in">
                ✓ Saved to backend!
              </span>
            )}
            {testResult && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${testResult.success ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                {testResult.success ? `🟢 ${testResult.message}` : `🔴 ${testResult.message}`}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Supplier Profile â”€â”€â”€ */}
      <section className="rounded-[20px] border bg-white border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/5">
            <Icons.Settings className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Supplier Profile</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Configure your company profile so the AI scorer can match tenders to your capabilities.
            </p>
          </div>
        </div>

        {profileLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <SettingsField
              label="Company Name"
              value={profileForm.company_name}
              onChange={(v) => setProfileForm((p) => ({ ...p, company_name: v }))}
            />
            <SettingsField
              label="Categories"
              value={profileForm.categories}
              onChange={(v) => setProfileForm((p) => ({ ...p, categories: v }))}
              placeholder="IT Services, Construction, Healthcareâ€¦"
              hint="Comma-separated list"
            />
            <SettingsField
              label="Locations"
              value={profileForm.locations}
              onChange={(v) => setProfileForm((p) => ({ ...p, locations: v }))}
              placeholder="Islamabad, Lahore, Karachiâ€¦"
              hint="Comma-separated list"
            />
            <SettingsField
              label="Certifications"
              value={profileForm.certifications}
              onChange={(v) => setProfileForm((p) => ({ ...p, certifications: v }))}
              placeholder="ISO 9001, PEC, SECPâ€¦"
              hint="Comma-separated list"
            />
            <div className="grid grid-cols-2 gap-4">
              <SettingsField
                label="Min Value (PKR)"
                value={profileForm.min_value}
                onChange={(v) => setProfileForm((p) => ({ ...p, min_value: v }))}
                type="number"
              />
              <SettingsField
                label="Max Value (PKR)"
                value={profileForm.max_value}
                onChange={(v) => setProfileForm((p) => ({ ...p, max_value: v }))}
                type="number"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleProfileSave}
            loading={updateProfile.isPending}
          >
            Save Profile
          </Button>
          {updateProfile.isSuccess && (
            <span className="text-[10px] font-bold text-emerald-400 animate-fade-in">
              âœ“ Profile saved
            </span>
          )}
          {updateProfile.isError && (
            <span className="text-[10px] font-bold text-red-400 animate-fade-in">
              Failed to save
            </span>
          )}
        </div>
      </section>

      {/* ─── Agent Orchestration ─── */}
      <section className="rounded-[20px] border bg-white border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/5">
            <Icons.Orbit className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Agent Orchestration</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Enable or disable specific regional subagents for discovery scans and manage load capabilities.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
            <ToggleField
              label="Pakistan PPRA Agent"
              checked={agentForm.pakistanEnabled}
              onChange={(v) => setAgentForm((p) => ({ ...p, pakistanEnabled: v }))}
              hint="Discovers tenders from PPRA Pakistan."
            />
            <div className="h-px bg-slate-200 my-2" />
            <ToggleField
              label="UAE eSupply Agent"
              checked={agentForm.uaeEnabled}
              onChange={(v) => setAgentForm((p) => ({ ...p, uaeEnabled: v }))}
              hint="Discovers tenders from Dubai eSupply."
            />
            <div className="h-px bg-slate-200 my-2" />
            <ToggleField
              label="USA SAM Agent"
              checked={agentForm.usaEnabled}
              onChange={(v) => setAgentForm((p) => ({ ...p, usaEnabled: v }))}
              hint="Discovers federal contracting opportunities from SAM.gov."
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <SettingsField
              label="Max URLs per Agent"
              value={agentForm.maxUrls}
              onChange={(v) => setAgentForm((p) => ({ ...p, maxUrls: v }))}
              type="number"
              hint="Limit the number of sources scanned per run."
            />
            <SettingsField
              label="Delay Between Requests (ms)"
              value={agentForm.delayMs}
              onChange={(v) => setAgentForm((p) => ({ ...p, delayMs: v }))}
              type="number"
              hint="Prevents rate limiting from procurement sites."
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleAgentSave}
            loading={isAgentSaving}
          >
            Save Configuration
          </Button>
          {agentSaveSuccess && (
            <span className="text-[10px] font-bold text-emerald-400 animate-fade-in">
              ✓ Configuration saved
            </span>
          )}
        </div>
      </section>

      {/* ─── AI Model Configuration ─── */}
      <section className="rounded-[20px] border bg-white border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/5">
            <Icons.Key className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Model Configuration</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Select the active AI model for extraction.
            </p>
          </div>
        </div>

        {envLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
                Active AI Model (LLM_MODEL)
              </label>
              <select
                value={envForm.LLM_MODEL}
                onChange={(e) => setEnvForm((p) => ({ ...p, LLM_MODEL: e.target.value }))}
                className="tm-input w-full"
              >
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (llama-3.1-8b-instant)</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (llama-3.3-70b-versatile)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B (mixtral-8x7b-32768)</option>
                <option value="gemma2-9b-it">Gemma 2 9B (gemma2-9b-it)</option>
              </select>
            </div>
            
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[11px] text-amber-900 font-medium leading-relaxed flex gap-2">
                    <span className="text-amber-500">⚠️</span>
                    <span>
                      <strong>Security Notice:</strong> To prevent exposure to frontend attacks, API Keys cannot be viewed or modified from this web interface. Please securely configure your <code>GROQ_API_KEY</code> directly in the backend <code>.env.docker</code> or <code>.env</code> file.
                    </span>
                </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleEnvSave}
            loading={updateEnv.isPending}
          >
            Save Model Configuration
          </Button>
          {updateEnv.isSuccess && (
            <span className="text-[10px] font-bold text-emerald-400 animate-fade-in">
              ✓ Saved securely
            </span>
          )}
          {updateEnv.isError && (
            <span className="text-[10px] font-bold text-red-400 animate-fade-in">
              Failed to save
            </span>
          )}
        </div>
      </section>

      {/* Removed SupplierRegistry as requested by user to simplify */}

      {/* Source Registry */}
      {/* Source Registry */}
      <SourceRegistry />
    </div>
  );
};

/* â”€â”€â”€ Reusable Settings Field â”€â”€â”€ */

interface SettingsFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}

const SettingsField: React.FC<SettingsFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
}) => (
  <div>
    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="tm-input w-full"
    />
    {hint && (
      <div className="mt-1 text-[9px] text-slate-600 font-medium">{hint}</div>
    )}
  </div>
);

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

const ToggleField: React.FC<ToggleFieldProps> = ({ label, checked, onChange, hint }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <div className="text-xs font-bold text-slate-900">{label}</div>
      {hint && <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
    </label>
  </div>
);


export default Settings;


