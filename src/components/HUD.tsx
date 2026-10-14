import React from 'react';
import { GameOptions, GameState, TrackDefinition } from '../types/game';
import { getRoundSteps } from '../game/engine';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Settings,
  Sliders,
  History,
  Bot,
  User,
  Compass,
  ChevronDown,
} from 'lucide-react';

interface HUDProps {
  circuit: TrackDefinition;
  gameState: GameState;
  options: GameOptions;
  trackLength: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenEditor: () => void;
  onOpenLog: () => void;
  onOpenTrackSelector: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  circuit,
  gameState,
  options,
  trackLength,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenSettings,
  onOpenEditor,
  onOpenLog,
  onOpenTrackSelector,
}) => {
  const totalSteps = getRoundSteps(options, gameState.round);
  const players = [...gameState.P, ...gameState.extraBots];
  const leaderIdx = players.reduce(
    (leader, player, idx) => (player.pos > players[leader].pos ? idx : leader),
    0
  );
  const playerColors = [
    'bg-blue-600',
    'bg-orange-600',
    'bg-emerald-600',
    'bg-violet-600',
  ];
  const leaderColors = [
    'bg-blue-950/40 border-blue-500/50 text-blue-100 shadow-sm shadow-blue-900/20',
    'bg-orange-950/40 border-orange-500/50 text-orange-100 shadow-sm shadow-orange-900/20',
    'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 shadow-sm shadow-emerald-900/20',
    'bg-violet-950/40 border-violet-500/50 text-violet-100 shadow-sm shadow-violet-900/20',
  ];

  return (
    <header className="w-full shrink-0 flex flex-col border-b border-stone-800 bg-stone-950/80 backdrop-blur-md">
      {/* Top 1-row compact navigation */}
      <div className="flex items-center justify-between px-3 py-1.5 gap-2 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-extrabold tracking-tight text-white text-base">
              SLIPSTREAM
            </span>
            <span className="text-xs text-stone-400 font-mono hidden xs:inline">
              R{gameState.round}·S{gameState.step + 1}/{totalSteps}
            </span>
          </div>

          {/* Quick Track Selector Pill */}
          <button
            onClick={onOpenTrackSelector}
            title="Switch Racing Track"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-900 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-800/90 text-stone-200 text-[11px] font-semibold transition active:scale-95 group shrink-0"
          >
            <span>{circuit.country.split(' ')[1] || '🏁'}</span>
            <span className="truncate max-w-[85px] sm:max-w-[130px] text-stone-100 group-hover:text-amber-300">
              {circuit.name.replace(/(Autodromo Nazionale | International Circuit| Grand Prix)/g, '')}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-amber-400" />
          </button>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-400 font-medium">
            <span className="text-amber-400 font-semibold uppercase text-[10px] tracking-wide">
              {options.mode}
            </span>
            {options.bot === 'medium' && (
              <span className="inline-flex items-center gap-0.5 text-stone-300 text-[10px]">
                <Bot className="w-3 h-3 text-orange-400" /> AI
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenTrackSelector}
            aria-label="Track Selector"
            title="Track Selector"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-stone-800 active:scale-95 transition"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>
          <button
            onClick={onOpenLog}
            aria-label="Race Log"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenEditor}
            aria-label="Track Architect"
            title="Custom Track Architect"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition hidden xs:flex"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenRules}
            aria-label="Rules"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Driver telemetry cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-2 pb-1.5 max-w-5xl mx-auto w-full">
        {players.map((player, idx) => {
          const lap = Math.min(options.laps, Math.floor(player.pos / trackLength) + 1);
          const space = ((player.pos % trackLength) + trackLength) % trackLength;
          const isLeader = leaderIdx === idx;
          const label = idx === 0
            ? 'P1'
            : options.bot === 'off' && idx === 1
              ? 'P2'
              : idx === 1
                ? 'BOT'
                : `BOT ${idx}`;

          return (
            <div
              key={`driver-${idx}`}
              className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                isLeader
                  ? leaderColors[idx]
                  : 'bg-stone-900/60 border-stone-800 text-stone-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={`w-5 h-5 rounded-full ${playerColors[idx]} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}>
                  {idx + 1}
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-1 font-semibold leading-tight text-white text-[11px] truncate">
                    <span>{label}</span>
                    {isLeader && <span className="text-[9px] text-amber-400 font-mono">LEAD</span>}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono tabular-nums leading-none">
                    L{lap}/{options.laps} · #{space}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums shrink-0">
                <span title="Slipstream tokens" className="flex items-center gap-0.5 text-sky-400 font-medium">
                  🌀{player.slip}
                </span>
                {options.mom && (
                  <span title="Momentum tokens" className="flex items-center gap-0.5 text-amber-400 font-medium">
                    ⚡{player.mom}
                  </span>
                )}
                {options.head && player.head > 0 && (
                  <span title="Headwind penalty" className="flex items-center gap-0.5 text-cyan-300 font-medium">
                    🌬{player.head}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </header>
  );
};
