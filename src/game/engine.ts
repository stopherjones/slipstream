import {
  GameOptions,
  GameState,
  PlayerState,
  ReachMap,
  TargetSelection,
  TrackSectionType,
} from '../types/game';

export const SLIP_VAL = 1;
export const MOM_VAL = 2;
export const CARDS = [1, 2, 3, 4, 5, 6];

export const getDiceCount = () => 5;

export const getCardOrDieLabel = (val: number): string => `${val}`;

export const baseValue = (
  playerIdx: number,
  die: number,
  gameState: GameState,
  options: GameOptions
): number => die;

export const getRoundSteps = (options: GameOptions, round: number = 2) => {
  // In round 1, all 5 dice are active (no discard)
  if (round <= 1) return 5;
  return 5 - (options.skip ? 1 : 0);
};

export const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const createInitialPlayer = (pos: number = 0, lane: number = 0): PlayerState => ({
  pos,
  lane,
  dice: [],
  used: [],
  slip: 0,
  mom: 0,
  tot: 0,
  cnt: 0,
});

export const createEmptySelection = (): TargetSelection => ({
  die: null,
  slip: 0,
  mom: 0,
  tgt: null,
});

export function getTrackArray(segments: string[]): string[] {
  return segments.join('').split('');
}

export function getTrackLength(segments: string[]): number {
  return segments.reduce((acc, s) => acc + s.length, 0);
}

export function getEndPosition(segments: string[], laps: number): number {
  return laps * getTrackLength(segments);
}

export function getTrackCellType(pos: number, track: string[]): 'T' | 'S' | 'C' {
  const len = track.length;
  const idx = ((pos % len) + len) % len;
  return (track[idx] as 'T' | 'S' | 'C') || 'T';
}

/**
 * Inside track means the side of the track matching the direction of the current or next corner.
 * - If you're on a corner, it's the right side (lane 1) for right facing corners ('R', 'SR'),
 *   or left side (lane 0) for left facing corners ('L', 'SL').
 * - If you're on a straight ('T', 'S'), it's the side matching the next corner on the track.
 */
export function getInsideLane(
  pos: number,
  sections?: TrackSectionType[],
  trackLength: number = 0
): 0 | 1 {
  if (sections && sections.length > 0) {
    const len = sections.length;
    const curIdx = ((pos % len) + len) % len;
    const cur = sections[curIdx];
    if (cur === 'R' || cur === 'SR') return 1;
    if (cur === 'L' || cur === 'SL') return 0;

    // On a straight: search ahead for the next corner
    for (let step = 1; step < len; step++) {
      const sec = sections[(curIdx + step) % len];
      if (sec === 'R' || sec === 'SR') return 1;
      if (sec === 'L' || sec === 'SL') return 0;
    }
    return 0;
  }
  return 0;
}

/**
 * Compare two players to determine race rank:
 * 1. Player with higher pos is ahead.
 * 2. Where players are on the same double-width section of track (same pos),
 *    the player on the inside track goes first.
 */
export function comparePlayerPositions(
  a: PlayerState,
  b: PlayerState,
  sections?: TrackSectionType[],
  trackLength: number = 0
): number {
  if (a.pos !== b.pos) {
    return b.pos - a.pos; // Higher pos is ahead
  }
  const inside = getInsideLane(a.pos, sections, trackLength);
  if (a.lane === inside && b.lane !== inside) return -1;
  if (b.lane === inside && a.lane !== inside) return 1;
  return 0;
}

/**
 * Computes sorted turn order from 1st place to last place.
 */
export function getTurnOrder(
  P: PlayerState[],
  sections?: TrackSectionType[],
  trackLength: number = 0
): number[] {
  const indices = P.map((_, idx) => idx);
  indices.sort((i, j) => comparePlayerPositions(P[i], P[j], sections, trackLength));
  return indices;
}

export function getLeaderIndex(
  P: PlayerState[],
  sections?: TrackSectionType[],
  trackLength: number = 0
): number {
  if (P.length === 0) return 0;
  const order = getTurnOrder(P, sections, trackLength);
  return order[0];
}

export function getPlayerState(gameState: GameState, playerIdx: number): PlayerState {
  return gameState.P[playerIdx];
}

export function getActivePlayerIndex(gameState: GameState): number {
  return gameState.tr;
}

export function calculateSpeed(
  _playerIdx: number,
  die: number,
  _gameState: GameState,
  _options: GameOptions
): number {
  return die;
}

export function calculateEffectiveValue(
  playerIdx: number,
  sel: TargetSelection,
  die: number,
  gameState: GameState,
  options: GameOptions
): number {
  const spd = calculateSpeed(playerIdx, die, gameState, options);
  return spd + sel.slip * SLIP_VAL + sel.mom * MOM_VAL;
}

/**
 * Reach calculation enforcing strict collision and blocking rules:
 * - Cars cannot travel through other cars - they must go round them.
 * - If there is no space (e.g. two cars together on a double width section of track),
 *   they are blocked and must stop behind them.
 * - Single-width bottlenecks ('S') can only hold one car; if occupied, blocked.
 * - Corner outside lanes cost 2 pips, inside lanes cost 1 pip.
 */
