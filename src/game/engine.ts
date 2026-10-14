import {
  GameMode,
  GameOptions,
  GameState,
  PlayerState,
  ReachMap,
  TargetSelection,
} from '../types/game';

export const SLIP_VAL = 1;
export const MOM_VAL = 2;
export const CARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const getDiceCount = (mode: GameMode) => (mode === 'cards' ? 3 : 5);
export const getRoundSteps = (options: GameOptions, round: number = 2) => {
  if (options.mode === 'cards') return 3;
  // In dice mode, round 1 does NOT discard for either player
  if (round <= 1) return 5;
  return 5 - (options.skip ? 1 : 0);
};

export const getCardOrDieLabel = (val: number, mode: GameMode): string | number => {
  if (mode === 'cards' && val >= 10) {
    return ['J', 'Q', 'K'][val - 10] ?? val;
  }
  return val;
};

export const shuffle = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const createInitialPlayer = (lane: number): PlayerState => ({
  pos: 0,
  lane,
  dice: [],
  used: [],
  slip: 0,
  mom: 0,
  head: 0,
  deck: [],
  played: [],
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
  return (track[pos % track.length] as 'T' | 'S' | 'C') || 'T';
}

export function getLeaderIndex(P: [PlayerState, PlayerState], lastLead: number): number {
  const diff = P[0].pos - P[1].pos;
  if (diff > 0) return 0;
  if (diff < 0) return 1;
  return lastLead;
}

export function getPlayerState(gameState: GameState, playerIdx: number): PlayerState {
  return playerIdx < 2 ? gameState.P[playerIdx] : gameState.extraBots[playerIdx - 2];
}

export function getActivePlayerIndex(gameState: GameState): number {
  if (gameState.phase === 'pick0') return 0;
  if (gameState.phase === 'react') return gameState.tr;
  return 1;
}

export const baseValue = (die: number, mode: GameMode): number =>
  mode === 'cards' ? Math.min(die, 10) : die;

export function calculateSpeed(
  playerIdx: number,
  die: number,
  gameState: GameState,
  options: GameOptions
): number {
  const p = getPlayerState(gameState, playerIdx);
  const opponents = [...gameState.P, ...gameState.extraBots].filter((_, idx) => idx !== playerIdx);
  const h = options.head ? p.head : 0;
  const b = baseValue(die, options.mode);

  if (options.mode === 'cards') {
    return b >= 5 ? Math.max(4, b - h) : b;
  } else {
    return options.head && b >= 4 && opponents.some((opponent) => opponent.pos < p.pos)
      ? b - 1
      : b;
  }
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

export function computeReach(
  playerIdx: number,
  v: number,
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): ReachMap {
  const p = getPlayerState(gameState, playerIdx);
  const opponents = [...gameState.P, ...gameState.extraBots].filter((_, idx) => idx !== playerIdx);
  const reach: ReachMap = {};
  const endPos = options.laps * track.length;

  for (const L of [0, 1]) {
    let pos = p.pos;
    let b = v;
    let c = 0;

    while (pos < endPos) {
      const nextPos = pos + 1;
      const cellType = getTrackCellType(nextPos, track);
      const ln = cellType === 'S' ? 0 : L;
      const outLane = outsideLanes ? outsideLanes[nextPos % track.length] ?? 1 : 1;
      const cost = cellType === 'C' && ln === outLane ? 2 : 1;

      if (cost > b || opponents.some((opponent) => opponent.pos === nextPos && opponent.lane === ln)) {
        break;
      }
      pos = nextPos;
      b -= cost;
      c += cost;
    }

    if (pos > p.pos) {
      const endCellType = getTrackCellType(pos, track);
      const finalLane = endCellType === 'S' ? 0 : L;
      const key = `${pos}:${finalLane}`;
      if (!(key in reach) || c < reach[key]) {
        reach[key] = c;
      }
    }
  }

  if (Object.keys(reach).length === 0) {
    reach[`${p.pos}:${p.lane}`] = 0;
  }

  return reach;
}

export function getJumpTarget(
  playerIdx: number,
  die: number,
  pos: number,
  gameState: GameState,
  track: string[],
  options: GameOptions
): number {
  if (options.mode !== 'cards' || die < 10) return 0;
  const opp = [...gameState.P, ...gameState.extraBots]
    .filter((player, idx) => idx !== playerIdx && player.pos > pos)
    .sort((a, b) => a.pos - b.pos)[0];
  if (!opp) return 0;
  const gap = opp.pos - pos;
  if (
    gap >= 1 &&
    gap <= 2 &&
    getTrackCellType(opp.pos, track) !== 'S' &&
    getTrackCellType(opp.pos + 1, track) !== 'S'
  ) {
    return opp.pos + 1;
  }
  return 0;
}

export function getPassTarget(
  playerIdx: number,
  pos: number,
  gameState: GameState,
  track: string[],
  options: GameOptions
): number {
  const fromPos = getPlayerState(gameState, playerIdx).pos;
  const opp = [...gameState.P, ...gameState.extraBots]
    .filter((player, idx) => idx !== playerIdx && player.pos > fromPos)
    .sort((a, b) => a.pos - b.pos)[0];
  const endPos = options.laps * track.length;
  if (!opp) return 0;
  if (
    options.pass &&
    fromPos < opp.pos &&
    opp.pos - pos >= 0 &&
    opp.pos - pos <= 1 &&
    pos < endPos &&
    opp.pos < endPos &&
    getTrackCellType(opp.pos, track) !== 'S'
  ) {
    return opp.pos + 1;
  }
  return 0;
}

// ---- Bot AI (Medium) ----
const SV = 0.9;
const MV = 1.8;

function botMove(
  i: number,
  die: number,
  sl: number,
  mo: number,
  t: { pos: number; lane: number },
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): { pos: number; lane: number } {
  const v = calculateSpeed(i, die, gameState, options) + sl * SLIP_VAL + mo * MOM_VAL;
  const R = computeReach(i, v, gameState, track, options, outsideLanes);
  if (!(t.pos + ':' + t.lane in R)) {
    return { pos: gameState.P[i].pos, lane: gameState.P[i].lane };
  }
  let pos = t.pos;
  let lane = t.lane;
  const j = getJumpTarget(i, die, pos, gameState, track, options);
  if (j) {
    pos = j;
    lane = getTrackCellType(j, track) === 'S' ? 0 : lane;
  } else {
    const q = getPassTarget(i, pos, gameState, track, options);
    if (q) {
      pos = q;
      lane = getTrackCellType(q, track) === 'S' ? 0 : lane;
    }
  }
  return { pos, lane };
}

function botCandidates(
  i: number,
  die: number,
  sl: number,
  mo: number,
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): { pos: number; lane: number }[] {
  const v = calculateSpeed(i, die, gameState, options) + sl * SLIP_VAL + mo * MOM_VAL;
  const R = computeReach(i, v, gameState, track, options, outsideLanes);
  const out: { pos: number; lane: number }[] = [];
  for (const k in R) {
    const [n, l] = k.split(':').map(Number);
    out.push({ pos: n, lane: l });
  }
  return out;
}

function botEval(
  me: number,
  um: { sl: number; mo: number },
  uo: { sl: number; mo: number },
  gameState: GameState,
  track: string[],
  options: GameOptions
): number {
  const a = gameState.P[me];
  const b = gameState.P[1 - me];
  const endPos = options.laps * track.length;
  if (a.pos >= endPos) return 1000;
  if (b.pos >= endPos) return -1000;

  const g = a.pos - b.pos;
  return (
    g +
    0.2 * a.pos +
    (a.slip - um.sl) * SV +
    (a.mom - um.mo) * MV -
    0.7 * ((b.slip - uo.sl) * SV + (b.mom - uo.mo) * MV) +
    (options.mode === 'dice'
      ? g < 0
        ? (g === -1 ? 1.6 : 0.8) * 0.9
        : 0
      : (g < 0 && g >= -2 ? 0.8 : 0) - (g > 0 && g <= 2 ? 0.6 : 0))
  );
}

function botBestReact(
  i: number,
  die: number,
  uo: { sl: number; mo: number },
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): { sl: number; mo: number; tgt: { pos: number; lane: number }; sc: number; out: { pos: number; lane: number } } {
  const p = gameState.P[i];
  let best: {
    sl: number;
    mo: number;
    tgt: { pos: number; lane: number };
    sc: number;
    out: { pos: number; lane: number };
  } | null = null;

  for (let sl = 0; sl <= Math.min(p.slip, 2); sl++) {
    for (let mo = 0; mo <= Math.min(p.mom, 2); mo++) {
      for (const t of botCandidates(i, die, sl, mo, gameState, track, options, outsideLanes)) {
        const out = botMove(i, die, sl, mo, t, gameState, track, options, outsideLanes);
        const sp = p.pos;
        const sq = p.lane;
        p.pos = out.pos;
        p.lane = out.lane;
        const sc = botEval(i, { sl, mo }, uo, gameState, track, options);
        p.pos = sp;
        p.lane = sq;
        if (!best || sc > best.sc) {
          best = { sl, mo, tgt: t, sc, out };
        }
      }
    }
  }

  return best ?? { sl: 0, mo: 0, tgt: { pos: p.pos, lane: p.lane }, sc: 0, out: { pos: p.pos, lane: p.lane } };
}

function sampleHand(o: PlayerState, mode: GameMode): number[] {
  const m = o.dice.length - o.used.length;
  if (mode === 'cards') {
    return shuffle(CARDS.filter((c) => !o.played.includes(c))).slice(0, m);
  }
  return Array.from({ length: m }, () => 1 + Math.floor(Math.random() * 6));
}

function cloneSimPlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    dice: [...p.dice],
    used: [...p.used],
    deck: [...p.deck],
    played: [...p.played],
  };
}

