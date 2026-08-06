// ─── Profile: User Profile & Dashboard Security Settings ───

import React, { useState, useEffect } from 'react';
import { Button, Icons } from '../components/ui';
import { useToast } from '../components/ui/Toast';

export interface UserProfileData {
  name: string;
  username: string;
  email: string;
  role: string;
  password: string;
  securityEnabled: boolean;
}

const DEFAULT_PROFILE: UserProfileData = {
  name: 'Admin User',
  username: 'admin',
  email: 'admin@tendermesh.io',
  role: 'Procurement Specialist',
  password: 'admin',
  securityEnabled: true,
};

export function getStoredUserProfile(): UserProfileData {
  try {
    const data = localStorage.getItem('tendermesh_user_profile');
    if (data) return JSON.parse(data);
  } catch {
    // fallback
  }
  return DEFAULT_PROFILE;
}

export function saveStoredUserProfile(profile: UserProfileData): void {
  localStorage.setItem('tendermesh_user_profile', JSON.stringify(profile));
}

export const Profile: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [profile, setProfile] = useState<UserProfileData>(DEFAULT_PROFILE);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    setProfile(getStoredUserProfile());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (profile.password.trim().length < 4) {
      error("Password must be at least 4 characters long.");
      return;
    }

    if (profile.username.trim().length < 3) {
      error("Username must be at least 3 characters long.");
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      saveStoredUserProfile(profile);
      setIsSaving(false);
      success("Profile & Security credentials updated successfully!");
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="tm-surface p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-blue-700">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white font-bold text-2xl flex items-center justify-center shadow-md">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{profile.role} • {profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                @{profile.username}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${profile.securityEnabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600'}`}>
                {profile.securityEnabled ? '🔒 Login Protection Active' : '🔓 Protection Disabled'}
              </span>
            </div>
          </div>
        </div>

        {onLogout && (
          <Button
            variant="secondary"
            onClick={onLogout}
            className="text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-4 py-2"
          >
            Log Out
          </Button>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* User Information Card */}
        <div className="tm-surface p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">User Account Information</h2>
            <p className="text-xs text-slate-500 mt-1">Update your personal account details displayed across TenderMesh.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Role / Designation</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Dashboard Security & Credentials Card */}
        <div className="tm-surface p-6 md:p-8 space-y-6 border-t-2 border-t-blue-600">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dashboard Entrance Security</h2>
              <p className="text-xs text-slate-500 mt-1">Manage your login username, password, and entrance access protection.</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Require Login</span>
              <input
                type="checkbox"
                className="w-5 h-5 accent-blue-700 rounded cursor-pointer"
                checked={profile.securityEnabled}
                onChange={(e) => setProfile({ ...profile, securityEnabled: e.target.checked })}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={32}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              />
              <p className="text-[11px] text-slate-400 mt-1">Used to log into the TenderMesh dashboard (3-32 characters).</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  maxLength={64}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  value={profile.password}
                  onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Change your entrance password here (4-64 characters).</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={isSaving}
            className="rounded-xl px-8 py-3 bg-blue-900 hover:bg-blue-800 shadow-md font-bold text-sm"
          >
            Save Profile & Security Settings
          </Button>
        </div>

      </form>
    </div>
  );
};

export default Profile;
