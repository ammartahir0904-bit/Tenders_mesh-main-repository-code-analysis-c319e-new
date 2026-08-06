import React, { useEffect, useState, useRef } from 'react';
import { subscribeToSSEEvents } from '../../lib/sse';
import type { LiveEvent } from '../../types/tender';
import { Icons, Button } from '../ui';

const LiveScanLogs: React.FC = () => {
  const [logs, setLogs] = useState<LiveEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSSEEvents((event) => {
      // Only keep events that are relevant to scanning
      if (
        event.type === 'SCAN_STARTED' ||
        event.type === 'SCAN_INFO' ||
        event.type === 'SCAN_ERROR' ||
        event.type === 'SCAN_COMPLETED' ||
        event.type === 'DUPLICATE_TENDER'
      ) {
        setLogs((prev) => [...prev.slice(-199), event]); // Keep last 200 logs to avoid memory issues
        if (!isExpanded && event.type === 'SCAN_STARTED') {
           setIsExpanded(true); // Auto-expand when a scan starts
        }
      }
    });
    return unsubscribe;
  }, [isExpanded]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const clearLogs = () => setLogs([]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'SCAN_ERROR':
        return 'text-red-400';
      case 'SCAN_COMPLETED':
        return 'text-green-400';
      case 'DUPLICATE_TENDER':
        return 'text-yellow-400';
      case 'SCAN_STARTED':
        return 'text-blue-400';
      case 'SCAN_INFO':
      default:
        return 'text-slate-300';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'SCAN_ERROR': return '❌';
      case 'SCAN_COMPLETED': return '✅';
      case 'DUPLICATE_TENDER': return '⚠️';
      case 'SCAN_STARTED': return '🚀';
      case 'SCAN_INFO': return 'ℹ️';
      default: return '➡️';
    }
  };

  if (!isExpanded && logs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shadow-lg mb-6 animate-fade-in font-mono text-sm">
      <div 
        className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icons.Terminal className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-200">Live Agent Logs</span>
          {logs.length > 0 && (
            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full border border-slate-700">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && isExpanded && (
            <button 
              onClick={(e) => { e.stopPropagation(); clearLogs(); }}
              className="text-slate-400 hover:text-white text-xs mr-2 transition-colors"
            >
              Clear
            </button>
          )}
          <Icons.ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      {isExpanded && (
        <div 
          ref={scrollRef}
          className="p-4 max-h-80 overflow-y-auto bg-slate-900 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        >
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-4 italic">
              Waiting for agent activity...
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id || Math.random().toString()} className="flex items-start gap-2 break-words">
                  <span className="text-slate-500 shrink-0 select-none">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="shrink-0 select-none">{getLogIcon(log.type)}</span>
                  <span className={`${getLogColor(log.type)}`}>
                    {log.source && <span className="font-bold">[{log.source}] </span>}
                    {log.message}
                    {log.error && <span className="block text-red-500 mt-0.5 whitespace-pre-wrap">{log.error}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveScanLogs;
