import React, { useState, useEffect } from 'react';
import { GameOptions, GameState, TargetSelection } from '../types/game';
import {
  calculateEffectiveValue,
  calculateSpeed,
  getCardOrDieLabel,
  getRoundSteps,
  getActivePlayerIndex,
  getLeaderIndex,
  SLIP_VAL,
  MOM_VAL,
} from '../game/engine';
import { ArrowRight, Dices, ChevronRight, Lock, RotateCcw } from 'lucide-react';
import { CardTracker } from './CardTracker';

interface ActionControlsProps {
  gameState: GameState;
  options: GameOptions;
  isRolling?: boolean;
  onRoll: () => void;
  onSelectDie: (index: number) => void;
  onAdjustTokens: (type: 'slip' | 'mom', delta: number) => void;
  onLockIn: () => void;
  onReact: () => void;
  onStartPlayer2: () => void;
  onNextStep: () => void;
  onResetGame: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  gameState,
  options,
  isRolling = false,
  onRoll,
  onSelectDie,
  onAdjustTokens,
  onLockIn,
  onReact,
  onStartPlayer2,
  onNextStep,
  onResetGame,
}) => {
  const [rollingDice, setRollingDice] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!isRolling) return;
    const interval = setInterval(() => {
      setRollingDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 60);
    return () => clearInterval(interval);
  }, [isRolling]);

  const activeIdx = getActivePlayerIndex(gameState);
  const activePlayer = gameState.P[activeIdx];
  const isLeader = getLeaderIndex(gameState.P, gameState.lead) === activeIdx;
  const isReact = gameState.phase === 'react';
  const isTrailingInPick = !isLeader && !isReact && (gameState.phase === 'pick0' || gameState.phase === 'pick1');

  const sel = gameState.sel;
  const selectedDieVal = sel.die !== null ? activePlayer.dice[sel.die] : null;

  const effectiveVal =
    selectedDieVal !== null
      ? calculateEffectiveValue(activeIdx, sel, selectedDieVal, gameState, options)
      : null;

  const currentSpeed =
    selectedDieVal !== null
      ? calculateSpeed(activeIdx, selectedDieVal, gameState, options)
      : 0;

  // Dice Pip renderer
  const renderDieFace = (val: number, isDiscarded: boolean = false) => {
    if (options.mode === 'cards') {
      return (
        <span className={`font-bold text-base tracking-tight font-mono ${isDiscarded ? 'line-through text-red-400' : ''}`}>
          {getCardOrDieLabel(val, 'cards')}
        </span>
      );
    }

    // Standard dice pips
    const dotClasses = 'w-1.5 h-1.5 rounded-full bg-stone-900';
    return (
      <div className="w-5 h-5 grid grid-cols-3 grid-rows-3 p-0.5 items-center justify-items-center">
        {val === 1 && (
          <div className={`${dotClasses} col-start-2 row-start-2 w-2 h-2 bg-red-600`} />
        )}
        {val === 2 && (
          <>
            <div className={`${dotClasses} col-start-1 row-start-1`} />
            <div className={`${dotClasses} col-start-3 row-start-3`} />
          </>
        )}
        {val === 3 && (
          <>
            <div className={`${dotClasses} col-start-1 row-start-1`} />
            <div className={`${dotClasses} col-start-2 row-start-2`} />
            <div className={`${dotClasses} col-start-3 row-start-3`} />
          </>
        )}
        {val === 4 && (
          <>
            <div className={`${dotClasses} col-start-1 row-start-1`} />
            <div className={`${dotClasses} col-start-3 row-start-1`} />
            <div className={`${dotClasses} col-start-1 row-start-3`} />
            <div className={`${dotClasses} col-start-3 row-start-3`} />
          </>
        )}
        {val === 5 && (
          <>
            <div className={`${dotClasses} col-start-1 row-start-1`} />
            <div className={`${dotClasses} col-start-3 row-start-1`} />
            <div className={`${dotClasses} col-start-2 row-start-2`} />
            <div className={`${dotClasses} col-start-1 row-start-3`} />
            <div className={`${dotClasses} col-start-3 row-start-3`} />
          </>
        )}
        {val === 6 && (
          <>
            <div className={`${dotClasses} col-start-1 row-start-1`} />
            <div className={`${dotClasses} col-start-3 row-start-1`} />
            <div className={`${dotClasses} col-start-1 row-start-2`} />
            <div className={`${dotClasses} col-start-3 row-start-2`} />
            <div className={`${dotClasses} col-start-1 row-start-3`} />
            <div className={`${dotClasses} col-start-3 row-start-3`} />
          </>
        )}
      </div>
    );
  };

  // Recent log ticker
  const latestLog = gameState.log.length > 0 ? gameState.log[gameState.log.length - 1].t : 'Ready to race.';

  return (
    <footer className="w-full shrink-0 flex flex-col bg-stone-950/95 border-t border-stone-800 text-stone-200">
      {/* 1-Line Race commentary ticker */}
      <div className="w-full bg-stone-900/60 px-3 py-1 border-b border-stone-800/80 flex items-center justify-between text-[11px] font-mono text-stone-400">
        <span className="truncate pr-2 text-stone-300">{latestLog}</span>
        <span className="text-[10px] text-stone-500 uppercase tracking-wider shrink-0 font-sans">
          Phase: {gameState.phase}
        </span>
      </div>

      <div className="p-2 sm:p-2.5 max-w-2xl mx-auto w-full flex flex-col gap-1.5">
        {/* Phase: ROLL */}
        {gameState.phase === 'roll' && (
          <div className="flex flex-col items-center justify-center py-1.5 gap-2">
            {isRolling && options.mode === 'dice' ? (
              <div className="flex flex-col items-center justify-center py-2 gap-2 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 tracking-wide uppercase">
                  <Dices className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Rolling 5d6 for Round {gameState.round}...</span>
                </div>
                <div className="flex items-center justify-center gap-2.5 py-1">
                  {rollingDice.map((val, idx) => (
                    <div
                      key={`rolling-die-${idx}`}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-50 border-2 border-amber-400/90 text-stone-900 shadow-lg shadow-amber-500/25 flex items-center justify-center font-bold ${
                        idx % 2 === 0 ? 'animate-dice-tumble-a' : 'animate-dice-tumble-b'
                      }`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      {renderDieFace(val)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={onRoll}
                disabled={isRolling}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Dices className="w-5 h-5" />
                <span>
                  {options.mode === 'cards' ? 'Draw 3 Cards' : 'Roll 5d6'} (Round {gameState.round})
                </span>
              </button>
            )}
          </div>
        )}

        {/* Phase: COVER (Pass & Play handover) */}
        {gameState.phase === 'cover' && (
          <div className="flex flex-col items-center justify-center py-2 text-center gap-2">
            <div className="flex items-center gap-2 text-stone-300 text-sm font-semibold">
              <Lock className="w-4 h-4 text-amber-400" />
              Player 1 has locked in their choice
            </div>
            <p className="text-xs text-stone-400 max-w-sm">
              Pass the device to Player 2 to keep selections private.
            </p>
            <button
              onClick={onStartPlayer2}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-[0.98] transition"
            >
              I am Player 2
            </button>
          </div>
        )}

        {/* Phase: RESULT */}
        {gameState.phase === 'result' && (
          <div className="flex items-center justify-center py-2">
            <button
              onClick={onNextStep}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-stone-950 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
            >
              <span>
                {gameState.win !== null
                  ? 'View Race Results'
                  : gameState.step >= getRoundSteps(options, gameState.round)
                  ? `Next Round (${gameState.round + 1})`
                  : 'Next Step'}
              </span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Phase: OVER */}
        {gameState.phase === 'over' && (
          <div className="flex flex-col items-center justify-center py-2 text-center gap-2">
            <div className="text-lg font-black text-amber-400 flex items-center gap-2">
              🏆 Player {gameState.win !== null ? gameState.win + 1 : 1} Wins!
            </div>
            <p className="text-xs text-stone-400">
              The chequered flag has dropped after a thrilling race.
            </p>
            <button
              onClick={onResetGame}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-stone-100 hover:bg-white text-stone-950 active:scale-[0.98] flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Race</span>
            </button>
          </div>
        )}

        {/* Phase: PICK0, PICK1, REACT */}
        {(gameState.phase === 'pick0' || gameState.phase === 'pick1' || gameState.phase === 'react') && (
          options.bot === 'medium' && gameState.phase === 'react' && gameState.tr === 1 ? (
            <div className="flex items-center justify-center py-4 gap-2.5 text-xs text-stone-300 font-medium bg-stone-900/60 rounded-xl border border-stone-800">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
              <span>AI Bot is calculating tactical reaction...</span>
            </div>
          ) : (
          <>
            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-stone-300 px-0.5">
              <span className="font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeIdx === 0 ? 'bg-blue-500' : 'bg-orange-500'
                  }`}
                />
                <span>
                  Player {activeIdx + 1}
                  {options.bot === 'medium' && activeIdx === 1 ? ' (Bot)' : ''}
                </span>
                <span className="text-stone-400 font-normal">
                  {isReact ? '· Reacting' : isLeader ? '· Leading' : '· Trailing'}
                </span>
              </span>

              {/* Speed & Target pill */}
              <div className="text-[11px] font-mono text-stone-400 tabular-nums">
                {effectiveVal !== null ? (
                  <span>
                    Speed: <strong className="text-amber-400">{effectiveVal}</strong>
                    {sel.tgt ? ` → #${sel.tgt.pos} (${sel.tgt.lane ? 'out' : 'in'})` : ''}
                  </span>
                ) : (
                  <span>Select a {options.mode === 'cards' ? 'card' : 'die'}</span>
                )}
              </div>
            </div>

            {/* Hand items (Dice or Cards) */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-0.5">
              {activePlayer.dice.map((val, idx) => {
                const isDiscarded = Boolean(gameState.discardedDice?.[activeIdx]?.includes(idx));
                const isPlayed = !isDiscarded && activePlayer.used.includes(idx);
                const isSelected = sel.die === idx;

                return (
                  <div key={`hand-die-wrap-${idx}`} className="flex flex-col items-center gap-0.5">
                    <button
                      key={`hand-${idx}`}
                      disabled={isDiscarded || isPlayed || isReact}
                      onClick={() => onSelectDie(idx)}
                      title={
                        isDiscarded
                          ? `Discarded die (${val}) - skipped this round`
                          : isPlayed
                          ? `Played die (${val}) - already used this round`
                          : `Select die ${val}`
                      }
                      className={`min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-xl relative flex items-center justify-center border transition-all ${
                        isDiscarded
                          ? 'bg-stone-100 hover:bg-stone-100 border-stone-300 text-stone-900 shadow-sm cursor-not-allowed opacity-90'
                          : isPlayed
                          ? 'bg-stone-900 border-stone-800 text-stone-600 opacity-30 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-400 border-amber-300 text-stone-950 shadow-md shadow-amber-400/25 ring-2 ring-amber-300 font-bold active:scale-95'
                          : 'bg-stone-100 hover:bg-white border-stone-200 text-stone-900 shadow active:scale-95'
                      }`}
                    >
                      {renderDieFace(val, isDiscarded)}

                      {/* Translucent red cross-out for discarded dice */}
                      {isDiscarded && (
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none p-1.5 overflow-visible"
                          viewBox="0 0 44 44"
                        >
                          <line
                            x1="8"
                            y1="8"
                            x2="36"
                            y2="36"
                            stroke="#dc2626"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeOpacity="0.45"
                          />
                          <line
                            x1="36"
                            y1="8"
                            x2="8"
                            y2="36"
                            stroke="#dc2626"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeOpacity="0.45"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Token boosters (Slipstream & Momentum) */}
            {(!isTrailingInPick || isReact) && (
              <div className="flex items-center justify-between gap-2 px-1 text-xs">
                {/* Slipstream */}
                <div className="flex items-center gap-1.5 bg-stone-900/80 px-2 py-1 rounded-lg border border-stone-800">
                  <span className="text-sky-400 font-medium text-[11px] flex items-center gap-0.5">
                    🌀 +1
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={sel.slip <= 0}
                      onClick={() => onAdjustTokens('slip', -1)}
                      className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="font-mono tabular-nums text-xs min-w-[20px] text-center font-bold">
                      {sel.slip}/{activePlayer.slip}
                    </span>
                    <button
                      disabled={sel.slip >= activePlayer.slip}
                      onClick={() => onAdjustTokens('slip', 1)}
                      className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Momentum */}
                {options.mom && (
                  <div className="flex items-center gap-1.5 bg-stone-900/80 px-2 py-1 rounded-lg border border-stone-800">
                    <span className="text-amber-400 font-medium text-[11px] flex items-center gap-0.5">
                      ⚡ +2
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={sel.mom <= 0}
                        onClick={() => onAdjustTokens('mom', -1)}
                        className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="font-mono tabular-nums text-xs min-w-[20px] text-center font-bold">
                        {sel.mom}/{activePlayer.mom}
                      </span>
                      <button
                        disabled={sel.mom >= activePlayer.mom}
                        onClick={() => onAdjustTokens('mom', 1)}
                        className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trailing notice */}
            {isTrailingInPick && (
              <p className="text-[11px] text-stone-400 text-center">
                Pick your {options.mode === 'cards' ? 'card' : 'die'} secretly. As trailer, you choose tokens and your target after seeing the leader move.
              </p>
            )}

            {/* Action CTA Button */}
            <div className="pt-0.5">
              {isReact ? (
                <button
                  disabled={!sel.tgt}
                  onClick={onReact}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5 transition"
                >
                  <span>{sel.tgt ? 'Confirm Move' : 'Tap a Highlighted Space'}</span>
                  {sel.tgt && <ArrowRight className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  disabled={sel.die === null || (isLeader && !sel.tgt)}
                  onClick={onLockIn}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-stone-800 disabled:text-stone-500 text-white shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5 transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {sel.die === null
                      ? `Select a ${options.mode === 'cards' ? 'Card' : 'Die'}`
                      : isLeader && !sel.tgt
                      ? 'Tap a Highlighted Space'
                      : 'Lock In Choice'}
                  </span>
                </button>
              )}
            </div>
          </>
          )
        )}
      </div>

      {/* Discrete Card Discard Tracker (Card Mode only) */}
      {options.mode === 'cards' && (
        <CardTracker
          discardedCards={gameState.discardedCards ?? [[], []]}
          round={gameState.round}
          isBot={options.bot === 'medium'}
        />
      )}
    </footer>
  );
};
