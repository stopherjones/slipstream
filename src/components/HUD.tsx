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
  const p1 = gameState.P[0];
  const p2 = gameState.P[1];

  const p1Lap = Math.min(options.laps, Math.floor(p1.pos / trackLength) + 1);
  const p2Lap = Math.min(options.laps, Math.floor(p2.pos / trackLength) + 1);

  const p1Space = p1.pos % trackLength;
  const p2Space = p2.pos % trackLength;

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
      <div className="grid grid-cols-2 gap-1.5 px-2 pb-1.5 max-w-5xl mx-auto w-full">
        {/* Player 1 Card */}
        <div
          className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-colors ${
            gameState.lead === 0
              ? 'bg-blue-950/40 border-blue-500/50 text-blue-100 shadow-sm shadow-blue-900/20'
              : 'bg-stone-900/60 border-stone-800 text-stone-300'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              1
            </span>
            <div className="truncate">
              <div className="flex items-center gap-1 font-semibold leading-tight text-white text-[11px] truncate">
                <span>P1</span>
                {gameState.lead === 0 && (
                  <span className="text-[9px] text-amber-400 font-mono">LEAD</span>
                )}
              </div>
              <div className="text-[10px] text-stone-400 font-mono tabular-nums leading-none">
                L{p1Lap}/{options.laps} · #{p1Space}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums shrink-0">
            <span title="Slipstream tokens" className="flex items-center gap-0.5 text-sky-400 font-medium">
              🌀{p1.slip}
            </span>
            {options.mom && (
              <span title="Momentum tokens" className="flex items-center gap-0.5 text-amber-400 font-medium">
                ⚡{p1.mom}
              </span>
            )}
            {options.head && p1.head > 0 && (
              <span title="Headwind penalty" className="flex items-center gap-0.5 text-cyan-300 font-medium">
                🌬{p1.head}
              </span>
            )}
          </div>
        </div>

        {/* Player 2 Card */}
        <div
          className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs transition-colors ${
            gameState.lead === 1
              ? 'bg-orange-950/40 border-orange-500/50 text-orange-100 shadow-sm shadow-orange-900/20'
              : 'bg-stone-900/60 border-stone-800 text-stone-300'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              2
            </span>
            <div className="truncate">
              <div className="flex items-center gap-1 font-semibold leading-tight text-white text-[11px] truncate">
                <span>{options.bot === 'medium' ? 'BOT' : 'P2'}</span>
                {gameState.lead === 1 && (
                  <span className="text-[9px] text-amber-400 font-mono">LEAD</span>
                )}
              </div>
              <div className="text-[10px] text-stone-400 font-mono tabular-nums leading-none">
                L{p2Lap}/{options.laps} · #{p2Space}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums shrink-0">
            <span title="Slipstream tokens" className="flex items-center gap-0.5 text-sky-400 font-medium">
              🌀{p2.slip}
            </span>
            {options.mom && (
              <span title="Momentum tokens" className="flex items-center gap-0.5 text-amber-400 font-medium">
                ⚡{p2.mom}
              </span>
            )}
            {options.head && p2.head > 0 && (
              <span title="Headwind penalty" className="flex items-center gap-0.5 text-cyan-300 font-medium">
                🌬{p2.head}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
