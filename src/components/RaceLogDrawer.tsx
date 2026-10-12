import React from 'react';
import { LogEntry } from '../types/game';
import { X, History, Trash2 } from 'lucide-react';

interface RaceLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const RaceLogDrawer: React.FC<RaceLogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[75dvh] sm:max-h-[80dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Grab Handle for mobile */}
        <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto my-2 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Race Telemetry Log</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClearLogs}
              title="Clear Logs"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log Entries */}
        <div className="p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] text-stone-300">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-stone-500 font-sans text-xs">
              No race telemetry recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              const isP1 = log.t.startsWith('P1');
              const isP2 = log.t.startsWith('P2');
              const isLap = log.t.includes('🏁');
              const isRound = log.t.includes('Round');

              return (
                <div
                  key={log.id}
                  className={`p-1.5 rounded border leading-tight ${
                    isLap
                      ? 'bg-amber-950/40 border-amber-600/40 text-amber-200 font-bold'
                      : isRound
                      ? 'bg-stone-950 border-stone-800 text-stone-400 font-sans italic text-center'
                      : isP1
                      ? 'bg-blue-950/30 border-blue-800/40 text-blue-200'
                      : isP2
                      ? 'bg-orange-950/30 border-orange-800/40 text-orange-200'
                      : 'bg-stone-950/50 border-stone-800/60 text-stone-300'
                  }`}
                >
                  {log.t}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-stone-800 shrink-0 bg-stone-950">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl font-bold text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
          >
            Close Log
          </button>
        </div>
      </div>
    </div>
  );
};
