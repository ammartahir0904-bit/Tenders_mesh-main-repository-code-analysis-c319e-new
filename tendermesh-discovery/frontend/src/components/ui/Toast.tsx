import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { Icons } from './Icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const success = useCallback((msg: string, dur?: number) => toast(msg, 'success', dur), [toast]);
  const error = useCallback((msg: string, dur?: number) => toast(msg, 'error', dur), [toast]);
  const info = useCallback((msg: string, dur?: number) => toast(msg, 'info', dur), [toast]);
  const warning = useCallback((msg: string, dur?: number) => toast(msg, 'warning', dur), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const typeColors = {
  success: 'border-emerald-500/20 bg-[#071311]/95 text-emerald-300 shadow-glow-emerald',
  error: 'border-red-500/20 bg-[#160c0d]/95 text-red-300 shadow-glow-red',
  info: 'border-cyan-500/20 bg-[#071317]/95 text-cyan-300 shadow-glow-cyan',
  warning: 'border-amber-500/20 bg-[#151109]/95 text-amber-300 shadow-amber-500/10',
};

const ToastCard: React.FC<{ item: ToastItem; onClose: () => void }> = ({ item, onClose }) => {
  const { message, type } = item;

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg animate-slide-right',
        typeColors[type]
      )}
    >
      <span className="mt-0.5 shrink-0">
        {type === 'success' && <Icons.Check className="h-4.5 w-4.5 text-emerald-400" />}
        {type === 'error' && <Icons.AlertTriangle className="h-4.5 w-4.5 text-red-400" />}
        {type === 'info' && <Icons.Orbit className="h-4.5 w-4.5 text-cyan-400" />}
        {type === 'warning' && <Icons.AlertTriangle className="h-4.5 w-4.5 text-amber-400" />}
      </span>
      <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
      <button
        onClick={onClose}
        className="text-slate-500 hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <Icons.X className="h-4 w-4" />
      </button>
    </div>
  );
};
