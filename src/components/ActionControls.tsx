import React, { useState, useEffect } from 'react';
import { GameOptions, GameState, TargetSelection } from '../types/game';
import {
  calculateEffectiveValue,
  getRoundSteps,
  getActivePlayerIndex,
  getLeaderIndex,
  SLIP_VAL,
  MOM_VAL,
} from '../game/engine';
import { ArrowRight, Dices, ChevronRight, Lock, RotateCcw } from 'lucide-react';

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
  const activePlayer = gameState.P[activeIdx] ?? gameState.P[0];
  const isLeader = (gameState.lead ?? 0) === activeIdx;
  const isBotActive = options.bot === 'medium' && activeIdx > 0;
  const isTurn = gameState.phase === 'turn';
  const isReact = gameState.phase === 'react';
  const isPicking = gameState.phase === 'pick0' || gameState.phase === 'pick1';
  const isBotReacting = options.bot === 'medium' && isReact && gameState.tr === 1;

  const sel = gameState.sel;
  const canAdjustTokens = !isBotActive && (isTurn || isReact || (isPicking && isLeader));
  const showHand = isRolling || isTurn || isPicking || isReact;

  let actionLabel = 'Roll Dice';
  let actionDisabled = false;
  let actionHandler = onRoll;
  let ActionIcon = Dices;

  if (gameState.phase === 'roll') {
    actionLabel = 'Roll Dice';
    actionDisabled = isRolling;
  } else if (isTurn) {
    if (isBotActive) {
      actionLabel = `AI Bot ${activeIdx} Moving...`;
      actionDisabled = true;
      ActionIcon = Lock;
    } else {
      actionHandler = onReact;
      ActionIcon = ArrowRight;
      if (sel.die === null) {
        actionLabel = 'Select Die';
        actionDisabled = true;
      } else if (!sel.tgt) {
        actionLabel = 'Select Destination Space';
        actionDisabled = true;
      } else {
        actionLabel = 'Confirm Move';
        actionDisabled = false;
      }
    }
  } else if (gameState.phase === 'pick0' || gameState.phase === 'pick1') {
    actionHandler = onLockIn;
    ActionIcon = Lock;
    if (sel.die === null) {
      actionLabel = 'Select Die';
      actionDisabled = true;
    } else if (isLeader && !sel.tgt) {
      actionLabel = 'Select Target';
      actionDisabled = true;
    } else {
      actionLabel = 'Lock In Choice';
    }
  } else if (isReact) {
    actionLabel = 'Confirm Move';
    actionDisabled = !sel.tgt || isBotReacting;
    actionHandler = onReact;
    ActionIcon = ArrowRight;
  } else if (gameState.phase === 'cover') {
    actionLabel = 'Player 2 Ready';
    actionHandler = onStartPlayer2;
    ActionIcon = Lock;
  } else if (gameState.phase === 'result') {
    actionLabel = gameState.win !== null
      ? 'View Race Results'
      : gameState.step >= getRoundSteps(options, gameState.round)
      ? 'Next Round'
      : 'Next Step';
    actionHandler = onNextStep;
    ActionIcon = ChevronRight;
  } else if (gameState.phase === 'over') {
    actionLabel = 'Start New Race';
    actionHandler = onResetGame;
    ActionIcon = RotateCcw;
  }

  // Dice Pip renderer
  const renderDieFace = (val: number, isDiscarded: boolean = false) => {
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

  return (
    <footer className="w-full h-[calc(160px+env(safe-area-inset-bottom))] shrink-0 border-t border-stone-800 bg-stone-950/95 text-stone-200">
      <div className="mx-auto grid h-full w-full max-w-2xl grid-rows-[minmax(0,1fr)_44px] gap-2 px-2 pt-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex min-h-0 flex-col justify-center gap-1">
          <div className="flex h-12 shrink-0 items-center justify-center gap-1.5">
            {showHand && (isRolling ? rollingDice : activePlayer.dice).map((val, idx) => {
              const isDiscarded = !isRolling && Boolean(gameState.discardedDice?.[activeIdx]?.includes(idx));
              const isPlayed = !isRolling && !isDiscarded && activePlayer.used.includes(idx);
              const isSelected = !isRolling && sel.die === idx;

              return (
                <button
                  key={`hand-die-${idx}`}
                  disabled={isRolling || isDiscarded || isPlayed || isReact}
                  onClick={() => onSelectDie(idx)}
                  title={
                    isDiscarded
                      ? `Discarded die (${val}) - skipped this round`
                      : isPlayed
                      ? `Played die (${val}) - already used this round`
                      : `Select die ${val}`
                  }
                  className={`h-11 w-11 sm:h-12 sm:w-12 rounded-lg relative flex shrink-0 items-center justify-center border transition-all ${
                    isDiscarded
                      ? 'bg-stone-100 border-stone-300 text-stone-900 opacity-90'
                      : isPlayed
                      ? 'bg-stone-900 border-stone-800 text-stone-600 opacity-30'
                      : isSelected
                      ? 'bg-amber-400 border-amber-300 text-stone-950 shadow-md ring-2 ring-amber-300'
                      : 'bg-stone-100 hover:bg-white border-stone-200 text-stone-900 shadow'
                  } ${isRolling ? (idx % 2 === 0 ? 'animate-dice-tumble-a' : 'animate-dice-tumble-b') : ''}`}
                  style={isRolling ? { animationDelay: `${idx * 40}ms` } : undefined}
                >
                  {renderDieFace(val, isDiscarded)}
                  {isDiscarded && (
                    <svg className="absolute inset-0 h-full w-full p-1.5" viewBox="0 0 44 44">
                      <line x1="8" y1="8" x2="36" y2="36" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.45" />
                      <line x1="36" y1="8" x2="8" y2="36" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.45" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex h-8 shrink-0 items-center justify-between gap-2 px-1">
            {(isTurn || isPicking || isReact) && !isBotActive && (
              <>
                <div className="flex items-center gap-1.5 rounded-md border border-stone-800 bg-stone-900/80 px-2 py-1">
                  <span className="text-[11px] font-medium text-sky-400">Slip +1</span>
                  <button
                    disabled={!canAdjustTokens || sel.slip <= 0}
                    onClick={() => onAdjustTokens('slip', -1)}
                    className="h-6 w-6 rounded bg-stone-800 font-bold text-white disabled:opacity-30"
                    aria-label="Use less slipstream"
                  >−</button>
                  <span className="min-w-7 text-center font-mono text-xs font-bold tabular-nums">{sel.slip}/{activePlayer.slip}</span>
                  <button
                    disabled={!canAdjustTokens || sel.slip >= activePlayer.slip}
                    onClick={() => onAdjustTokens('slip', 1)}
                    className="h-6 w-6 rounded bg-stone-800 font-bold text-white disabled:opacity-30"
                    aria-label="Use more slipstream"
                  >+</button>
                </div>

                {options.mom && (
                  <div className="flex items-center gap-1.5 rounded-md border border-stone-800 bg-stone-900/80 px-2 py-1">
                    <span className="text-[11px] font-medium text-amber-400">Mom +2</span>
                    <button
                      disabled={!canAdjustTokens || sel.mom <= 0}
                      onClick={() => onAdjustTokens('mom', -1)}
                      className="h-6 w-6 rounded bg-stone-800 font-bold text-white disabled:opacity-30"
                      aria-label="Use less momentum"
                    >−</button>
                    <span className="min-w-7 text-center font-mono text-xs font-bold tabular-nums">{sel.mom}/{activePlayer.mom}</span>
                    <button
                      disabled={!canAdjustTokens || sel.mom >= activePlayer.mom}
                      onClick={() => onAdjustTokens('mom', 1)}
                      className="h-6 w-6 rounded bg-stone-800 font-bold text-white disabled:opacity-30"
                      aria-label="Use more momentum"
                    >+</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <button
          disabled={actionDisabled}
          onClick={actionHandler}
          className={`w-full rounded-lg px-4 text-sm font-bold shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:bg-stone-800 disabled:text-stone-500 ${
            isReact
              ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
              : gameState.phase === 'result'
              ? 'bg-emerald-500 text-stone-950 hover:bg-emerald-400'
              : gameState.phase === 'over'
              ? 'bg-stone-100 text-stone-950 hover:bg-white'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          <ActionIcon className="h-4 w-4" />
          <span>{actionLabel}</span>
        </button>
      </div>
    </footer>
  );
};
