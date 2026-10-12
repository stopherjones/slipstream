/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GameMode,
  GameOptions,
  GameState,
  LogEntry,
  ReachMap,
  TargetSelection,
} from './types/game';
import {
  baseValue,
  calculateEffectiveValue,
  calculateSpeed,
  computeBotLead,
  computeBotReact,
  computeBotTrail,
  computeReach,
  createEmptySelection,
  createInitialPlayer,
  getActivePlayerIndex,
  getCardOrDieLabel,
  getEndPosition,
  getJumpTarget,
  getLeaderIndex,
  getPassTarget,
  getRoundSteps,
  getTrackArray,
  shuffle,
  CARDS,
  MOM_VAL,
  SLIP_VAL,
} from './game/engine';
import {
  DEFAULT_TRACK_SEGMENTS,
  loadStoredTrack,
  saveStoredTrack,
} from './game/tracks';
import { sound } from './game/audio';
import { HUD } from './components/HUD';
import { TrackCanvas } from './components/TrackCanvas';
import { ActionControls } from './components/ActionControls';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { TrackEditorModal } from './components/TrackEditorModal';
import { RaceLogDrawer } from './components/RaceLogDrawer';

export default function App() {
  // Game options
  const [options, setOptions] = useState<GameOptions>({
    mode: 'dice',
    bot: 'medium',
    laps: 1,
    mom: true,
    head: true,
    skip: false,
    pass: false,
  });

  // Track segments
  const [segments, setSegments] = useState<string[]>(() =>
    loadStoredTrack('dice')
  );

  // Sound enabled
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);

  // Modals & Drawers
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editorActive, setEditorActive] = useState(false);

  // Precomputed track array
  const trackArray = useMemo(() => getTrackArray(segments), [segments]);
  const trackLength = trackArray.length;
  const endPos = useMemo(
    () => getEndPosition(segments, options.laps),
    [segments, options.laps]
  );

  // Game state
  const [gameState, setGameState] = useState<GameState>(() => ({
    round: 1,
    step: 0,
    lead: 0,
    tr: 1,
    spd: [0, 0],
    dv: [0, 0],
    phase: 'roll',
    P: [createInitialPlayer(0), createInitialPlayer(1)],
    picks: [null, null],
    log: [
      {
        id: 'init-1',
        t: '🏁 Slipstream Tactical Racer ready. Roll dice to begin!',
        n: 1,
      },
    ],
    win: null,
    sel: createEmptySelection(),
  }));

  // Re-sync track when mode changes
  useEffect(() => {
    const loaded = loadStoredTrack(options.mode);
    setSegments(loaded);
  }, [options.mode]);

  // Restart / Initialize game
  const resetGame = useCallback(() => {
    const randomStartLead =
      options.bot === 'medium' ? (Math.random() < 0.5 ? 1 : 0) : 0;

    const initialLogs: LogEntry[] = [
      {
        id: 'start-0',
        t: `Race Initialized (${options.mode.toUpperCase()} · ${options.laps} Lap${
          options.laps > 1 ? 's' : ''
        })`,
        n: 1,
      },
    ];

    if (options.bot === 'medium') {
      initialLogs.push({
        id: 'start-1',
        t: `Pole Position: Player ${randomStartLead + 1}${
          randomStartLead === 1 ? ' (Bot)' : ''
        } leads first.`,
      });
    }

    setGameState({
      round: 1,
      step: 0,
      lead: randomStartLead,
      tr: 1 - randomStartLead,
      spd: [0, 0],
      dv: [0, 0],
      phase: 'roll',
      P: [createInitialPlayer(0), createInitialPlayer(1)],
      picks: [null, null],
      log: initialLogs,
      win: null,
      sel: createEmptySelection(),
    });
  }, [options]);

  // Roll / Draw for new round
  const handleRoll = useCallback(() => {
    sound.playRoll();
    setGameState((prev) => {
      const diceCount = options.mode === 'cards' ? 3 : 5;
      const nextP = prev.P.map((p) => {
        const copy = { ...p };
        if (options.mode === 'cards') {
          if (copy.deck.length < diceCount) {
            copy.deck = shuffle(CARDS);
            copy.played = [];
          }
          copy.dice = copy.deck.splice(0, diceCount);
        } else {
          copy.dice = Array.from(
            { length: diceCount },
            () => 1 + Math.floor(Math.random() * 6)
          );
        }
        copy.used = [];
        return copy;
      }) as [typeof prev.P[0], typeof prev.P[1]];

      const newLogs = [...prev.log];
      newLogs.push({
        id: `r-${prev.round}-${Date.now()}`,
        n: 1,
        t: `— Round ${prev.round}: ${
          options.mode === 'cards' ? 'Cards drawn' : 'Dice rolled'
        } in secret —`,
      });

      // Skip rule
      if (options.skip) {
        const leader = getLeaderIndex(nextP, prev.lead);
        nextP.forEach((p, i) => {
          let k = 0;
          p.dice.forEach((d, j) => {
            if (i === leader ? d > p.dice[k] : d < p.dice[k]) {
              k = j;
            }
          });
          p.used.push(k);
        });
        newLogs.push({
          id: `skip-${Date.now()}`,
          t: `Skip rule: P${leader + 1} skips their highest; P${
            2 - leader
          } skips their lowest`,
        });
      }

      return {
        ...prev,
        step: 0,
        phase: 'pick0',
        sel: createEmptySelection(),
        P: nextP,
        log: newLogs,
      };
    });
  }, [options]);

  // Compute current reach options for highlight
  const currentReach = useMemo<ReachMap | null>(() => {
    const ph = gameState.phase;
    if (options.bot === 'medium' && ph === 'react' && gameState.tr === 1) {
      return null;
    }
    if (!(ph === 'pick0' || ph === 'pick1' || ph === 'react')) {
      return null;
    }
    const activeIdx = getActivePlayerIndex(gameState);
    const leader = getLeaderIndex(gameState.P, gameState.lead);
    if (ph !== 'react' && activeIdx !== leader) {
      return null;
    }
    if (gameState.sel.die === null) {
      return null;
    }
    const dieVal = gameState.P[activeIdx].dice[gameState.sel.die];
    const val = calculateEffectiveValue(
      activeIdx,
      gameState.sel,
      dieVal,
      gameState,
      options
    );
    return computeReach(activeIdx, val, gameState, trackArray, options);
  }, [gameState, options, trackArray]);

  // Select Die or Card
  const handleSelectDie = useCallback(
    (dieIdx: number) => {
      sound.playSelect();
      setGameState((prev) => {
        const activeIdx = getActivePlayerIndex(prev);
        const p = prev.P[activeIdx];
        const nextSel: TargetSelection = { ...prev.sel, die: dieIdx };

        // Validate target
        if (nextSel.tgt) {
          const val = calculateEffectiveValue(
            activeIdx,
            nextSel,
            p.dice[dieIdx],
            prev,
            options
          );
          const reach = computeReach(activeIdx, val, prev, trackArray, options);
          const key = `${nextSel.tgt.pos}:${nextSel.tgt.lane}`;
          if (!(key in reach)) {
            nextSel.tgt = null;
          }
        }

        return { ...prev, sel: nextSel };
      });
    },
    [options, trackArray]
  );

  // Adjust slipstream or momentum tokens
  const handleAdjustTokens = useCallback(
    (type: 'slip' | 'mom', delta: number) => {
      sound.playSelect();
      setGameState((prev) => {
        const activeIdx = getActivePlayerIndex(prev);
        const p = prev.P[activeIdx];
        const nextVal = Math.max(0, Math.min(p[type], prev.sel[type] + delta));
        const nextSel: TargetSelection = { ...prev.sel, [type]: nextVal };

        if (nextSel.tgt && nextSel.die !== null) {
          const val = calculateEffectiveValue(
            activeIdx,
            nextSel,
            p.dice[nextSel.die],
            prev,
            options
          );
          const reach = computeReach(activeIdx, val, prev, trackArray, options);
          const key = `${nextSel.tgt.pos}:${nextSel.tgt.lane}`;
          if (!(key in reach)) {
            nextSel.tgt = null;
          }
        }

        return { ...prev, sel: nextSel };
      });
    },
    [options, trackArray]
  );

  // Tap track space
  const handleSelectTarget = useCallback((pos: number, lane: number) => {
    sound.playSelect();
    setGameState((prev) => ({
      ...prev,
      sel: { ...prev.sel, tgt: { pos, lane } },
    }));
  }, []);

  // Movement execution
  const executeMove = useCallback(
    (
      playerIdx: number,
      pick: TargetSelection,
      currentState: GameState
    ): { nextState: GameState; winIndex: number | null } => {
      sound.playMove();
      const p = { ...currentState.P[playerIdx] };
      const die = p.dice[pick.die!];
      const base = baseValue(die, options.mode);
      const effectiveSpd = calculateSpeed(playerIdx, die, currentState, options);
      const val = calculateEffectiveValue(playerIdx, pick, die, currentState, options);
      const reach = computeReach(playerIdx, val, currentState, trackArray, options);

      let tg = pick.tgt;
      let key = tg ? `${tg.pos}:${tg.lane}` : '';
      if (!tg || !(key in reach)) {
        const lastKey = Object.keys(reach).pop()!;
        const [qPos, qLane] = lastKey.split(':').map(Number);
        tg = { pos: qPos, lane: qLane };
        key = lastKey;
      }

      p.slip -= pick.slip;
      p.mom -= pick.mom;
      if (options.head) p.head = 0;
      p.used = [...p.used, pick.die!];
      p.tot += base;
      p.cnt++;
      if (options.mode === 'cards') {
        p.played = [...p.played, die];
      }

      const f0 = p.pos;
      const passTarget = getPassTarget(playerIdx, tg.pos, currentState, trackArray, options);
      p.pos = tg.pos;
      p.lane = tg.lane;

      const jumpTarget = getJumpTarget(playerIdx, die, p.pos, currentState, trackArray, options);
      let specialMoveMsg = '';

      if (jumpTarget) {
        p.pos = jumpTarget;
        p.lane = trackArray[jumpTarget % trackLength] === 'S' ? 0 : tg.lane;
        specialMoveMsg = ` ★ jumps ahead to space ${jumpTarget}`;
        sound.playBoost();
      } else if (passTarget) {
        p.pos = passTarget;
        p.lane = trackArray[passTarget % trackLength] === 'S' ? 0 : tg.lane;
        specialMoveMsg = ` ➜ slipstream pass to space ${passTarget}`;
        sound.playBoost();
      }

      const nextSpd = [...currentState.spd] as [number, number];
      const nextDv = [...currentState.dv] as [number, number];
      nextSpd[playerIdx] = val;
      nextDv[playerIdx] = die;

      const logMsg: LogEntry = {
        id: `move-${Date.now()}-${Math.random()}`,
        t: `P${playerIdx + 1}: ${
          options.mode === 'cards' ? 'card' : 'die'
        } ${getCardOrDieLabel(die, options.mode)}${
          effectiveSpd !== base ? ` -${base - effectiveSpd} headwind` : ''
        }${pick.slip ? ` +${pick.slip * SLIP_VAL} slipstream` : ''}${
          pick.mom ? ` +${pick.mom * MOM_VAL} momentum` : ''
        } = ${val} → #${p.pos} (${p.lane ? 'out' : 'in'})${specialMoveMsg}`,
      };

      const newLogs = [...currentState.log, logMsg];

      // Lap crossing log
      if (
        Math.floor(p.pos / trackLength) > Math.floor(f0 / trackLength) &&
        p.pos < endPos
      ) {
        newLogs.push({
          id: `lap-${Date.now()}`,
          t: `🏁 P${playerIdx + 1} starts Lap ${
            Math.floor(p.pos / trackLength) + 1
          }/${options.laps}`,
        });
      }

      let winIndex = currentState.win;
      if (p.pos >= endPos) {
        winIndex = playerIdx;
        sound.playWin();
        newLogs.push({
          id: `win-${Date.now()}`,
          t: `🏆 Player ${playerIdx + 1} crosses the finish line!`,
        });
      }

      const nextP = [...currentState.P] as [typeof p, typeof p];
      nextP[playerIdx] = p;

      return {
        nextState: {
          ...currentState,
          P: nextP,
          spd: nextSpd,
          dv: nextDv,
          log: newLogs,
          win: winIndex,
        },
        winIndex,
      };
    },
    [options, trackArray, trackLength, endPos]
  );

  // Conclude the step and calculate drafting tokens
  const finishStep = useCallback(
    (stateAfterBothMoved: GameState) => {
      const p0 = stateAfterBothMoved.P[0];
      const p1 = stateAfterBothMoved.P[1];
      const outLogs: LogEntry[] = [];
      const updatedP0 = { ...p0 };
      const updatedP1 = { ...p1 };

      if (stateAfterBothMoved.win === null) {
        const diff = updatedP0.pos - updatedP1.pos;
        const gap = Math.abs(diff);
        const leaderIdx = diff < 0 ? 1 : 0;
        const leaderSpeed = stateAfterBothMoved.spd[leaderIdx];
        const trailerIdx = 1 - leaderIdx;

        const isCardsDraft =
          options.mode === 'cards' &&
          (leaderSpeed >= 8 ? gap >= 1 && gap <= 2 : leaderSpeed >= 4 && gap === 1);

        if (options.mode === 'dice' && gap >= 1) {
          const award = gap === 1 ? 2 : 1;
          if (trailerIdx === 0) {
            updatedP0.slip = Math.min(4, updatedP0.slip + award);
          } else {
            updatedP1.slip = Math.min(4, updatedP1.slip + award);
          }
          outLogs.push({
            id: `token-slip-${Date.now()}`,
            t: `P${trailerIdx + 1} is ${gap} behind → +${award} slipstream`,
          });
        }

        if (isCardsDraft) {
          if (trailerIdx === 0) {
            updatedP0.slip = Math.min(4, updatedP0.slip + 1);
          } else {
            updatedP1.slip = Math.min(4, updatedP1.slip + 1);
          }
          outLogs.push({
            id: `token-cardslip-${Date.now()}`,
            t: `P${trailerIdx + 1} is ${gap} behind (leader spd ${leaderSpeed}) → +1 slipstream${
              options.head ? `; P${leaderIdx + 1} gets headwind` : ''
            }`,
          });

          if (options.head) {
            if (leaderIdx === 0) {
              updatedP0.head = Math.min(2, updatedP0.head + 1);
            } else {
              updatedP1.head = Math.min(2, updatedP1.head + 1);
            }
          }
        }

        // End of round momentum
        const totalSteps = getRoundSteps(options);
        if (options.mom && stateAfterBothMoved.step + 1 >= totalSteps) {
          const roundDiff = updatedP0.pos - updatedP1.pos;
          if (roundDiff !== 0) {
            const roundLeader = roundDiff > 0 ? 0 : 1;
            if (roundLeader === 0) {
              updatedP0.mom = Math.min(4, updatedP0.mom + 1);
            } else {
              updatedP1.mom = Math.min(4, updatedP1.mom + 1);
            }
            outLogs.push({
              id: `token-mom-${Date.now()}`,
              t: `End of Round ${stateAfterBothMoved.round}: P${
                roundLeader + 1
              } leads → +1 momentum`,
            });
          }
        }
      }

      setGameState({
        ...stateAfterBothMoved,
        step: stateAfterBothMoved.step + 1,
        P: [updatedP0, updatedP1],
        picks: [null, null],
        phase: 'result',
        log: [...stateAfterBothMoved.log, ...outLogs],
      });
    },
    [options]
  );

  // Reveal Phase: leader moves, then trailer enters react phase
  const handleReveal = useCallback(
    (picks: [TargetSelection, TargetSelection], state: GameState) => {
      const leader = getLeaderIndex(state.P, state.lead);
      const trailer = 1 - leader;

      const newLog: LogEntry = {
        id: `reveal-${Date.now()}`,
        n: 1,
        t: `Step ${state.step + 1}/${getRoundSteps(options)}: Revealed — P${
          leader + 1
        } (Leader) ${getCardOrDieLabel(
          state.P[leader].dice[picks[leader].die!],
          options.mode
        )}, P${trailer + 1} (Trailer) ${getCardOrDieLabel(
          state.P[trailer].dice[picks[trailer].die!],
          options.mode
        )}`,
      };

      const stateWithLog = { ...state, log: [...state.log, newLog] };
      const { nextState, winIndex } = executeMove(leader, picks[leader], stateWithLog);

      if (winIndex !== null) {
        setGameState(nextState);
        return;
      }

      // Trailer reacts
      const trailerReactState: GameState = {
        ...nextState,
        lead: leader,
        tr: trailer,
        sel: {
          die: picks[trailer].die,
          slip: 0,
          mom: 0,
          tgt: null,
        },
        phase: 'react',
      };

      setGameState(trailerReactState);

      // If Bot is trailer, trigger its reaction after small delay
      if (options.bot === 'medium' && trailer === 1) {
        setTimeout(() => {
          setGameState((curr) => {
            if (curr.phase !== 'react' || curr.tr !== 1) return curr;
            const botReaction = computeBotReact(curr, trackArray, options);
            const botPick: TargetSelection = {
              die: curr.sel.die,
              slip: botReaction.sl,
              mom: botReaction.mo,
              tgt: botReaction.tgt,
            };
            const result = executeMove(1, botPick, curr);
            if (result.winIndex !== null) {
              return result.nextState;
            }
            finishStep(result.nextState);
            return result.nextState;
          });
        }, 700);
      }
    },
    [options, executeMove, finishStep, trackArray]
  );

  // Lock In choice
  const handleLockIn = useCallback(() => {
    sound.playSelect();
    const activeIdx = getActivePlayerIndex(gameState);
    const leader = getLeaderIndex(gameState.P, gameState.lead);

    if (gameState.sel.die === null || (activeIdx === leader && !gameState.sel.tgt)) {
      return;
    }

    const nextPicks: [TargetSelection | null, TargetSelection | null] = [
      ...gameState.picks,
    ];
    nextPicks[activeIdx] = gameState.sel;

    if (gameState.phase === 'pick0') {
      if (options.bot === 'medium') {
        // Player 1 picked, Bot now picks
        const botLeaderChoice =
          leader === 1
            ? computeBotLead(gameState, trackArray, options)
            : null;
        const botTrailerChoice =
          leader === 0
            ? computeBotTrail(gameState, trackArray, options)
            : null;

        const botPick: TargetSelection = {
          die: botLeaderChoice ? botLeaderChoice.d : botTrailerChoice!.d,
          slip: botLeaderChoice?.sl ?? 0,
          mom: botLeaderChoice?.mo ?? 0,
          tgt: botLeaderChoice?.tgt ?? null,
        };

        nextPicks[1] = botPick;
        handleReveal(
          [nextPicks[0]!, nextPicks[1]!],
          { ...gameState, picks: nextPicks }
        );
      } else {
        // Human 2P pass and play
        setGameState((prev) => ({
          ...prev,
          picks: nextPicks,
          phase: 'cover',
        }));
      }
    } else {
      // Phase pick1: both locked in, reveal!
      handleReveal(
        [nextPicks[0]!, nextPicks[1]!],
        { ...gameState, picks: nextPicks }
      );
    }
  }, [gameState, options, trackArray, handleReveal]);

  // Player 2 takes over in pass-and-play
  const handleStartPlayer2 = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: 'pick1',
      sel: createEmptySelection(),
    }));
  }, []);

  // Trailer reacts and moves
  const handleReact = useCallback(() => {
    if (!gameState.sel.tgt) return;
    const { nextState, winIndex } = executeMove(gameState.tr, gameState.sel, gameState);
    if (winIndex !== null) {
      setGameState(nextState);
      return;
    }
    finishStep(nextState);
  }, [gameState, executeMove, finishStep]);

  // Proceed to next step or next round
  const handleNextStep = useCallback(() => {
    const totalSteps = getRoundSteps(options);
    if (gameState.win !== null) {
      setGameState((prev) => ({ ...prev, phase: 'over' }));
    } else if (gameState.step >= totalSteps) {
      setGameState((prev) => ({
        ...prev,
        round: prev.round + 1,
        phase: 'roll',
      }));
    } else {
      setGameState((prev) => ({
        ...prev,
        phase: 'pick0',
        sel: createEmptySelection(),
      }));
    }
  }, [gameState, options]);

  // Editor toggle on cell tap
  const handleToggleCellEditor = useCallback(
    (cellIndex: number) => {
      let k = cellIndex;
      const nextSegs = [...segments];
      for (let j = 0; j < 9; j++) {
        if (k < nextSegs[j].length) {
          const arr = [...nextSegs[j]];
          arr[k] = arr[k] === 'S' ? 'T' : 'S';
          nextSegs[j] = arr.join('');
          break;
        }
        k -= nextSegs[j].length;
      }
      setSegments(nextSegs);
      saveStoredTrack(options.mode, nextSegs);
      resetGame();
    },
    [segments, options.mode, resetGame]
  );

  return (
    <div className="h-full h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-stone-950 text-stone-100 select-none touch-manipulation">
      {/* 1. Top HUD Header */}
      <HUD
        gameState={gameState}
        options={options}
        trackLength={trackLength}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(sound.toggle())}
        onOpenRules={() => setRulesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenEditor={() => setEditorOpen(true)}
        onOpenLog={() => setLogOpen(true)}
      />

      {/* 2. Interactive SVG Track (Flex-1, auto-fit, zero scroll!) */}
      <main className="flex-1 min-h-0 w-full relative flex items-center justify-center p-1 sm:p-2 overflow-hidden">
        <TrackCanvas
          segments={segments}
          gameState={gameState}
          options={options}
          reach={currentReach}
          selectedTarget={gameState.sel.tgt}
          editorMode={editorActive}
          onSelectTarget={handleSelectTarget}
          onToggleCellEditor={handleToggleCellEditor}
        />
      </main>

      {/* 3. Bottom Ergonomic Action Deck */}
      <ActionControls
        gameState={gameState}
        options={options}
        onRoll={handleRoll}
        onSelectDie={handleSelectDie}
        onAdjustTokens={handleAdjustTokens}
        onLockIn={handleLockIn}
        onReact={handleReact}
        onStartPlayer2={handleStartPlayer2}
        onNextStep={handleNextStep}
        onResetGame={resetGame}
      />

      {/* Modals & Overlays */}
      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        options={options}
        p1={gameState.P[0]}
        p2={gameState.P[1]}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        options={options}
        onChangeOptions={setOptions}
        onRestartRace={resetGame}
      />

      <TrackEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        segments={segments}
        options={options}
        editorActive={editorActive}
        onToggleEditorActive={setEditorActive}
        onUpdateSegments={setSegments}
        onRestartRace={resetGame}
      />

      <RaceLogDrawer
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        logs={gameState.log}
        onClearLogs={() => setGameState((prev) => ({ ...prev, log: [] }))}
      />
    </div>
  );
}
