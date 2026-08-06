// ─── Layout: Sidebar, topbar, entrance security, main container ───

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Dashboard from './Dashboard';
import Discovery from './Discovery';
import AdminDeliveries from './AdminDeliveries';
import TenderArchive from './TenderArchive';
import Settings from './Settings';
import Profile, { getStoredUserProfile } from './Profile';
import { Icons, Button } from '../components/ui';

const routes: Record<string, React.FC<any>> = {
  dashboard: Dashboard,
  discovery: Discovery,
  deliveries: AdminDeliveries,
  archive: TenderArchive,
  settings: Settings,
  profile: Profile,
};

const Layout: React.FC = () => {
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication State
  const [userProfile, setUserProfile] = useState(getStoredUserProfile());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('tendermesh_session_active') === 'true';
  });

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Refresh user profile settings periodically or when active route changes
    setUserProfile(getStoredUserProfile());
  }, [activeRoute]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = getStoredUserProfile();

    if (
      loginUsername.trim() === stored.username.trim() &&
      loginPassword === stored.password
    ) {
      sessionStorage.setItem('tendermesh_session_active', 'true');
      setIsAuthenticated(true);
      setLoginError(null);
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Invalid Username or Password. Please try again.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tendermesh_session_active');
    setIsAuthenticated(false);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError(null);
    setActiveRoute('dashboard');
  };

  const getRouteTitle = (route: string) => {
    switch (route) {
      case 'dashboard': return 'Dashboard';
      case 'discovery': return 'Tender Discovery';
      case 'deliveries': return 'Deliveries';
      case 'archive': return 'Tender Archive';
      case 'settings': return 'Settings';
      case 'profile': return 'User Profile';
      default: return 'TenderMesh';
    }
  };

  // If Entrance Security is enabled and user is not logged in, render Entrance Login Screen
  if (userProfile.securityEnabled && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 border border-slate-200 animate-fade-in">
          
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-bold text-2xl shadow-lg">
              T
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TenderMesh Access</h1>
            <p className="text-xs text-slate-500">Enter your security credentials to access the dashboard</p>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={32}
                autoComplete="off"
                placeholder="Enter username"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={4}
                maxLength={64}
                autoComplete="new-password"
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 bg-blue-900 hover:bg-blue-800 rounded-xl font-bold text-sm shadow-md mt-2"
            >
              Sign In to Dashboard
            </Button>
          </form>

        </div>
      </div>
    );
  }

  const ActivePage = routes[activeRoute] ?? Dashboard;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      <Sidebar
        activeRoute={activeRoute}
        onNavigate={(route) => {
          setActiveRoute(route);
          setMobileMenuOpen(false);
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
      />

      <main
        className={`min-h-screen transition-all duration-300 w-full ${
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="md:hidden tm-focus relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Icons.Menu className="h-6 w-6" />
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{getRouteTitle(activeRoute)}</h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={() => setActiveRoute('profile')}
              title="User Profile"
              className={`tm-focus relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 ${
                activeRoute === 'profile' ? 'bg-blue-100 text-blue-900 ring-2 ring-blue-600' : 'text-blue-900 hover:bg-slate-100'
              }`}
              aria-label="Profile"
            >
              <Icons.User className="h-6 w-6" />
            </button>
            <button
              type="button"
              className="tm-focus relative flex h-10 w-10 items-center justify-center rounded-full text-blue-900 hover:bg-slate-100 transition-colors duration-200"
              aria-label="View notifications"
            >
              <Icons.Bell className="h-6 w-6" />
              <span className="absolute top-1 right-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 border-2 border-white" />
            </button>
          </div>
        </header>

        {/* Page Container with entry animation */}
        <div key={activeRoute} className="p-4 md:p-8 animate-slide-up max-w-[1600px] mx-auto overflow-x-hidden">
          {activeRoute === 'profile' ? (
            <Profile onLogout={handleLogout} />
          ) : (
            <ActivePage />
          )}
        </div>
      </main>
    </div>
  );
};

export default Layout;
