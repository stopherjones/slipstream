/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BotDifficulty,
  ChampionshipState,
  GameOptions,
  GameState,
  LogEntry,
  PlayerState,
  ReachMap,
  TargetSelection,
  TrackDefinition,
  TrackSectionType,
} from './types/game';
import {
  calculateEffectiveValue,
  calculateSpeed,
  comparePlayerPositions,
  computeBotMove,
  computeReach,
  computeStepFinishedState,
  createEmptySelection,
  createInitialPlayer,
  getEndPosition,
  getInsideLane,
  getLeaderIndex,
  getPassTarget,
  getRoundSteps,
  getTrackArray,
  getTrackLength,
  getTurnOrder,
  shuffle,
  MOM_VAL,
  SLIP_VAL,
} from './game/engine';
import {
  DEFAULT_TRACK_SEGMENTS,
  getAllAvailableTracks,
  getCircuitById,
  getDailyTrack,
  loadCurrentCircuitId,
  loadStoredTrack,
  saveCurrentCircuitId,
  saveStoredTrack,
} from './game/tracks';
import { getTrackTheme } from './game/trackThemes';
import { sound } from './game/audio';
import { HUD } from './components/HUD';
import { TrackCanvas } from './components/TrackCanvas';
import { ActionControls } from './components/ActionControls';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { TrackEditorModal } from './components/TrackEditorModal';
import { TrackSelectorModal } from './components/TrackSelectorModal';
import { RaceLogDrawer } from './components/RaceLogDrawer';
import { HomePage } from './components/HomePage';
import { ChampionshipStandingsModal } from './components/ChampionshipStandingsModal';

/**
 * Creates unique, randomized starting grid positions behind the start / finish line.
 * All players line up in their own cell, in a random allocation, behind the start/finish line.
 */
function createStartingGrid(
  numPlayers: number,
  sections: TrackSectionType[] | undefined,
  trackLength: number
) {
  const slots: { pos: number; lane: 0 | 1 }[] = [];
  let row = -1;

  while (slots.length < numPlayers) {
    const inside = getInsideLane(row, sections, trackLength);
    const outside = (1 - inside) as 0 | 1;

    // Both cells at position 'row' are available behind the finish line
    slots.push({ pos: row, lane: inside });
    if (slots.length < numPlayers) {
      slots.push({ pos: row, lane: outside });
    }
    row--;
  }

  // Random allocation of drivers to starting slots
  const shuffledSlots = shuffle(slots.slice(0, numPlayers));
  return shuffledSlots.map((slot) => createInitialPlayer(slot.pos, slot.lane));
}