function cloneSimState(gameState: GameState): GameState {
  return {
    ...gameState,
    P: [cloneSimPlayer(gameState.P[0]), cloneSimPlayer(gameState.P[1])],
    spd: [...gameState.spd],
    dv: [...gameState.dv],
    log: [...gameState.log],
    picks: [
      gameState.picks[0] ? { ...gameState.picks[0] } : null,
      gameState.picks[1] ? { ...gameState.picks[1] } : null,
    ],
    sel: { ...gameState.sel },
  };
}

export function computeStepFinishedState(
  state: GameState,
  options: GameOptions
): GameState {
  const p0 = { ...state.P[0] };
  const p1 = { ...state.P[1] };
  const outLogs: GameState['log'] = [];

  if (state.win === null) {
    const diff = p0.pos - p1.pos;
    const gap = Math.abs(diff);
    const leaderIdx = diff < 0 ? 1 : 0;
    const leaderSpeed = state.spd[leaderIdx];
    const trailerIdx = 1 - leaderIdx;

    const isCardsDraft =
      options.mode === 'cards' &&
      (leaderSpeed >= 8 ? gap >= 1 && gap <= 2 : leaderSpeed >= 4 && gap === 1);

    if (options.mode === 'dice' && gap >= 1) {
      const award = gap === 1 ? 2 : 1;
      if (trailerIdx === 0) {
        p0.slip = Math.min(4, p0.slip + award);
      } else {
        p1.slip = Math.min(4, p1.slip + award);
      }
      outLogs.push({
        id: `token-slip-${Date.now()}-${Math.random()}`,
        t: `P${trailerIdx + 1} is ${gap} behind → +${award} slipstream`,
      });
    }

    if (isCardsDraft) {
      if (trailerIdx === 0) {
        p0.slip = Math.min(4, p0.slip + 1);
      } else {
        p1.slip = Math.min(4, p1.slip + 1);
      }
      outLogs.push({
        id: `token-cardslip-${Date.now()}-${Math.random()}`,
        t: `P${trailerIdx + 1} is ${gap} behind (leader spd ${leaderSpeed}) → +1 slipstream${
          options.head ? `; P${leaderIdx + 1} gets headwind` : ''
        }`,
      });

      if (options.head) {
        if (leaderIdx === 0) {
          p0.head = Math.min(2, p0.head + 1);
        } else {
          p1.head = Math.min(2, p1.head + 1);
        }
      }
    }

    // End of round momentum & discard update
    const totalSteps = getRoundSteps(options, state.round);
    const isRoundEnd = state.step + 1 >= totalSteps;
    if (options.mom && isRoundEnd) {
      const roundDiff = p0.pos - p1.pos;
      if (roundDiff !== 0) {
        const roundLeader = roundDiff > 0 ? 0 : 1;
        if (roundLeader === 0) {
          p0.mom = Math.min(4, p0.mom + 1);
        } else {
          p1.mom = Math.min(4, p1.mom + 1);
        }
        outLogs.push({
          id: `token-mom-${Date.now()}-${Math.random()}`,
          t: `End of Round ${state.round}: P${roundLeader + 1} leads → +1 momentum`,
        });
      }
    }

    if (isRoundEnd && options.mode === 'cards') {
      outLogs.push({
        id: `tracker-update-${Date.now()}-${Math.random()}`,
        t: `Round ${state.round} complete: 3 cards committed to player discard piles`,
      });
    }
  }

  const isRoundEnd = state.step + 1 >= getRoundSteps(options, state.round);
  const updatedDiscards: [number[], number[]] =
    isRoundEnd && options.mode === 'cards'
      ? [[...p0.played], [...p1.played]]
      : (state.discardedCards ?? [[], []]);

  return {
    ...state,
    step: state.step + 1,
    P: [p0, p1],
    picks: [null, null],
    phase: state.win !== null ? 'over' : 'result',
    log: [...state.log, ...outLogs],
    discardedCards: updatedDiscards,
  };
}