export function computeReach(
  playerIdx: number,
  v: number,
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): ReachMap {
  const p = gameState.P[playerIdx];
  const opponents = gameState.P.filter((_, idx) => idx !== playerIdx);
  const occupiedSet = new Set(opponents.map((o) => `${o.pos}:${o.lane}`));
  const reach: ReachMap = {};
  const endPos = options.laps * track.length;

  interface QueueNode {
    pos: number;
    lane: number;
    used: number;
  }

  const minCost = new Map<string, number>();
  minCost.set(`${p.pos}:${p.lane}`, 0);

  const queue: QueueNode[] = [{ pos: p.pos, lane: p.lane, used: 0 }];
  const reachedDestinations = new Map<string, number>();

  while (queue.length > 0) {
    const { pos, lane, used } = queue.shift()!;

    if (pos >= endPos) {
      reachedDestinations.set(`${pos}:${lane}`, used);
      continue;
    }

    const nextPos = pos + 1;
    const cellType = getTrackCellType(nextPos, track);
    const candidateLanes: (0 | 1)[] = cellType === 'S' ? [0] : [0, 1];
    const outLane = outsideLanes
      ? outsideLanes[((nextPos % track.length) + track.length) % track.length] ?? 1
      : 1;

    let canAdvanceAny = false;

    for (const candLane of candidateLanes) {
      const candKey = `${nextPos}:${candLane}`;
      // Cannot travel through occupied cells (must go round them):
      if (occupiedSet.has(candKey)) {
        continue;
      }

      const stepCost = cellType === 'C' && candLane === outLane ? 2 : 1;
      const nextUsed = used + stepCost;

      if (nextUsed <= v) {
        canAdvanceAny = true;
        const prevBest = minCost.get(candKey);
        if (prevBest === undefined || nextUsed < prevBest) {
          minCost.set(candKey, nextUsed);
          queue.push({ pos: nextPos, lane: candLane, used: nextUsed });
        }
      }
    }

    if (pos > p.pos) {
      if (!canAdvanceAny || used === v) {
        const key = `${pos}:${lane}`;
        const prev = reachedDestinations.get(key);
        if (prev === undefined || used < prev) {
          reachedDestinations.set(key, used);
        }
      }
    }
  }

  for (const [key, cost] of reachedDestinations.entries()) {
    reach[key] = cost;
  }

  // If blocked directly in front and cannot make a single move, stop at current position:
  if (Object.keys(reach).length === 0) {
    reach[`${p.pos}:${p.lane}`] = 0;
  }

  return reach;
}

/**
 * Slipstream Pass calculation:
 * - You can only slipstream if there is space to move around the car you are slipstreaming.
 *   (Cannot slipstream through a single bottleneck 'S' or two cars abreast).
 * - You can only slipstream one car. If you finish behind a column of two cars,
 *   you have to take place behind them, you don't slipstream in front of both.
 */
export function getPassTarget(
  playerIdx: number,
  pos: number,
  _lane: number,
  gameState: GameState,
  track: string[],
  options: GameOptions,
  sections?: TrackSectionType[]
): { pos: number; lane: number } | null {
  if (!options.pass) return null;
  const opponents = gameState.P.filter((_, idx) => idx !== playerIdx);
  const occupiedSet = new Set(opponents.map((o) => `${o.pos}:${o.lane}`));
  const endPos = options.laps * track.length;

  if (pos >= endPos) return null;

  // The car being slipstreamed is immediately ahead at pos + 1
  const oppPos = pos + 1;
  if (oppPos >= endPos) return null;

  const carsAtOppPos = opponents.filter((o) => o.pos === oppPos);
  if (carsAtOppPos.length === 0) return null;

  // Cannot slipstream if no space to move around the car:
  // 1. Single bottleneck has no second lane to pass through
  if (getTrackCellType(oppPos, track) === 'S') return null;
  // 2. Both lanes at oppPos are occupied (two cars together)
  if (carsAtOppPos.length >= 2) return null;

  // Cannot slipstream a column of two cars:
  const colPos = oppPos + 1;
  const carsAtColPos = opponents.filter((o) => o.pos === colPos);
  if (carsAtColPos.length > 0) {
    // Column of two cars: take place behind them, do not slipstream in front of both
    return null;
  }

  if (colPos > endPos) return null;

  // Check destination cell at colPos:
  const destType = getTrackCellType(colPos, track);
  const inside = getInsideLane(colPos, sections, track.length);

  if (destType === 'S') {
    if (occupiedSet.has(`${colPos}:0`)) return null;
    return { pos: colPos, lane: 0 };
  } else {
    if (!occupiedSet.has(`${colPos}:${inside}`)) {
      return { pos: colPos, lane: inside };
    }
    const outside = (1 - inside) as (0 | 1);
    if (!occupiedSet.has(`${colPos}:${outside}`)) {
      return { pos: colPos, lane: outside };
    }
    return null;
  }
}

