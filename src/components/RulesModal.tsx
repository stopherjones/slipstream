import React from 'react';
import { GameOptions } from '../types/game';
import { X, BookOpen, Dices, ShieldAlert, Award } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: GameOptions;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  options,
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
            <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
              <span>🏁</span>
              <span>Race Overview</span>
            </h3>
            <p>
              Slipstream is a tactical board racer.
              Cars race anti-clockwise around high-speed straights, chicanes, and bottlenecks, starting from behind the checkered finish line.
            </p>
          </section>

          {/* Grid & Turn Order */}
          <section className="space-y-1.5 bg-stone-950/50 p-3 rounded-xl border border-stone-800/80">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Starting Grid & Turn Order</span>
            </h3>
            <p>
              • <strong>Starting Grid</strong>: All drivers line up in their own cell, in a random allocation, behind the start / finish line.
            </p>
            <p>
              • <strong>Race Order</strong>: Each player moves independently, starting with the driver currently in 1st place, followed by 2nd place, 3rd place, and 4th place.
            </p>
            <p>
              • <strong>Inside Track Priority</strong>: Where cars are on the same section of track, the car on the inside track goes first. The inside track matches the side of the current corner, or the side of the upcoming corner if on a straight.
            </p>
          </section>

          {/* Dice & Discard Rules */}
          <section className="space-y-1.5 bg-stone-950/50 p-3 rounded-xl border border-stone-800/80">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-amber-400" />
              <span>Dice & Discard Rule</span>
            </h3>
            <p>
              Each round, all drivers roll 5 standard dice (5d6).
            </p>
            <p>
              <strong>Round 1 Opening</strong>: All 5 dice are active on the opening turn of the race (no dice discarded).
            </p>
            {options.skip && (
              <p>
                <strong>Round 2 Onwards</strong>: The race leader discards their highest die, while the trailing driver in last place discards their lowest die! In 3-player and 4-player races, middle drivers (P2 & P3) do not discard and keep all 5 dice (with 1 die left over at the end of the 4-step round). Discarded dice are not available to select or use.
              </p>
            )}
          </section>

          {/* Collisions & Slipstreaming */}
          <section className="space-y-1.5 bg-stone-950/50 p-3 rounded-xl border border-stone-800/80">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Movement, Blockages & Slipstream</span>
            </h3>
            <p>
              • <strong>No Driving Through Cars</strong>: Cars cannot travel through other cars — they must go round them via open lanes.
            </p>
            <p>
              • <strong>Blockages</strong>: If both lanes of the track ahead are blocked by cars (or a single-lane bottleneck is occupied), advancing past them is impossible — trailing cars are blocked and must stop behind them.
            </p>
            <p>
              • <strong>Slipstream Pass</strong>: You can only slipstream if there is space to move around the car you are drafting.
            </p>
            <p>
              • <strong>Single Car Limit</strong>: You can only slipstream one car. If you finish behind a column of two cars, you must take your place behind them without jumping both.
            </p>
          </section>

          {/* Tokens */}
          <section className="space-y-2">
            <h3 className="font-bold text-white text-sm">⚡ Tactical Tokens</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                <span className="font-bold text-sky-400">🌀 Slipstream (+1 pip):</span>
                <p className="text-stone-300 mt-0.5">
                  Earned when finishing closely behind the car ahead. Spend tokens to accelerate your move by +1 pip each.
                </p>
              </div>

              {options.mom && (
                <div className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800">
                  <span className="font-bold text-amber-400">⚡ Momentum (+2 pips):</span>
                  <p className="text-stone-300 mt-0.5">
                    Awarded to the race leader at the end of each round. Worth +2 pips of extra acceleration!
                  </p>
                </div>
              )}
            </div>
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
