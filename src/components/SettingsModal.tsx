import React from 'react';
import { BotDifficulty, GameOptions } from '../types/game';
import { X, Settings2, Bot, User } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: GameOptions;
  onChangeOptions: (updater: (prev: GameOptions) => GameOptions) => void;
  onRestartRace: (overrides?: Partial<GameOptions>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
  onRestartRace,
}) => {
  if (!isOpen) return null;

  const setBot = (bot: BotDifficulty) => {
    if (bot === options.bot) return;
    onChangeOptions((prev) => ({ ...prev, bot }));
    onRestartRace({ bot });
  };

  const setBotCount = (botCount: GameOptions['botCount']) => {
    if (botCount === options.botCount) return;
    onChangeOptions((prev) => ({ ...prev, botCount }));
    onRestartRace({ botCount });
  };

  const setLaps = (delta: number) => {
    const next = Math.max(1, Math.min(5, options.laps + delta));
    if (next === options.laps) return;
    onChangeOptions((prev) => ({ ...prev, laps: next }));
    onRestartRace({ laps: next });
  };

  const toggleOption = (key: keyof Pick<GameOptions, 'mom' | 'skip' | 'pass'>) => {
    const nextValue = !options[key];
    onChangeOptions((prev) => ({ ...prev, [key]: nextValue }));
    if (key === 'skip' || key === 'pass') {
      onRestartRace({ [key]: nextValue });
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
          {/* Opponent */}
          <div className="space-y-1.5">
            <span className="font-semibold text-white block">Drivers & Opponents</span>
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
                <span>🤖 AI Mode</span>
              </button>
            </div>
            {options.bot === 'medium' ? (
              <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 px-3 py-2 mt-2">
                <div>
                  <span className="font-semibold text-white block">Number of AI Bots</span>
                  <span className="text-[11px] text-stone-400">Race against 1–3 bots (2–4 total cars)</span>
                </div>
                <div className="flex items-center gap-1">
                  {([1, 2, 3] as const).map((count) => (
                    <button
                      key={count}
                      onClick={() => setBotCount(count)}
                      aria-pressed={options.botCount === count}
                      className={`h-8 w-9 rounded-lg border text-xs font-bold transition ${
                        options.botCount === count
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/60 px-3 py-2 mt-2">
                <div>
                  <span className="font-semibold text-white block">Human Drivers</span>
                  <span className="text-[11px] text-stone-400">Pass & play with 2–4 drivers</span>
                </div>
                <div className="flex items-center gap-1">
                  {([1, 2, 3] as const).map((count) => (
                    <button
                      key={count}
                      onClick={() => setBotCount(count)}
                      aria-pressed={options.botCount === count}
                      className={`h-8 w-10 rounded-lg border text-xs font-bold transition ${
                        options.botCount === count
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-white'
                      }`}
                    >
                      {count + 1}P
                    </button>
                  ))}
                </div>
              </div>
            )}
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

            {/* Discard / Skip Rule */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">⏭ Discard Rule</span>
                <span className="text-[11px] text-stone-400">
                  Leader discards highest, trailer discards lowest (in 3p/4p middle drivers keep all dice)
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
                <span className="text-[11px] text-stone-400">
                  Landing right behind a single car jumps ahead if passing lane is free
                </span>
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
        <div className="px-4 py-3 bg-stone-950 border-t border-stone-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