export function computeBotLead(
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): { d: number; sl: number; mo: number; tgt: { pos: number; lane: number } } {
  const sim = cloneSimState(gameState);
  const B = 1;
  const p = sim.P[B];
  const o = sim.P[0];
  const opts: { d: number; sl: number; mo: number; tgt: { pos: number; lane: number }; sum: number }[] = [];
  const sB = [p.pos, p.lane];
  const sO = [o.pos, o.lane];
  const S = Array.from({ length: 30 }, () => sampleHand(o, options.mode));

  p.dice.forEach((c, d) => {
    if (p.used.includes(d)) return;
    for (let sl = 0; sl <= Math.min(p.slip, 1); sl++) {
      for (let mo = 0; mo <= Math.min(p.mom, 1); mo++) {
        botCandidates(B, c, sl, mo, sim, track, options, outsideLanes).forEach((t) =>
          opts.push({ d, sl, mo, tgt: t, sum: 0 })
        );
      }
    }
  });

  const endPos = options.laps * track.length;

  for (const op of opts) {
    const out = botMove(B, p.dice[op.d], op.sl, op.mo, op.tgt, sim, track, options, outsideLanes);
    for (const H of S) {
      sim.P[B].pos = out.pos;
      sim.P[B].lane = out.lane;
      let sc: number;
      if (out.pos >= endPos) {
        sc = 1000;
      } else {
        const r = botBestReact(0, H[0] ?? 3, { sl: op.sl, mo: op.mo }, sim, track, options, outsideLanes);
        sc = -r.sc;
        sim.P[0].pos = sO.length ? sO[0] : r.out.pos;
        sim.P[0].lane = sO.length ? sO[1] : r.out.lane;
      }
      op.sum += sc;
      sim.P[0].pos = sO[0];
      sim.P[0].lane = sO[1];
    }
    sim.P[B].pos = sB[0];
    sim.P[B].lane = sB[1];
  }

  if (opts.length === 0) {
    const firstAvail = p.dice.findIndex((_, idx) => !p.used.includes(idx));
    const d = Math.max(0, firstAvail);
    const cands = botCandidates(B, p.dice[d], 0, 0, sim, track, options, outsideLanes);
    return { d, sl: 0, mo: 0, tgt: cands[0] ?? { pos: p.pos, lane: p.lane } };
  }

  return opts.reduce((a, b) => (b.sum > a.sum ? b : a));
}

