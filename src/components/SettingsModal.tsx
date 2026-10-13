import React from 'react';
import { BotDifficulty, GameMode, GameOptions } from '../types/game';
import { X, Settings2, Bot, User, Dices, Layers } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: GameOptions;
  onChangeOptions: (updater: (prev: GameOptions) => GameOptions) => void;
  onRestartRace: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
  onRestartRace,
}) => {
  if (!isOpen) return null;

  const setMode = (mode: GameMode) => {
    if (mode === options.mode) return;
    onChangeOptions((prev) => ({ ...prev, mode }));
    onRestartRace();
  };

  const setBot = (bot: BotDifficulty) => {
    if (bot === options.bot) return;
    onChangeOptions((prev) => ({ ...prev, bot }));
    onRestartRace();
  };

  const setLaps = (delta: number) => {
    const next = Math.max(1, Math.min(5, options.laps + delta));
    if (next === options.laps) return;
    onChangeOptions((prev) => ({ ...prev, laps: next }));
    onRestartRace();
  };

  const toggleOption = (key: keyof Pick<GameOptions, 'mom' | 'head' | 'skip' | 'pass'>) => {
    onChangeOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    if (key === 'skip' || key === 'pass') {
      onRestartRace();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Race Settings</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-stone-200">
          {/* Mode */}
          <div className="space-y-1.5">
            <span className="font-semibold text-white block">Engine Mode</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('dice')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition ${
                  options.mode === 'dice'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Dices className="w-4 h-4" />
                <span>🎲 Dice (5d6)</span>
              </button>
              <button
                onClick={() => setMode('cards')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition ${
                  options.mode === 'cards'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>🃏 Cards (Deck)</span>
              </button>
            </div>
          </div>

          {/* Opponent */}
          <div className="space-y-1.5">
            <span className="font-semibold text-white block">Player 2 Opponent</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBot('off')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition ${
                  options.bot === 'off'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>👤 Pass & Play</span>
              </button>
              <button
                onClick={() => setBot('medium')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-medium transition ${
                  options.bot === 'medium'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>🤖 AI Bot (Medium)</span>
              </button>
            </div>
          </div>

          {/* Laps */}
          <div className="flex items-center justify-between py-2 border-t border-stone-800/80">
            <div>
              <span className="font-semibold text-white block">Race Distance</span>
              <span className="text-[11px] text-stone-400">Total laps around the circuit</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLaps(-1)}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-bold text-base flex items-center justify-center"
              >
                −
              </button>
              <span className="w-6 text-center font-mono font-bold text-sm tabular-nums">
                {options.laps}
              </span>
              <button
                onClick={() => setLaps(1)}
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-bold text-base flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Rule Toggles */}
          <div className="space-y-3 pt-2 border-t border-stone-800/80">
            {/* Momentum */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">⚡ Momentum Tokens</span>
                <span className="text-[11px] text-stone-400">Leader at end of round earns +2 pip token</span>
              </div>
              <button
                onClick={() => toggleOption('mom')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  options.mom ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    options.mom ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Headwind */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">🌬 Headwind Drag</span>
                <span className="text-[11px] text-stone-400">
                  {options.mode === 'cards'
                    ? 'Leader takes -1 on cards of 5+ after slipstream'
                    : 'Leader takes -1 on dice rolls of 4, 5, or 6'}
                </span>
              </div>
              <button
                onClick={() => toggleOption('head')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  options.head ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    options.head ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Discard / Skip Rule */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">⏭ Discard Rule</span>
                <span className="text-[11px] text-stone-400">
                  Leader discards highest, trailer discards lowest (active from Round 2)
                </span>
              </div>
              <button
                onClick={() => toggleOption('skip')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  options.skip ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    options.skip ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Slipstream Pass */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">➜ Slipstream Pass</span>
                <span className="text-[11px] text-stone-400">Finish right behind opponent to overtake</span>
              </div>
              <button
                onClick={() => toggleOption('pass')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  options.pass ? 'bg-amber-500' : 'bg-stone-800'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    options.pass ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-800 shrink-0 bg-stone-950 flex gap-2">
          <button
            onClick={() => {
              onRestartRace();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-stone-950 transition"
          >
            Restart With These Rules
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
