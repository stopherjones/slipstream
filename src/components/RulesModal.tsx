import React from 'react';
import { GameMode, GameOptions, PlayerState } from '../types/game';
import { CARDS, getCardOrDieLabel } from '../game/engine';
import { X, BookOpen, Layers } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: GameOptions;
  p1: PlayerState;
  p2: PlayerState;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  options,
  p1,
  p2,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Rules & Race Guide</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable rules body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed">
          {/* Overview */}
          <section className="bg-stone-950/50 p-3 rounded-xl border border-stone-800/80">
            <h3 className="font-bold text-white text-sm mb-1">🏁 Race Overview</h3>
            <p>
              Slipstream is a two-player tactical racer around a circuit with tight chicanes and high-speed straights.
              You race anti-clockwise starting from the chequered finish line.
            </p>
          </section>

          {/* Cards / Dice explanation */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-white text-sm">
              {options.mode === 'cards' ? '🃏 Card Mode Rules' : '🎲 Dice Mode Rules'}
            </h3>
            {options.mode === 'cards' ? (
              <p>
                Each player draws 3 cards per round from their private 12-card deck (values 1–9, J, Q, K).
                Played cards remain face-up and out of play until all 12 cards have been played over 4 rounds, after which the deck reshuffles.
              </p>
            ) : (
              <p>
                Each round, both players roll 5 standard dice (5d6) in secret. Five times per round, each player picks an unused die to race with.
              </p>
            )}
          </section>

          {/* Card Tracker if card mode */}
          {options.mode === 'cards' && (
            <section className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2">
              <div className="flex items-center gap-1.5 text-stone-200 font-semibold text-xs">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Deck Cycle Tracker</span>
              </div>
              <div className="space-y-1.5">
                {[0, 1].map((pIdx) => {
                  const p = pIdx === 0 ? p1 : p2;
                  return (
                    <div key={`deck-${pIdx}`} className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${pIdx === 0 ? 'bg-blue-600' : 'bg-orange-600'}`}>
                        {pIdx + 1}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {CARDS.map((c) => {
                          const isPlayed = p.played.includes(c);
                          return (
                            <span
                              key={`p-${pIdx}-${c}`}
                              className={`w-6 h-7 rounded border flex items-center justify-center font-mono font-bold text-xs ${
                                isPlayed
                                  ? 'bg-stone-800 border-stone-700 text-stone-500 line-through opacity-50'
                                  : 'bg-stone-100 border-white text-stone-900 shadow-sm'
                              }`}
                            >
                              {getCardOrDieLabel(c, 'cards')}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-stone-400">
                Crossed out = already discarded. Cards still active are in hand or deck.
              </p>
            </section>
          )}

          {/* Turn & Secret Selection */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-white text-sm">🏎 Turn Sequence & Bluffing</h3>
            <p>
              1. <strong>Leader Commits</strong>: The player ahead commits their die/card, optional booster tokens, and target lane secretly and moves first.
            </p>
            <p>
              2. <strong>Trailer Reacts</strong>: The trailing player reveals their die/card, but crucially decides their booster tokens and exact target lane <em>after seeing where the leader ends up!</em>
            </p>
          </section>

          {/* Special Mechanics */}
          <section className="space-y-2">
            <h3 className="font-bold text-white text-sm">⚡ Tactical Tokens</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                <span className="font-bold text-sky-400">🌀 Slipstream (+1 pip):</span>
                <p className="text-stone-300 mt-0.5">
                  Earned when following closely behind the lead car. Spend to accelerate +1 pip per token.
                </p>
              </div>

              {options.mom && (
                <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                  <span className="font-bold text-amber-400">⚡ Momentum (+2 pips):</span>
                  <p className="text-stone-300 mt-0.5">
                    Awarded to the race leader at the end of each round. Worth +2 pips of speed!
                  </p>
                </div>
              )}

              {options.head && (
                <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                  <span className="font-bold text-cyan-300">🌬 Headwind Penalty:</span>
                  <p className="text-stone-300 mt-0.5">
                    Driving out front cuts down top speed. Rolls of 4, 5, or 6 incur a -1 penalty.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Corners & Bottlenecks */}
          <section className="space-y-1.5">
            <h3 className="font-bold text-white text-sm">🛑 Track Lanes & Corners</h3>
            <p>
              • <strong>Inside vs Outside Lane</strong>: On straights, both lanes cost 1 pip per space. On corners, the outside lane costs <strong>2 pips</strong> per space (marked with red curb stripes).
            </p>
            <p>
              • <strong>Bottlenecks (Brown single-lane)</strong>: Both cars share the lane. You cannot pass through or land on an opponent in a bottleneck!
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-800 shrink-0 bg-stone-950">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-stone-100 hover:bg-white text-stone-950 transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
