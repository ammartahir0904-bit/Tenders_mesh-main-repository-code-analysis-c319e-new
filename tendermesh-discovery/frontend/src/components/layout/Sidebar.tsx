// "?"?"? Sidebar: Navigation sidebar "?"?"?

import React from 'react';
import { Icons } from '../ui';
import { useTenders } from '../../features/tenders/useTenders';

interface SidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  mobileOpen = false,
}) => {
  // Query counts for badges
  const { data } = useTenders({ per_page: 1000 });
  const pendingCount = data?.data?.filter(
    (t) => !t.approval || t.approval.status === 'PENDING'
  ).length ?? 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <Icons.Dashboard className="w-5 h-5" />,
    },
    {
      id: 'discovery',
      label: 'Discovery',
      icon: <Icons.Discovery className="w-5 h-5" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: 'deliveries',
      label: 'My Tenders',
      icon: <Icons.Deliveries className="w-5 h-5" />,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <Icons.Seal className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Icons.Settings className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-full flex-col border-r border-slate-200 bg-white py-4 transition-transform duration-300 ${
        isCollapsed ? 'w-20 px-2' : 'w-64 px-4'
      } ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand Logo Container */}
      <div className={`py-4 transition-all duration-300 ${isCollapsed ? 'px-2 flex justify-center' : 'px-4'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 text-white shadow-sm">
            <span className="font-bold text-lg leading-none">T</span>
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in flex items-center">
              <h1 className="text-xl font-bold tracking-tight text-blue-900 leading-none">TenderMesh</h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 space-y-1.5 py-6">
        {navItems.map((item) => {
          const isActive = activeRoute === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`tm-focus relative flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all duration-200 group
                ${
                  isActive
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-900'
                }
                ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`}
            >
              {isActive && !isCollapsed && (
                <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-700" />
              )}
              <span
                className={`flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'text-blue-700'
                    : 'text-slate-500 group-hover:text-blue-700'
                }`}
              >
                {item.icon}
              </span>
              {!isCollapsed && <span className="animate-fade-in">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-bold text-blue-700">
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge && (
                <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </nav>
      
      {/* Footer Items like AI Assistant, Profile from Mockup */}
      <div className="space-y-1.5 border-t border-slate-100 pt-4">
        <button className={`tm-focus relative flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all duration-200 group text-slate-600 hover:bg-slate-50 hover:text-blue-900 ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`}>
           <span className="flex items-center justify-center text-slate-500 group-hover:text-blue-700">
             <Icons.Search className="w-5 h-5" />
           </span>
           {!isCollapsed && <span>AI Assistant</span>}
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          className={`tm-focus relative flex w-full items-center rounded-xl p-3 text-sm font-semibold transition-all duration-200 group text-slate-600 hover:bg-slate-50 hover:text-blue-900 ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`}
        >
           <span className="flex items-center justify-center text-slate-500 group-hover:text-blue-700">
             <Icons.User className="w-5 h-5" />
           </span>
           {!isCollapsed && <span>Profile</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="mt-4 pt-4 border-t border-slate-100 hidden md:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="tm-focus flex w-full items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors duration-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <Icons.ChevronRight className="h-4.5 w-4.5" />
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Icons.ChevronLeft className="h-4.5 w-4.5" />
              <span>Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
