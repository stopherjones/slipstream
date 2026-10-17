import React from 'react';
import { ChampionshipState, GameOptions, GameState, TrackDefinition } from '../types/game';
import { getRoundSteps } from '../game/engine';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Settings,
  Sliders,
  History,
  Bot,
  Compass,
  ChevronDown,
  Home,
  Trophy,
} from 'lucide-react';

import { getTrackTheme } from '../game/trackThemes';

interface HUDProps {
  circuit: TrackDefinition;
  gameState: GameState;
  options: GameOptions;
  trackLength: number;
  soundEnabled: boolean;
  championship?: ChampionshipState | null;
  onGoHome?: () => void;
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
  championship,
  onGoHome,
  onToggleSound,
  onOpenRules,
  onOpenSettings,
  onOpenEditor,
  onOpenLog,
  onOpenTrackSelector,
}) => {
  const theme = getTrackTheme(circuit.id);
  const totalSteps = getRoundSteps(options, gameState.round);
  const players = gameState.P;
  const leaderIdx = gameState.lead ?? 0;

  const playerBadgeColors = [
    'bg-blue-600 ring-2 ring-blue-300 text-white shadow-md shadow-blue-500/30',
    'bg-rose-600 ring-2 ring-rose-300 text-white shadow-md shadow-rose-500/30',
    'bg-emerald-600 ring-2 ring-emerald-300 text-white shadow-md shadow-emerald-500/30',
    'bg-violet-600 ring-2 ring-violet-300 text-white shadow-md shadow-violet-500/30',
  ];

  const driverCardStyles = [
    'bg-blue-950/60 border-blue-500/60 text-blue-100 shadow-sm shadow-blue-900/30',
    'bg-rose-950/60 border-rose-500/60 text-rose-100 shadow-sm shadow-rose-900/30',
    'bg-emerald-950/60 border-emerald-500/60 text-emerald-100 shadow-sm shadow-emerald-900/30',
    'bg-violet-950/60 border-violet-500/60 text-violet-100 shadow-sm shadow-violet-900/30',
  ];

  return (
    <header
      className="w-full shrink-0 flex flex-col bg-stone-950/95 backdrop-blur-md transition-all duration-300 z-20"
      style={{
        borderBottom: `2px solid ${theme.accentHex}60`,
        boxShadow: `0 8px 24px -6px ${theme.accentHex}25`,
      }}
    >
      {/* Top 1-row compact navigation */}
      <div className="flex items-center justify-between px-3 py-1.5 gap-2 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          {onGoHome && (
            <button
              onClick={onGoHome}
              title="Return to Home Menu"
              aria-label="Home"
              className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-800 text-stone-300 hover:text-white transition active:scale-95 shrink-0"
            >
              <Home className="w-4 h-4 text-amber-400" />
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-black tracking-tight text-white text-base">
              SLIPSTREAM
            </span>
            <span className="text-xs text-stone-400 font-mono hidden xs:inline">
              R{gameState.round}·S{gameState.step + 1}/{totalSteps}
            </span>
          </div>

          {/* Quick Track Selector Pill with Landmark */}
          <button
            onClick={onOpenTrackSelector}
            title={`Switch Track · Current: ${circuit.name} (${theme.landmark})`}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-stone-900/90 border border-stone-800 hover:border-amber-400/60 hover:bg-stone-800 text-stone-200 text-[11px] font-semibold transition active:scale-95 group shrink-0"
          >
            <span>{circuit.country.split(' ')[1] || '🏁'}</span>
            <span className="truncate max-w-[85px] sm:max-w-[130px] text-stone-100 group-hover:text-amber-300">
              {circuit.name.replace(/(Autodromo Nazionale | International Circuit| Grand Prix)/g, '')}
            </span>
            <span className="text-[10px] text-stone-400 font-mono hidden md:inline">
              · {theme.landmark}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-amber-400" />
          </button>

          {championship?.active ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Race {championship.currentRaceIndex + 1}/{championship.totalRaces}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-400 font-medium">
              <span className="text-amber-400 font-semibold uppercase text-[10px] tracking-wide">
                DICE
              </span>
              {options.bot === 'medium' && (
                <span className="inline-flex items-center gap-0.5 text-stone-300 text-[10px]">
                  <Bot className="w-3 h-3 text-orange-400" /> AI ({options.botCount} bot{options.botCount > 1 ? 's' : ''})
                </span>
              )}
            </div>
          )}
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
          const isChampionship = Boolean(championship?.active);
          const label = isChampionship
            ? championship?.standings[idx]?.name || `Driver ${idx + 1}`
            : idx === 0
            ? 'P1'
            : options.bot === 'off' && idx === 1
            ? 'P2'
            : idx === 1
            ? 'BOT'
            : `BOT ${idx}`;

          const isActiveTurn = gameState.tr === idx && (gameState.phase === 'turn' || gameState.phase === 'react' || gameState.phase === 'roll');
          const baseCardStyle = driverCardStyles[idx] || driverCardStyles[0];
          const activeStyle = isActiveTurn
            ? 'ring-2 ring-white/90 shadow-lg shadow-white/10 scale-[1.02] bg-opacity-90'
            : isLeader
            ? 'ring-1 ring-amber-400/90 shadow-md shadow-amber-500/15'
            : 'opacity-85 hover:opacity-100';

          return (
            <div
              key={`driver-${idx}`}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs transition-all ${baseCardStyle} ${activeStyle}`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-5 h-5 rounded-full ${playerBadgeColors[idx]} font-black text-[10px] flex items-center justify-center shrink-0`}>
                  {idx + 1}
                </span>
                <div className="truncate">
                  <div className="flex items-center gap-1 font-bold leading-tight text-white text-[11px] truncate">
                    <span>{label}</span>
                    {isActiveTurn && (
                      <span className="text-[9px] text-white font-mono font-black bg-white/25 px-1 rounded animate-pulse">
                        TURN
                      </span>
                    )}
                    {isLeader && !isActiveTurn && (
                      <span className="text-[9px] text-amber-300 font-mono font-black bg-amber-500/20 px-1 rounded border border-amber-500/40">
                        1ST
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-stone-200 font-mono tabular-nums leading-none mt-0.5">
                    L{lap}/{options.laps} · #{space}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums shrink-0">
                <span title="Slipstream tokens" className="flex items-center gap-0.5 text-sky-200 font-bold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-400/50 shadow-sm">
                  🌀{player.slip}
                </span>
                {options.mom && (
                  <span title="Momentum tokens" className="flex items-center gap-0.5 text-amber-200 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-400/50 shadow-sm">
                    ⚡{player.mom}
                  </span>
                )}
                {isChampionship && (
                  <span title="Championship Points" className="flex items-center gap-0.5 text-amber-200 font-black bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-400/60 shadow-sm">
                    {championship?.standings[idx]?.points ?? 0}pts
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