export const getJumpTarget = getPassTarget;

/**
 * Bot AI move selection for any bot in the race.
 */
export function computeBotMove(
  botIdx: number,
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[],
  sections?: TrackSectionType[]
): { die: number; slip: number; mom: number; tgt: { pos: number; lane: number } } {
  const p = gameState.P[botIdx];
  const endPos = options.laps * track.length;

  type Candidate = {
    die: number;
    slip: number;
    mom: number;
    tgt: { pos: number; lane: number };
    score: number;
  };

  let best: Candidate | null = null;

  for (let dieIdx = 0; dieIdx < p.dice.length; dieIdx++) {
    if (p.used.includes(dieIdx)) continue;
    if (gameState.discardedDice?.[botIdx]?.includes(dieIdx)) continue;
    const die = p.dice[dieIdx];
    const maxSlip = Math.min(p.slip, 1);
    const maxMom = Math.min(p.mom, 1);

    for (let sl = 0; sl <= maxSlip; sl++) {
      for (let mo = 0; mo <= maxMom; mo++) {
        const val = calculateEffectiveValue(
          botIdx,
          { die: dieIdx, slip: sl, mom: mo, tgt: null },
          die,
          gameState,
          options
        );
        const reach = computeReach(botIdx, val, gameState, track, options, outsideLanes);

        for (const k of Object.keys(reach)) {
          const [tgPos, tgLane] = k.split(':').map(Number);
          const passTarget = getPassTarget(botIdx, tgPos, tgLane, gameState, track, options, sections);
          const finalPos = passTarget ? passTarget.pos : tgPos;
          const finalLane = passTarget ? passTarget.lane : tgLane;

          let score = finalPos * 10 - (sl * 1.5 + mo * 2.5);
          if (finalPos >= endPos) {
            score += 10000;
          }

          const inside = getInsideLane(finalPos, sections, track.length);
          if (finalLane === inside) {
            score += 0.5;
          }

          if (!best || score > best.score) {
            best = {
              die: dieIdx,
              slip: sl,
              mom: mo,
              tgt: { pos: tgPos, lane: tgLane },
              score,
            };
          }
        }
      }
    }
  }

  if (!best) {
    const firstAvail = p.dice.findIndex(
      (_, idx) => !p.used.includes(idx) && !gameState.discardedDice?.[botIdx]?.includes(idx)
    );
    const d = Math.max(0, firstAvail);
    const cands = computeReach(botIdx, p.dice[d] ?? 1, gameState, track, options, outsideLanes);
    const firstKey = Object.keys(cands)[0] ?? `${p.pos}:${p.lane}`;
    const [tgPos, tgLane] = firstKey.split(':').map(Number);
    return { die: d, slip: 0, mom: 0, tgt: { pos: tgPos, lane: tgLane } };
  }

  return { die: best.die, slip: best.slip, mom: best.mom, tgt: best.tgt };
}

export function computeStepFinishedState(
  state: GameState,
  options: GameOptions,
  sections?: TrackSectionType[],
  trackLength: number = 0
): GameState {
  const updatedP = state.P.map((player) => ({ ...player }));
  const outLogs: GameState['log'] = [];

  if (state.win === null) {
    const turnOrder = getTurnOrder(updatedP, sections, trackLength);
    const leaderIdx = turnOrder[0];

    // Slipstream token awards for trailing cars relative to the car immediately ahead
    for (let rank = 1; rank < turnOrder.length; rank++) {
      const trailerIdx = turnOrder[rank];
      const aheadIdx = turnOrder[rank - 1];
      const gap = updatedP[aheadIdx].pos - updatedP[trailerIdx].pos;

      if (gap >= 1 && gap <= 2) {
        const award = gap === 1 ? 2 : 1;
        updatedP[trailerIdx].slip = Math.min(4, updatedP[trailerIdx].slip + award);
        outLogs.push({
          id: `token-slip-${Date.now()}-${trailerIdx}`,
          t: `P${trailerIdx + 1} is ${gap} space${gap > 1 ? 's' : ''} behind P${aheadIdx + 1} → +${award} slipstream`,
        });
      }
    }

    // End of round momentum token rule: race leader gets momentum
    const totalSteps = getRoundSteps(options, state.round);
    const isRoundEnd = state.step + 1 >= totalSteps;
    if (options.mom && isRoundEnd) {
      updatedP[leaderIdx].mom = Math.min(4, updatedP[leaderIdx].mom + 1);
      outLogs.push({
        id: `token-mom-${Date.now()}`,
        t: `End of Round ${state.round}: P${leaderIdx + 1} leads → +1 momentum`,
      });
    }
  }

  return {
    ...state,
    step: state.step + 1,
    P: updatedP,
    picks: updatedP.map(() => null),
    phase: state.win !== null ? 'over' : 'result',
    log: [...state.log, ...outLogs],
  };
}
