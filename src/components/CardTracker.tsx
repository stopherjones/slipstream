import React from 'react';
import { CARDS, getCardOrDieLabel } from '../game/engine';

interface CardTrackerProps {
  discardedCards: [number[], number[]];
  round: number;
  isBot: boolean;
}

export const CardTracker: React.FC<CardTrackerProps> = ({
  discardedCards,
  round,
  isBot,
}) => {
  const p1Discards = discardedCards[0] ?? [];
  const p2Discards = discardedCards[1] ?? [];
  const cycleNumber = Math.floor((Math.max(1, round) - 1) / 4) + 1;

  return (
    <div className="w-full bg-stone-950/90 border-t border-stone-800/80 px-2 py-1 flex flex-col gap-1 text-[10px] select-none">
      {/* Discrete header */}
      <div className="flex items-center justify-between text-stone-400 font-mono text-[9px] px-1">
        <span className="flex items-center gap-1 text-stone-300">
          <span className="text-amber-400 font-bold">🃏 DISCARD TRACKER</span>
          <span className="text-stone-500">·</span>
          <span>CYCLE {cycleNumber}</span>
        </span>
        <span className="text-stone-400 text-[9px] font-sans">
          Updates after each 3-card round ({p1Discards.length}/12 used)
        </span>
      </div>

      {/* Players card rows */}
      <div className="grid grid-cols-2 gap-2">
        {/* Player 1 Row */}
        <div className="flex items-center gap-1 bg-stone-900/60 px-1.5 py-0.5 rounded border border-stone-800/80 overflow-x-auto scrollbar-none">
          <span className="font-bold text-[9px] text-blue-400 shrink-0 font-mono mr-0.5">
            P1
          </span>
          <div className="flex items-center gap-0.5">
            {CARDS.map((val) => {
              const isUsed = p1Discards.includes(val);
              const label = getCardOrDieLabel(val, 'cards');
              return (
                <span
                  key={`track-p1-${val}`}
                  title={`P1 ${label}: ${isUsed ? 'Discarded' : 'In hand or deck'}`}
                  className={`w-4 h-4.5 rounded-[3px] text-[9px] font-mono font-bold flex items-center justify-center shrink-0 border transition-colors ${
                    isUsed
                      ? 'bg-stone-950 border-stone-800/60 text-stone-600 line-through opacity-40'
                      : 'bg-stone-200 border-white text-stone-900 shadow-2xs'
                  }`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Player 2 / Bot Row */}
        <div className="flex items-center gap-1 bg-stone-900/60 px-1.5 py-0.5 rounded border border-stone-800/80 overflow-x-auto scrollbar-none">
          <span className="font-bold text-[9px] text-orange-400 shrink-0 font-mono mr-0.5">
            {isBot ? 'BOT' : 'P2'}
          </span>
          <div className="flex items-center gap-0.5">
            {CARDS.map((val) => {
              const isUsed = p2Discards.includes(val);
              const label = getCardOrDieLabel(val, 'cards');
              return (
                <span
                  key={`track-p2-${val}`}
                  title={`P2 ${label}: ${isUsed ? 'Discarded' : 'In hand or deck'}`}
                  className={`w-4 h-4.5 rounded-[3px] text-[9px] font-mono font-bold flex items-center justify-center shrink-0 border transition-colors ${
                    isUsed
                      ? 'bg-stone-950 border-stone-800/60 text-stone-600 line-through opacity-40'
                      : 'bg-stone-200 border-white text-stone-900 shadow-2xs'
                  }`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