export default function App() {
  // Navigation Screen State ('home' vs 'race')
  const [screen, setScreen] = useState<'home' | 'race'>('home');

  // Game options (pure dice game, no cards, no headwind)
  const [options, setOptions] = useState<GameOptions>({
    bot: 'medium',
    botCount: 1,
    laps: 2,
    mom: true,
    skip: true,
    pass: true,
  });

  // Championship state
  const [championship, setChampionship] = useState<ChampionshipState | null>(null);
  const [championshipModalOpen, setChampionshipModalOpen] = useState(false);
  const [lastRaceOrder, setLastRaceOrder] = useState<number[] | undefined>(undefined);
  const [completedRaceIndex, setCompletedRaceIndex] = useState<number | undefined>(undefined);

  // Sound & modal UI states
  const [soundEnabled, setSoundEnabled] = useState(() => sound.enabled);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);
  const [editorActive, setEditorActive] = useState(false);

  // Active circuit
  const [currentCircuit, setCurrentCircuit] = useState<TrackDefinition>(() => {
    const savedId = loadCurrentCircuitId();
    return getCircuitById(savedId);
  });

  const currentTheme = useMemo(
    () => getTrackTheme(currentCircuit.id),
    [currentCircuit.id]
  );

  // All available circuits (standard presets + custom saved tracks)
  const [availableTracks, setAvailableTracks] = useState<TrackDefinition[]>(() =>
    getAllAvailableTracks()
  );

  // Refresh available tracks when selector or editor opens
  const refreshAvailableTracks = useCallback(() => {
    setAvailableTracks(getAllAvailableTracks());
  }, []);

  // Daily Track for today
  const dailyTrack = useMemo(() => getDailyTrack(), []);

  // Track representation
  const [segments, setSegments] = useState<string[]>(() => {
    return loadStoredTrack('dice');
  });

  const trackArray = useMemo(() => {
    if (currentCircuit.cellTypes && currentCircuit.cellTypes.length > 0) {
      return currentCircuit.cellTypes.map((c) => c.type);
    }
    if (currentCircuit.sections && currentCircuit.sections.length > 0) {
      return currentCircuit.sections.map((s) => (s === 'T' ? 'T' : s === 'S' ? 'S' : 'C'));
    }
    return segments.join('').split('') as ('T' | 'S' | 'C')[];
  }, [currentCircuit, segments]);

  const outsideLanes = useMemo(() => {
    if (currentCircuit.sections && currentCircuit.sections.length > 0) {
      return currentCircuit.sections.map((s) => (s === 'L' || s === 'SL' ? 1 : 0));
    }
    return trackArray.map((c) => (c === 'C' ? (1 as 0 | 1) : (1 as 0 | 1)));
  }, [currentCircuit, trackArray]);

  const trackLength = trackArray.length;
  const endPos = useMemo(
    () => options.laps * trackLength,
    [options.laps, trackLength]
  );

  // Initialize starting lineup behind the finish line
  const [gameState, setGameState] = useState<GameState>(() => {
    const numPlayers = 1 + (options.botCount || 1);
    const initialPlayers = createStartingGrid(numPlayers, currentCircuit.sections, trackLength);
    const turnOrder = getTurnOrder(initialPlayers, currentCircuit.sections, trackLength);
    const initialLead = turnOrder[0];

    return {
      round: 1,
      step: 0,
      turnIdx: 0,
      turnOrder,
      lead: initialLead,
      tr: initialLead,
      spd: initialPlayers.map(() => 0),
      dv: initialPlayers.map(() => 0),
      phase: 'roll',
      P: initialPlayers,
      picks: initialPlayers.map(() => null),
      log: [
        {
          id: 'init-1',
          t: `🏁 ${currentCircuit.name} ready (${trackLength} spaces · ${currentCircuit.country}). All players lined up behind the start line in random allocation. Roll dice to start!`,
          n: 1,
        },
      ],
      win: null,
      sel: createEmptySelection(),
      discardedDice: initialPlayers.map(() => []),
    };
  });

  // Dice roll animation state
  const [isRolling, setIsRolling] = useState(false);
  const rollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    };
  }, []);

  // Restart / Initialize game
  const resetGame = useCallback(
    (overrides?: Partial<GameOptions>, circuitOverride?: TrackDefinition) => {
      const activeCircuit = circuitOverride || currentCircuit;
      const tLen =
        activeCircuit.sections?.length ||
        activeCircuit.cellTypes?.length ||
        activeCircuit.segments.reduce((acc, s) => acc + s.length, 0);

      const resetOptions = { ...options, ...overrides };
      // In Championship, always 4 players; otherwise 2–4 players based on botCount
      const numPlayers =
        championship?.active
          ? 4
          : 1 + (resetOptions.botCount || 1);

      const initialPlayers = createStartingGrid(numPlayers, activeCircuit.sections, tLen);
      const turnOrder = getTurnOrder(initialPlayers, activeCircuit.sections, tLen);
      const initialLead = turnOrder[0];

      const initialLogs: LogEntry[] = [
        {
          id: `start-0-${Date.now()}`,
          t: `Race Initialized (5d6 Dice · ${resetOptions.laps} Lap${
            resetOptions.laps > 1 ? 's' : ''
          }) · ${numPlayers} Drivers on the Grid`,
          n: 1,
        },
        {
          id: `start-1-${Date.now()}`,
          t: `🏁 Pole Position: Player ${initialLead + 1}${
            initialLead > 0 && resetOptions.bot === 'medium' ? ' (AI Bot)' : ''
          } starts first from inside lane!`,
        },
      ];

      setGameState({
        round: 1,
        step: 0,
        turnIdx: 0,
        turnOrder,
        lead: initialLead,
        tr: initialLead,
        spd: initialPlayers.map(() => 0),
        dv: initialPlayers.map(() => 0),
        phase: 'roll',
        P: initialPlayers,
        picks: initialPlayers.map(() => null),
        log: initialLogs,
        win: null,
        sel: createEmptySelection(),
        discardedDice: initialPlayers.map(() => []),
      });
    },
    [options, currentCircuit]
  );

  // Roll 5d6 dice for new round
  const handleRoll = useCallback(() => {
    if (isRolling) return;

    sound.playDiceTumble();
    setIsRolling(true);

    rollTimerRef.current = setTimeout(() => {
      sound.playRoll();
      setIsRolling(false);
      setGameState((prev) => {
        const rollPlayer = (p: typeof prev.P[number]): PlayerState => ({
          ...p,
          dice: Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6)),
          used: [] as number[],
        });

        const nextP = prev.P.map(rollPlayer);
        const turnOrder = getTurnOrder(nextP, currentCircuit.sections, trackLength);
        const leader = turnOrder[0];

        const rollDetails = nextP
          .map((p, i) => `P${i + 1}: [${p.dice.join(', ')}]`)
          .join(' · ');

        const logMsg: LogEntry = {
          id: `roll-${Date.now()}`,
          t: `Round ${prev.round} (Dice rolled) → ${rollDetails}`,
          n: prev.round,
        };

        // Discard / Skip rule (active from round 2 onwards)
        // Discard / Skip rule (active from round 2 onwards)
        const nextDiscardedDice: number[][] = nextP.map(() => []);
        const shouldDiscard = options.skip && prev.round > 1;

        if (shouldDiscard) {
          // Leader discards highest die; trailer (last place) discards lowest die
          // In 3p and 4p, middle drivers (players 2 and 3 in position order) do NOT discard
          // and will have a die left over at the end of each round!
          const trailer = turnOrder[turnOrder.length - 1];

          // Leader discards highest die
          const leaderDice = nextP[leader].dice;
          const maxVal = Math.max(...leaderDice);
          const leaderDiscardIdx = leaderDice.indexOf(maxVal);
          nextDiscardedDice[leader] = [leaderDiscardIdx];

          // Trailer (last place) discards lowest die (if distinct from leader)
          if (trailer !== leader) {
            const trailerDice = nextP[trailer].dice;
            const minVal = Math.min(...trailerDice);
            const trailerDiscardIdx = trailerDice.indexOf(minVal);
            nextDiscardedDice[trailer] = [trailerDiscardIdx];
          }

          const leaderVal = nextP[leader].dice[nextDiscardedDice[leader][0]];
          const trailerVal = nextP[trailer]?.dice[nextDiscardedDice[trailer]?.[0]];
          const discardLog: LogEntry = {
            id: `discard-${Date.now()}`,
            t:
              nextP.length > 2
                ? `Discard rule: P${leader + 1} (leader) discards highest (${leaderVal}); P${trailer + 1} (trailer) discards lowest (${trailerVal}); middle drivers keep all 5 dice (1 left over at round end).`
                : `Discard rule: P${leader + 1} (leader) discards highest (${leaderVal}); P${trailer + 1} (trailer) discards lowest (${trailerVal}).`,
          };
          sound.playDiscard();

          const activePlayerIdx = turnOrder[0];
          const activeP = nextP[activePlayerIdx];
          const initialSel = createEmptySelection();

          // Auto-select first available valid die for human player if human's turn
          const isNextHuman = options.bot === 'off' || activePlayerIdx === 0;
          if (isNextHuman) {
            const availDie = activeP.dice.findIndex(
              (_: number, idx: number) =>
                !nextDiscardedDice[activePlayerIdx]?.includes(idx) &&
                !activeP.used.includes(idx)
            );
            if (availDie >= 0) {
              initialSel.die = availDie;
              const reachVal = calculateEffectiveValue(
                activePlayerIdx,
                initialSel,
                activeP.dice[availDie],
                { ...prev, P: nextP },
                options
              );
              const reachMap = computeReach(activePlayerIdx, reachVal, { ...prev, P: nextP }, trackArray, options, outsideLanes);
              const reachKeys = Object.keys(reachMap).filter((k) => k !== `${activeP.pos}:${activeP.lane}`);
              if (reachKeys.length > 0) {
                const bestKey = reachKeys[reachKeys.length - 1];
                const [tgPos, tgLane] = bestKey.split(':').map(Number);
                initialSel.tgt = { pos: tgPos, lane: tgLane };
              }
            }
          }

          return {
            ...prev,
            phase: 'turn',
            turnIdx: 0,
            turnOrder,
            lead: leader,
            tr: activePlayerIdx,
            P: nextP,
            picks: nextP.map(() => null),
            log: [...prev.log, logMsg, discardLog],
            sel: initialSel,
            discardedDice: nextDiscardedDice,
          };
        } else {
          // Round 1: No dice discarded, all 5 active
          const r1Log: LogEntry = {
            id: `r1-nodiscard-${Date.now()}`,
            t: `Opening round: All 5 dice are active on the opening turn!`,
          };

          const activePlayerIdx = turnOrder[0];
          const activeP = nextP[activePlayerIdx];
          const initialSel = createEmptySelection();

          const isNextHuman = options.bot === 'off' || activePlayerIdx === 0;
          if (isNextHuman) {
            const availDie = activeP.dice.findIndex((_: number, idx: number) => !activeP.used.includes(idx));
            if (availDie >= 0) {
              initialSel.die = availDie;
              const reachVal = calculateEffectiveValue(
                activePlayerIdx,
                initialSel,
                activeP.dice[availDie],
                { ...prev, P: nextP },
                options
              );
              const reachMap = computeReach(activePlayerIdx, reachVal, { ...prev, P: nextP }, trackArray, options, outsideLanes);
              const reachKeys = Object.keys(reachMap).filter((k) => k !== `${activeP.pos}:${activeP.lane}`);
              if (reachKeys.length > 0) {
                const bestKey = reachKeys[reachKeys.length - 1];
                const [tgPos, tgLane] = bestKey.split(':').map(Number);
                initialSel.tgt = { pos: tgPos, lane: tgLane };
              }
            }
          }

          return {
            ...prev,
            phase: 'turn',
            turnIdx: 0,
            turnOrder,
            lead: leader,
            tr: activePlayerIdx,
            P: nextP,
            picks: nextP.map(() => null),
            log: [...prev.log, logMsg, r1Log],
            sel: initialSel,
            discardedDice: nextDiscardedDice,
          };
        }
      });
    }, 700);
  }, [isRolling, options, currentCircuit.sections, trackLength, trackArray, outsideLanes]);

  // Handle die selection
  const handleSelectDie = useCallback(
    (dieIndex: number) => {
      sound.playClick();
      setGameState((prev) => {
        const activeIdx = prev.tr;
        const p = prev.P[activeIdx];
        if (!p || p.used.includes(dieIndex) || prev.discardedDice?.[activeIdx]?.includes(dieIndex)) return prev;

        const nextSel: TargetSelection = {
          ...prev.sel,
          die: dieIndex,
          tgt: null, // Clear target to force fresh reach selection
        };

        const die = p.dice[dieIndex];
        const val = calculateEffectiveValue(activeIdx, nextSel, die, prev, options);
        const reach = computeReach(activeIdx, val, prev, trackArray, options, outsideLanes);

        // Auto-select furthest available space
        const reachKeys = Object.keys(reach).filter((k) => k !== `${p.pos}:${p.lane}`);
        if (reachKeys.length > 0) {
          const bestKey = reachKeys[reachKeys.length - 1];
          const [tgPos, tgLane] = bestKey.split(':').map(Number);
          nextSel.tgt = { pos: tgPos, lane: tgLane };
        }

        return {
          ...prev,
          sel: nextSel,
        };
      });
    },
    [options, trackArray, outsideLanes]
  );

  // Handle token adjustments (Slipstream and Momentum)
  const handleAdjustTokens = useCallback(
    (type: 'slip' | 'mom', delta: number) => {
      sound.playClick();
      setGameState((prev) => {
        const activeIdx = prev.tr;
        const p = prev.P[activeIdx];
        if (!p) return prev;

        const nextSel: TargetSelection = { ...prev.sel };
        if (type === 'slip') {
          const nextVal = Math.max(0, Math.min(p.slip, nextSel.slip + delta));
          nextSel.slip = nextVal;
        } else {
          const nextVal = Math.max(0, Math.min(p.mom, nextSel.mom + delta));
          nextSel.mom = nextVal;
        }

        // Recompute reach for new token expenditure
        if (nextSel.die !== null) {
          const die = p.dice[nextSel.die];
          const val = calculateEffectiveValue(activeIdx, nextSel, die, prev, options);
          const reach = computeReach(activeIdx, val, prev, trackArray, options, outsideLanes);
          const reachKeys = Object.keys(reach).filter((k) => k !== `${p.pos}:${p.lane}`);
          if (reachKeys.length > 0) {
            const bestKey = reachKeys[reachKeys.length - 1];
            const [tgPos, tgLane] = bestKey.split(':').map(Number);
            nextSel.tgt = { pos: tgPos, lane: tgLane };
          }
        }

        return {
          ...prev,
          sel: nextSel,
        };
      });
    },
    [options, trackArray, outsideLanes]
  );

  // Target selection on track
  const handleSelectTarget = useCallback((pos: number, lane: number) => {
    sound.playClick();
    setGameState((prev) => ({
      ...prev,
      sel: {
        ...prev.sel,
        tgt: { pos, lane },
      },
    }));
  }, []);

  // Execute move for any player (human or bot)
  const executePlayerMove = useCallback(
    (
      playerIdx: number,
      pick: TargetSelection,
      currentState: GameState
    ): GameState => {
      sound.playMove();
      const p = { ...currentState.P[playerIdx] };
      const die = p.dice[pick.die!];
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
      p.used = [...p.used, pick.die!];
      p.tot += die;
      p.cnt++;

      const f0 = p.pos;
      p.pos = tg.pos;
      p.lane = tg.lane;

      // Authoritative slipstream pass calculation (must have open lane to pass around car)
      const passTarget = getPassTarget(
        playerIdx,
        p.pos,
        p.lane,
        currentState,
        trackArray,
        options,
        currentCircuit.sections
      );
      let specialMoveMsg = '';

      if (passTarget) {
        p.pos = passTarget.pos;
        p.lane = passTarget.lane;
        specialMoveMsg = ` ➜ slipstream pass to space ${passTarget.pos}`;
        sound.playBoost();
      }

      const nextSpd = [...currentState.spd];
      const nextDv = [...currentState.dv];
      nextSpd[playerIdx] = val;
      nextDv[playerIdx] = die;

      const logMsg: LogEntry = {
        id: `move-${Date.now()}-${Math.random()}`,
        t: `P${playerIdx + 1}${playerIdx > 0 && options.bot === 'medium' ? ' (AI)' : ''}: die ${die}${
          pick.slip ? ` +${pick.slip * SLIP_VAL} slipstream` : ''
        }${pick.mom ? ` +${pick.mom * MOM_VAL} momentum` : ''} = ${val} → #${p.pos} (${
          p.lane ? 'out' : 'in'
        })${specialMoveMsg}`,
      };

      const newLogs = [...currentState.log, logMsg];

      // Lap crossing log
      if (
        Math.floor(p.pos / trackLength) > Math.floor(f0 / trackLength) &&
        p.pos < endPos
      ) {
        const lapNum = Math.floor(p.pos / trackLength) + 1;
        newLogs.push({
          id: `lap-${Date.now()}-${playerIdx}`,
          t: `🚩 P${playerIdx + 1} completed lap ${lapNum - 1} · Starting Lap ${lapNum}/${options.laps}`,
        });
        sound.playLap();
      }

      const nextP = currentState.P.map((curP, idx) => (idx === playerIdx ? p : curP));

      // Check win condition
      let winIndex: number | null = currentState.win;
      if (winIndex === null && p.pos >= endPos) {
        winIndex = playerIdx;
        sound.playWin();
        newLogs.push({
          id: `win-${Date.now()}`,
          t: `🏆 CHECKERED FLAG: Player ${winIndex + 1}${
            winIndex > 0 && options.bot === 'medium' ? ' (AI)' : ''
          } WINS THE RACE!`,
        });

        // If in Championship mode, calculate complete 1st, 2nd, 3rd, 4th order and award points
        if (championship?.active) {
          const otherIndices = nextP.map((_, i) => i).filter((i) => i !== winIndex);
          otherIndices.sort((a, b) =>
            comparePlayerPositions(nextP[a], nextP[b], currentCircuit.sections, trackLength)
          );
          const fullFinishingOrder = [winIndex, ...otherIndices];
          setLastRaceOrder(fullFinishingOrder);
          setCompletedRaceIndex(championship.currentRaceIndex);

          // Points: 1st=6, 2nd=4, 3rd=2, 4th=1
          const ptsMap = [6, 4, 2, 1];
          setChampionship((prevChamp) => {
            if (!prevChamp) return null;
            const updatedStandings = prevChamp.standings.map((st) => {
              const rank = fullFinishingOrder.indexOf(st.playerIdx);
              const pts = ptsMap[rank] ?? 1;
              return {
                ...st,
                points: st.points + pts,
                wins: st.wins + (rank === 0 ? 1 : 0),
                secondPlaces: st.secondPlaces + (rank === 1 ? 1 : 0),
                thirdPlaces: st.thirdPlaces + (rank === 2 ? 1 : 0),
                fourthPlaces: st.fourthPlaces + (rank === 3 ? 1 : 0),
                history: [...st.history, pts],
              };
            });
            return {
              ...prevChamp,
              standings: updatedStandings,
            };
          });

          // Open championship standings modal
          setTimeout(() => {
            setChampionshipModalOpen(true);
          }, 600);
        }
      }

      const stateAfterMove: GameState = {
        ...currentState,
        P: nextP,
        spd: nextSpd,
        dv: nextDv,
        log: newLogs,
        win: winIndex,
        phase: winIndex !== null ? 'over' : currentState.phase,
      };

      if (winIndex !== null) {
        return stateAfterMove;
      }

      // Independent movement sequence: advance to next player in turnOrder
      const nextTurnIdx = currentState.turnIdx + 1;

      if (nextTurnIdx < currentState.turnOrder.length) {
        const nextActiveIdx = currentState.turnOrder[nextTurnIdx];
        let nextSel = createEmptySelection();

        // Convenience auto-select for human player if human is next
        const isNextHuman = options.bot === 'off' || nextActiveIdx === 0;
        if (isNextHuman) {
          const availDie = nextP[nextActiveIdx].dice.findIndex(
            (_, dIdx) =>
              !nextP[nextActiveIdx].used.includes(dIdx) &&
              !currentState.discardedDice?.[nextActiveIdx]?.includes(dIdx)
          );
          if (availDie >= 0) {
            nextSel.die = availDie;
            const reachVal = calculateEffectiveValue(
              nextActiveIdx,
              nextSel,
              nextP[nextActiveIdx].dice[availDie],
              stateAfterMove,
              options
            );
            const reachMap = computeReach(
              nextActiveIdx,
              reachVal,
              stateAfterMove,
              trackArray,
              options,
              outsideLanes
            );
            const reachKeys = Object.keys(reachMap).filter(
              (k) => k !== `${nextP[nextActiveIdx].pos}:${nextP[nextActiveIdx].lane}`
            );
            if (reachKeys.length > 0) {
              const bestKey = reachKeys[reachKeys.length - 1];
              const [tgPos, tgLane] = bestKey.split(':').map(Number);
              nextSel.tgt = { pos: tgPos, lane: tgLane };
            }
          }
        }

        return {
          ...stateAfterMove,
          turnIdx: nextTurnIdx,
          tr: nextActiveIdx,
          phase: 'turn',
          sel: nextSel,
        };
      } else {
        // All players have moved for this step: end step token awards
        return computeStepFinishedState(
          stateAfterMove,
          options,
          currentCircuit.sections,
          trackLength
        );
      }
    },
    [
      options,
      trackArray,
      trackLength,
      endPos,
      outsideLanes,
      currentCircuit.sections,
      championship,
    ]
  );

  // Automated AI bot turn execution in sequence
  useEffect(() => {
    if (gameState.phase !== 'turn' || gameState.win !== null) return;
    const activeIdx = gameState.turnOrder[gameState.turnIdx];

    if (options.bot === 'medium' && activeIdx > 0) {
      const timer = setTimeout(() => {
        setGameState((curr) => {
          if (curr.phase !== 'turn' || curr.win !== null) return curr;
          const currActive = curr.turnOrder[curr.turnIdx];
          if (currActive !== activeIdx) return curr;

          const botChoice = computeBotMove(
            activeIdx,
            curr,
            trackArray,
            options,
            outsideLanes,
            currentCircuit.sections
          );

          return executePlayerMove(activeIdx, botChoice, curr);
        });
      }, 650);

      return () => clearTimeout(timer);
    }
  }, [
    gameState.phase,
    gameState.turnIdx,
    gameState.turnOrder,
    gameState.win,
    options,
    trackArray,
    outsideLanes,
    currentCircuit.sections,
    executePlayerMove,
  ]);

  // Human player confirm move handler
  const handleConfirmMove = useCallback(() => {
    const activeIdx = gameState.turnOrder[gameState.turnIdx];
    if (gameState.sel.die === null || !gameState.sel.tgt) return;
    // Discarded dice and already-used dice can never be confirmed or used
    if (gameState.discardedDice?.[activeIdx]?.includes(gameState.sel.die)) return;
    if (gameState.P[activeIdx]?.used.includes(gameState.sel.die)) return;
    setGameState((prev) => executePlayerMove(activeIdx, prev.sel, prev));
  }, [gameState.turnOrder, gameState.turnIdx, gameState.sel, gameState.discardedDice, gameState.P, executePlayerMove]);

  // Next step or round advance handler
  const handleNextStep = useCallback(() => {
    sound.playClick();
    const totalSteps = getRoundSteps(options, gameState.round);

    if (gameState.step >= totalSteps) {
      // Advance to next round
      setGameState((prev) => ({
        ...prev,
        round: prev.round + 1,
        step: 0,
        turnIdx: 0,
        phase: 'roll',
        sel: createEmptySelection(),
      }));
    } else {
      // Recompute turn order for next step: leader goes first, inside lane priority
      setGameState((prev) => {
        const turnOrder = getTurnOrder(prev.P, currentCircuit.sections, trackLength);
        const leader = turnOrder[0];
        const activeIdx = turnOrder[0];
        const initialSel = createEmptySelection();

        const isNextHuman = options.bot === 'off' || activeIdx === 0;
        if (isNextHuman) {
          const availDie = prev.P[activeIdx].dice.findIndex(
            (_, dIdx) =>
              !prev.P[activeIdx].used.includes(dIdx) &&
              !prev.discardedDice?.[activeIdx]?.includes(dIdx)
          );
          if (availDie >= 0) {
            initialSel.die = availDie;
            const reachVal = calculateEffectiveValue(
              activeIdx,
              initialSel,
              prev.P[activeIdx].dice[availDie],
              prev,
              options
            );
            const reachMap = computeReach(
              activeIdx,
              reachVal,
              prev,
              trackArray,
              options,
              outsideLanes
            );
            const reachKeys = Object.keys(reachMap).filter(
              (k) => k !== `${prev.P[activeIdx].pos}:${prev.P[activeIdx].lane}`
            );
            if (reachKeys.length > 0) {
              const bestKey = reachKeys[reachKeys.length - 1];
              const [tgPos, tgLane] = bestKey.split(':').map(Number);
              initialSel.tgt = { pos: tgPos, lane: tgLane };
            }
          }
        }

        return {
          ...prev,
          turnIdx: 0,
          turnOrder,
          lead: leader,
          tr: activeIdx,
          phase: 'turn',
          sel: initialSel,
        };
      });
    }
  }, [gameState, options, currentCircuit.sections, trackLength, trackArray, outsideLanes]);

  // Switch circuit from Track Selector
  const handleSelectCircuit = useCallback(
    (newCircuit: TrackDefinition) => {
      setCurrentCircuit(newCircuit);
      setSegments(newCircuit.segments);
      saveCurrentCircuitId(newCircuit.id);
      saveStoredTrack('dice', newCircuit.segments);
      if (newCircuit.lapsDefault) {
        setOptions((prev) => ({ ...prev, laps: newCircuit.lapsDefault }));
      }
      resetGame(
        newCircuit.lapsDefault ? { laps: newCircuit.lapsDefault } : undefined,
        newCircuit
      );
      setScreen('race');
    },
    [resetGame]
  );

  // Update segments from Track Architect
  const handleUpdateSegments = useCallback((newSegments: string[]) => {
    setSegments(newSegments);
    setCurrentCircuit((prev) => ({
      ...prev,
      segments: newSegments,
    }));
    saveStoredTrack('dice', newSegments);
  }, []);

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
      saveStoredTrack('dice', nextSegs);
      resetGame();
    },
    [segments, resetGame]
  );

  // Current reach map for active player
  const currentReach: ReachMap = useMemo(() => {
    if (gameState.phase !== 'turn' || gameState.sel.die === null) return {};
    const activeIdx = gameState.tr;
    const p = gameState.P[activeIdx];
    if (!p) return {};
    const die = p.dice[gameState.sel.die];
    const val = calculateEffectiveValue(activeIdx, gameState.sel, die, gameState, options);
    return computeReach(activeIdx, val, gameState, trackArray, options, outsideLanes);
  }, [gameState, options, trackArray, outsideLanes]);

  // Home Page Mode Actions:
  // 1. Daily Play
  const handleStartDailyPlay = useCallback(
    (track: TrackDefinition, botMode: BotDifficulty, botCount: 1 | 2 | 3) => {
      setChampionship(null);
      setCurrentCircuit(track);
      setSegments(track.segments);
      const newOptions: GameOptions = {
        ...options,
        bot: botMode,
        botCount,
        laps: track.lapsDefault || 2,
      };
      setOptions(newOptions);
      resetGame(newOptions, track);
      setScreen('race');
    },
    [options, resetGame]
  );

  // 2. Pick Track
  const handleStartPickTrack = useCallback(() => {
    refreshAvailableTracks();
    setTrackSelectorOpen(true);
  }, [refreshAvailableTracks]);

  // 3. Championship Mode
  const handleStartChampionship = useCallback(
    (type: 'solo' | 'pass-and-play', raceCount: number) => {
      const all = getAllAvailableTracks();
      const seasonTracks: TrackDefinition[] = [];
      for (let i = 0; i < raceCount; i++) {
        seasonTracks.push(all[i % all.length]);
      }

      const newChamp: ChampionshipState = {
        active: true,
        type,
        currentRaceIndex: 0,
        totalRaces: raceCount,
        tracks: seasonTracks,
        standings: [
          { playerIdx: 0, name: 'Driver 1 (Blue)', points: 0, wins: 0, secondPlaces: 0, thirdPlaces: 0, fourthPlaces: 0, history: [] },
          { playerIdx: 1, name: type === 'solo' ? 'Bot Red' : 'Driver 2 (Red)', points: 0, wins: 0, secondPlaces: 0, thirdPlaces: 0, fourthPlaces: 0, history: [] },
          { playerIdx: 2, name: type === 'solo' ? 'Bot Green' : 'Driver 3 (Green)', points: 0, wins: 0, secondPlaces: 0, thirdPlaces: 0, fourthPlaces: 0, history: [] },
          { playerIdx: 3, name: type === 'solo' ? 'Bot Violet' : 'Driver 4 (Violet)', points: 0, wins: 0, secondPlaces: 0, thirdPlaces: 0, fourthPlaces: 0, history: [] },
        ],
      };

      setChampionship(newChamp);
      setLastRaceOrder(undefined);
      setCompletedRaceIndex(undefined);

      const firstTrack = seasonTracks[0];
      setCurrentCircuit(firstTrack);
      setSegments(firstTrack.segments);

      const champOptions: GameOptions = {
        ...options,
        bot: type === 'solo' ? 'medium' : 'off',
        botCount: 3, // Always 4 players in Championship
        laps: firstTrack.lapsDefault || 2,
      };
      setOptions(champOptions);
      resetGame(champOptions, firstTrack);
      setScreen('race');
    },
    [options, resetGame]
  );

  // Next Race in Championship
  const handleNextRaceInChampionship = useCallback(() => {
    if (!championship) return;
    const nextIdx = championship.currentRaceIndex + 1;
    if (nextIdx >= championship.totalRaces) return;

    const nextTrack = championship.tracks[nextIdx];
    setChampionship((prev) => (prev ? { ...prev, currentRaceIndex: nextIdx } : null));
    setCurrentCircuit(nextTrack);
    setSegments(nextTrack.segments);
    setChampionshipModalOpen(false);

    const champOptions: GameOptions = {
      ...options,
      bot: championship.type === 'solo' ? 'medium' : 'off',
      botCount: 3,
      laps: nextTrack.lapsDefault || 2,
    };
    setOptions(champOptions);
    resetGame(champOptions, nextTrack);
  }, [championship, options, resetGame]);

  return (
    <div
      className={`h-[100dvh] min-h-0 w-full flex flex-col justify-between overflow-hidden text-stone-100 select-none touch-manipulation transition-colors duration-700 ${
        screen === 'home'
          ? 'bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950'
          : `bg-gradient-to-b ${currentTheme.pageGradient}`
      }`}
    >
      {screen === 'home' ? (
        <HomePage
          dailyTrack={dailyTrack}
          availableTracks={availableTracks}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(sound.toggle())}
          onOpenRules={() => setRulesOpen(true)}
          onOpenEditor={() => setEditorOpen(true)}
          onStartDailyPlay={handleStartDailyPlay}
          onStartPickTrack={handleStartPickTrack}
          onStartChampionship={handleStartChampionship}
          activeChampionship={championship}
          onResumeChampionship={() => setScreen('race')}
        />
      ) : (
        <>
          {/* Top HUD Header with Home button & Championship indicator */}
          <HUD
            circuit={currentCircuit}
            gameState={gameState}
            options={options}
            trackLength={trackLength}
            soundEnabled={soundEnabled}
            championship={championship}
            onGoHome={() => setScreen('home')}
            onToggleSound={() => setSoundEnabled(sound.toggle())}
            onOpenRules={() => setRulesOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenEditor={() => setEditorOpen(true)}
            onOpenLog={() => setLogOpen(true)}
            onOpenTrackSelector={() => {
              refreshAvailableTracks();
              setTrackSelectorOpen(true);
            }}
          />

          {/* Interactive SVG Track */}
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
              onOpenTrackSelector={() => {
                refreshAvailableTracks();
                setTrackSelectorOpen(true);
              }}
            />
          </main>

          {/* Bottom Action Controls */}
          <ActionControls
            gameState={gameState}
            options={options}
            isRolling={isRolling}
            onRoll={handleRoll}
            onSelectDie={handleSelectDie}
            onAdjustTokens={handleAdjustTokens}
            onLockIn={handleConfirmMove}
            onReact={handleConfirmMove}
            onStartPlayer2={() => {}}
            onNextStep={handleNextStep}
            onResetGame={() => {
              if (championship?.active) {
                setChampionshipModalOpen(true);
              } else {
                resetGame();
              }
            }}
          />
        </>
      )}

      {/* Championship Standings & Season Modal */}
      {championship && (
        <ChampionshipStandingsModal
          isOpen={championshipModalOpen}
          onClose={() => setChampionshipModalOpen(false)}
          championship={championship}
          completedRaceIndex={completedRaceIndex}
          lastRaceOrder={lastRaceOrder}
          onNextRace={handleNextRaceInChampionship}
          onRestartChampionship={() => {
            setChampionshipModalOpen(false);
            handleStartChampionship(championship.type, championship.totalRaces);
          }}
          onGoHome={() => {
            setChampionshipModalOpen(false);
            setScreen('home');
          }}
        />
      )}

      {/* Track Selector Modal */}
      <TrackSelectorModal
        isOpen={trackSelectorOpen}
        onClose={() => setTrackSelectorOpen(false)}
        currentCircuitId={currentCircuit.id}
        onSelectCircuit={handleSelectCircuit}
        onOpenEditor={() => setEditorOpen(true)}
      />

      {/* Rules Modal */}
      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        options={options}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        options={options}
        onChangeOptions={setOptions}
        onRestartRace={resetGame}
      />

      {/* Track Editor Architect Modal */}
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

      {/* Race Log Drawer */}
      <RaceLogDrawer
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        logs={gameState.log}
        onClearLogs={() => setGameState((prev) => ({ ...prev, log: [] }))}
      />
    </div>
  );
}
