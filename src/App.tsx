/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  GameMode,
  GameOptions,
  GameState,
  LogEntry,
  ReachMap,
  TargetSelection,
  TrackDefinition,
} from './types/game';
import {
  baseValue,
  calculateEffectiveValue,
  calculateSpeed,
  computeBotLead,
  computeBotReact,
  computeBotTrail,
  computeReach,
  computeStepFinishedState,
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
  getCircuitById,
  loadCurrentCircuitId,
  loadStoredTrack,
  saveCurrentCircuitId,
  saveStoredTrack,
} from './game/tracks';
import { sound } from './game/audio';
import { HUD } from './components/HUD';
import { TrackCanvas } from './components/TrackCanvas';
import { ActionControls } from './components/ActionControls';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { TrackEditorModal } from './components/TrackEditorModal';
import { TrackSelectorModal } from './components/TrackSelectorModal';
import { RaceLogDrawer } from './components/RaceLogDrawer';

export default function App() {
  // Game options
  const [options, setOptions] = useState<GameOptions>({
    mode: 'dice',
    bot: 'medium',
    laps: 2,
    mom: true,
    head: true,
    skip: true,
    pass: false,
  });

  // Current Circuit (Monza, Silverstone, Suzuka, Monaco, etc.)
  const [currentCircuit, setCurrentCircuit] = useState<TrackDefinition>(() =>
    getCircuitById(loadCurrentCircuitId())
  );

  // Track segments (9 rectilinear segments)
  const [segments, setSegments] = useState<string[]>(
    () => currentCircuit.segments ?? loadStoredTrack('dice')
  );

  // Sound enabled
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);

  // Modals & Drawers
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [editorActive, setEditorActive] = useState(false);

  // Precomputed track arrays & outside lane metadata for corners
  const trackArray = useMemo(() => {
    if (currentCircuit.sections && currentCircuit.sections.length > 0) {
      return currentCircuit.sections.map((s) => (s === 'L' || s === 'R' ? 'C' : s));
    }
    return segments.join('').split('') as ('T' | 'S' | 'C')[];
  }, [currentCircuit, segments]);

  const outsideLanes = useMemo(() => {
    if (currentCircuit.sections && currentCircuit.sections.length > 0) {
      return currentCircuit.sections.map((s) => (s === 'L' ? (1 as 0 | 1) : (0 as 0 | 1)));
    }
    return trackArray.map((c) => (c === 'C' ? (1 as 0 | 1) : (1 as 0 | 1)));
  }, [currentCircuit, trackArray]);
  const trackLength = trackArray.length;
  const endPos = useMemo(
    () => options.laps * trackLength,
    [options.laps, trackLength]
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
        t: `🏁 ${currentCircuit.name} ready (${trackLength} spaces · ${currentCircuit.country}). Roll dice to start!`,
        n: 1,
      },
    ],
    win: null,
    sel: createEmptySelection(),
    discardedCards: [[], []],
    discardedDice: [[], []],
  }));

  // Dice roll animation state
  const [isRolling, setIsRolling] = useState(false);
  const rollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    };
  }, []);

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
      discardedCards: [[], []],
      discardedDice: [[], []],
    });
  }, [options]);

  // Roll / Draw for new round with animation & round 1 no-discard rule
  const handleRoll = useCallback(() => {
    if (isRolling) return;

    if (options.mode === 'dice') {
      sound.playDiceTumble();
      setIsRolling(true);
    } else {
      sound.playRoll();
    }

    const rollDuration = options.mode === 'dice' ? 700 : 0;

    rollTimerRef.current = setTimeout(() => {
      sound.playRoll();
      setIsRolling(false);
      setGameState((prev) => {
        const diceCount = options.mode === 'cards' ? 3 : 5;
        let didReshuffle = false;
        const nextP = prev.P.map((p) => {
          const copy = { ...p };
          if (options.mode === 'cards') {
            if (copy.deck.length < diceCount) {
              copy.deck = shuffle(CARDS);
              copy.played = [];
              didReshuffle = true;
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

        // Discard / Skip rule:
        // CRITICAL: Do NOT discard for either player in the very first turn of the race (round 1)!
        const nextDiscardedDice: [number[], number[]] = [[], []];
        const shouldDiscard = options.skip && prev.round > 1;

        if (shouldDiscard) {
          const leader = getLeaderIndex(nextP, prev.lead);
          nextP.forEach((p, i) => {
            let k = 0;
            p.dice.forEach((d, j) => {
              if (i === leader ? d > p.dice[k] : d < p.dice[k]) {
                k = j;
              }
            });
            p.used.push(k);
            nextDiscardedDice[i] = [k];
          });

          const leaderVal = nextP[leader].dice[nextDiscardedDice[leader][0]];
          const trailerVal = nextP[1 - leader].dice[nextDiscardedDice[1 - leader][0]];
          newLogs.push({
            id: `skip-${Date.now()}`,
            t: `Discard rule: P${leader + 1} (leader) discards highest (${leaderVal}); P${
              2 - leader
            } (trailer) discards lowest (${trailerVal})`,
          });

          setTimeout(() => {
            sound.playDiscard();
          }, 150);
        } else if (prev.round === 1) {
          newLogs.push({
            id: `r1-nodiscard-${Date.now()}`,
            t: `Opening round: No dice discarded on the first turn of the race! All 5 dice active.`,
          });
        }

        return {
          ...prev,
          step: 0,
          phase: 'pick0',
          sel: createEmptySelection(),
          P: nextP,
          log: newLogs,
          discardedCards: didReshuffle ? [[], []] : (prev.discardedCards ?? [[], []]),
          discardedDice: nextDiscardedDice,
        };
      });
    }, rollDuration);
  }, [options, isRolling]);

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
    return computeReach(activeIdx, val, gameState, trackArray, options, outsideLanes);
  }, [gameState, options, trackArray, outsideLanes]);

  // Select Die or Card
  const handleSelectDie = useCallback(
    (dieIdx: number) => {
      sound.playSelect();
      setGameState((prev) => {
        const activeIdx = getActivePlayerIndex(prev);
        const p = prev.P[activeIdx];
        const nextSel: TargetSelection = { ...prev.sel, die: dieIdx };

        const val = calculateEffectiveValue(
          activeIdx,
          nextSel,
          p.dice[dieIdx],
          prev,
          options
        );
        const reach = computeReach(activeIdx, val, prev, trackArray, options, outsideLanes);

        // Validate existing target or auto-select valid destination
        const currentKey = nextSel.tgt ? `${nextSel.tgt.pos}:${nextSel.tgt.lane}` : '';
        if (!currentKey || !(currentKey in reach)) {
          const leader = getLeaderIndex(prev.P, prev.lead);
          const shouldAutoSelect = prev.phase === 'react' || activeIdx === leader;
          if (shouldAutoSelect) {
            const reachKeys = Object.keys(reach).filter((k) => k !== `${p.pos}:${p.lane}`);
            if (reachKeys.length > 0) {
              const innerKey = reachKeys.find((k) => k.endsWith(':0')) || reachKeys[0];
              const [tgPos, tgLane] = innerKey.split(':').map(Number);
              nextSel.tgt = { pos: tgPos, lane: tgLane };
            } else {
              nextSel.tgt = null;
            }
          } else {
            nextSel.tgt = null;
          }
        }

        return { ...prev, sel: nextSel };
      });
    },
    [options, trackArray, outsideLanes]
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

        if (nextSel.die !== null) {
          const val = calculateEffectiveValue(
            activeIdx,
            nextSel,
            p.dice[nextSel.die],
            prev,
            options
          );
          const reach = computeReach(activeIdx, val, prev, trackArray, options, outsideLanes);
          const currentKey = nextSel.tgt ? `${nextSel.tgt.pos}:${nextSel.tgt.lane}` : '';
          if (!currentKey || !(currentKey in reach)) {
            const reachKeys = Object.keys(reach).filter((k) => k !== `${p.pos}:${p.lane}`);
            if (reachKeys.length > 0) {
              const innerKey = reachKeys.find((k) => k.endsWith(':0')) || reachKeys[0];
              const [tgPos, tgLane] = innerKey.split(':').map(Number);
              nextSel.tgt = { pos: tgPos, lane: tgLane };
            } else {
              nextSel.tgt = null;
            }
          }
        }

        return { ...prev, sel: nextSel };
      });
    },
    [options, trackArray, outsideLanes]
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
      const reach = computeReach(playerIdx, val, currentState, trackArray, options, outsideLanes);

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
          t: `🏆 Player ${playerIdx + 1} crosses the finish line and wins!`,
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
          phase: winIndex !== null ? 'over' : currentState.phase,
        },
        winIndex,
      };
    },
    [options, trackArray, trackLength, endPos, outsideLanes]
  );

  // Reveal Phase: leader moves, then trailer enters react phase
  const handleReveal = useCallback(
    (picks: [TargetSelection | null, TargetSelection | null], state: GameState) => {
      const hasInvalidPick = picks.some((pick, playerIdx) =>
        !pick ||
        pick.die === null ||
        !Number.isInteger(pick.die) ||
        pick.die < 0 ||
        pick.die >= state.P[playerIdx].dice.length
      );

      if (hasInvalidPick) {
        setGameState({
          ...state,
          phase: 'pick0',
          picks: [null, null],
          sel: createEmptySelection(),
          log: [
            ...state.log,
            { id: `invalid-pick-${Date.now()}`, t: 'Invalid choice; please select again.' },
          ],
        });
        return;
      }

      const validPicks = picks as [TargetSelection, TargetSelection];
      const leader = getLeaderIndex(state.P, state.lead);
      const trailer = 1 - leader;

      const newLog: LogEntry = {
        id: `reveal-${Date.now()}`,
        n: 1,
        t: `Step ${state.step + 1}/${getRoundSteps(options, state.round)}: Revealed — P${
          leader + 1
        } (Leader) ${getCardOrDieLabel(
          state.P[leader].dice[validPicks[leader].die!],
          options.mode
        )}, P${trailer + 1} (Trailer) ${getCardOrDieLabel(
          state.P[trailer].dice[validPicks[trailer].die!],
          options.mode
        )}`,
      };

      const stateWithLog = { ...state, log: [...state.log, newLog] };
      const { nextState, winIndex } = executeMove(leader, validPicks[leader], stateWithLog);

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
          die: validPicks[trailer].die,
          slip: 0,
          mom: 0,
          tgt: null,
        },
        phase: 'react',
      };

      // If Human is trailer, auto-select first reachable space for convenience
      if (!(options.bot === 'medium' && trailer === 1)) {
        const val = calculateEffectiveValue(
          trailer,
          trailerReactState.sel,
          state.P[trailer].dice[validPicks[trailer].die!],
          trailerReactState,
          options
        );
        const reach = computeReach(trailer, val, trailerReactState, trackArray, options, outsideLanes);
        const reachKeys = Object.keys(reach).filter(
          (k) => k !== `${state.P[trailer].pos}:${state.P[trailer].lane}`
        );
        if (reachKeys.length > 0) {
          const innerKey = reachKeys.find((k) => k.endsWith(':0')) || reachKeys[0];
          const [tgPos, tgLane] = innerKey.split(':').map(Number);
          trailerReactState.sel.tgt = { pos: tgPos, lane: tgLane };
        }
      }

      setGameState(trailerReactState);

      // If Bot is trailer, trigger its reaction after small delay
      if (options.bot === 'medium' && trailer === 1) {
        setTimeout(() => {
          setGameState((curr) => {
            if (curr.phase !== 'react' || curr.tr !== 1) return curr;
            const botReaction = computeBotReact(curr, trackArray, options, outsideLanes);
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
            return computeStepFinishedState(result.nextState, options);
          });
        }, 700);
      }
    },
    [options, executeMove, trackArray, outsideLanes]
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
            ? computeBotLead(gameState, trackArray, options, outsideLanes)
            : null;
        const botTrailerChoice =
          leader === 0
            ? computeBotTrail(gameState, trackArray, options, outsideLanes)
            : null;

        const botPick: TargetSelection = {
          die: botLeaderChoice ? botLeaderChoice.d : botTrailerChoice!.d,
          slip: botLeaderChoice?.sl ?? 0,
          mom: botLeaderChoice?.mo ?? 0,
          tgt: botLeaderChoice?.tgt ?? null,
        };

        nextPicks[1] = botPick;
        handleReveal(nextPicks, { ...gameState, picks: nextPicks });
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
      handleReveal(nextPicks, { ...gameState, picks: nextPicks });
    }
  }, [gameState, options, trackArray, outsideLanes, handleReveal]);

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
    setGameState(computeStepFinishedState(nextState, options));
  }, [gameState, executeMove, options]);

  // Proceed to next step or next round
  const handleNextStep = useCallback(() => {
    const totalSteps = getRoundSteps(options, gameState.round);
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

  // Switch circuit from selector
  const handleSelectCircuit = useCallback(
    (newCircuit: TrackDefinition) => {
      setCurrentCircuit(newCircuit);
      setSegments(newCircuit.segments);
      saveCurrentCircuitId(newCircuit.id);
      saveStoredTrack(options.mode, newCircuit.segments);
      if (newCircuit.lapsDefault) {
        setOptions((prev) => ({ ...prev, laps: newCircuit.lapsDefault }));
      }
      const randomStartLead =
        options.bot === 'medium' ? (Math.random() < 0.5 ? 1 : 0) : 0;
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
        log: [
          {
            id: `circuit-${Date.now()}`,
            t: `🏁 Circuit selected: ${newCircuit.name} (${newCircuit.segments.join('').length} spaces · ${newCircuit.country}). Ready to race!`,
            n: 1,
          },
        ],
        win: null,
        sel: createEmptySelection(),
        discardedCards: [[], []],
      });
    },
    [options.bot, options.mode]
  );

  // Update segments from Track Architect
  const handleUpdateSegments = useCallback(
    (newSegments: string[]) => {
      setSegments(newSegments);
      setCurrentCircuit((prev) => ({
        ...prev,
        segments: newSegments,
      }));
      saveStoredTrack(options.mode, newSegments);
    },
    [options.mode]
  );

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
      setCurrentCircuit((prev) => ({
        ...prev,
        segments: nextSegs,
      }));
      saveStoredTrack(options.mode, nextSegs);
      resetGame();
    },
    [segments, options.mode, resetGame]
  );

  return (
    <div className="h-[100dvh] min-h-0 w-full flex flex-col justify-between overflow-hidden bg-stone-950 text-stone-100 select-none touch-manipulation">
      {/* 1. Top HUD Header */}
      <HUD
        circuit={currentCircuit}
        gameState={gameState}
        options={options}
        trackLength={trackLength}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(sound.toggle())}
        onOpenRules={() => setRulesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenEditor={() => setEditorOpen(true)}
        onOpenLog={() => setLogOpen(true)}
        onOpenTrackSelector={() => setTrackSelectorOpen(true)}
      />

      {/* 2. Interactive SVG Track (Flex-1, auto-fit, zero scroll!) */}
      <main className="flex-1 min-h-0 w-full relative flex items-center justify-center p-1 sm:p-2 overflow-hidden">
        <TrackCanvas
          track={currentCircuit}
          segments={segments}
          gameState={gameState}
          options={options}
          reach={currentReach}
          selectedTarget={gameState.sel.tgt}
          editorMode={editorActive}
          onSelectTarget={handleSelectTarget}
          onToggleCellEditor={handleToggleCellEditor}
          onOpenTrackSelector={() => setTrackSelectorOpen(true)}
        />
      </main>

      {/* 3. Bottom Ergonomic Action Deck */}
      <ActionControls
        gameState={gameState}
        options={options}
        isRolling={isRolling}
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
      <TrackSelectorModal
        isOpen={trackSelectorOpen}
        onClose={() => setTrackSelectorOpen(false)}
        currentCircuitId={currentCircuit.id}
        onSelectCircuit={handleSelectCircuit}
        onOpenEditor={() => setEditorOpen(true)}
      />

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
        currentCircuit={currentCircuit}
        onSelectCircuit={handleSelectCircuit}
        segments={segments}
        options={options}
        editorActive={editorActive}
        onToggleEditorActive={setEditorActive}
        onUpdateSegments={handleUpdateSegments}
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
