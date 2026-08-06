// ─── LiveFeed: Scrolling SSE activity log ───

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { LiveEvent } from '../../types/tender';
import { connectLiveFeed } from '../../lib/sse';
import { Icons } from '../ui';

const MAX_EVENTS = 50;

const eventStyles: Record<string, { color: string; icon: React.ReactNode }> = {
  NEW_TENDER: { color: 'text-cyan-200', icon: <Icons.List className="h-4 w-4" /> },
  SCORE_UPDATED: { color: 'text-amber-200', icon: <Icons.Bolt className="h-4 w-4" /> },
  APPROVAL_CHANGED: { color: 'text-emerald-200', icon: <Icons.Seal className="h-4 w-4" /> },
  SCAN_STARTED: { color: 'text-sky-200', icon: <Icons.Orbit className="h-4 w-4" /> },
  SCAN_COMPLETED: { color: 'text-green-200', icon: <Icons.Check className="h-4 w-4" /> },
};

// Simple relative time helper
function getRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);

  if (secs < 15) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export const LiveFeed: React.FC = () => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // We keep a ref to access current isPaused in the SSE listener without re-binding it
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    setIsConnected(true);

    const disconnect = connectLiveFeed(
      (event) => {
        if (!isPausedRef.current) {
          setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
        }
      },
      () => {
        setIsConnected(false);
      },
    );

    return () => {
      disconnect();
      setIsConnected(false);
    };
  }, []);

  return (
    <section className="tm-surface overflow-hidden rounded-[24px]">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 bg-white/[0.01]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Live Activity</div>
          <h3 className="mt-1 text-sm font-bold text-slate-200 tracking-tight">Pipeline Signals</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Pause Button */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="tm-focus flex h-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-colors duration-200"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          
          <div className="flex items-center gap-1.5 bg-black/35 border border-white/5 px-2 py-1 rounded-full">
            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse-ring' : 'bg-red-400'}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-80 overflow-y-auto divide-y divide-white/5 bg-black/10">
        {events.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500 animate-fade-in" aria-live="polite">
            Waiting for live feed pipeline signals…
          </div>
        ) : (
          events.map((event) => {
            const style = eventStyles[event.type] ?? { icon: <Icons.Pin className="h-4 w-4" />, color: 'text-slate-300' };
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-white/[0.02] animate-slide-right"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 shadow-sm">
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed font-medium ${style.color}`}>{event.message}</p>
                  <p className="mt-1 text-[10px] text-slate-500 font-semibold">
                    {getRelativeTime(event.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default LiveFeed;