export function computeBotTrail(
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): { d: number; sum: number } {
  const sim = cloneSimState(gameState);
  const B = 1;
  const p = sim.P[B];
  const o = sim.P[0];
  const sO = [o.pos, o.lane];
  const S = Array.from({ length: 30 }, () => sampleHand(o, options.mode));
  let best: { d: number; sum: number } | null = null;
  const endPos = options.laps * track.length;

  p.dice.forEach((c, d) => {
    if (p.used.includes(d)) return;
    let sum = 0;
    for (const H of S) {
      const l = botBestReact(0, H[0] ?? 3, { sl: 0, mo: 0 }, sim, track, options, outsideLanes);
      sim.P[0].pos = l.out.pos;
      sim.P[0].lane = l.out.lane;
      sum +=
        l.out.pos >= endPos
          ? -1000
          : botBestReact(B, c, { sl: l.sl, mo: l.mo }, sim, track, options, outsideLanes).sc;
      sim.P[0].pos = sO[0];
      sim.P[0].lane = sO[1];
    }
    if (!best || sum > best.sum) {
      best = { d, sum };
    }
  });

  if (!best) {
    const firstAvail = p.dice.findIndex((_, idx) => !p.used.includes(idx));
    return { d: Math.max(0, firstAvail), sum: 0 };
  }

  return best;
}

export function computeBotReact(
  gameState: GameState,
  track: string[],
  options: GameOptions,
  outsideLanes?: (0 | 1)[]
): { sl: number; mo: number; tgt: { pos: number; lane: number } } {
  const sim = cloneSimState(gameState);
  const p = sim.P[1];
  const pick = sim.picks[1];
  const dieIdx = pick?.die ?? sim.sel.die ?? 0;
  const die = p.dice[dieIdx];
  const uo = { sl: 0, mo: 0 };
  const b = botBestReact(1, die, uo, sim, track, options, outsideLanes);
  return { sl: b.sl, mo: b.mo, tgt: b.tgt };
}
