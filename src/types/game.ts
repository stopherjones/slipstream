export type BotDifficulty = 'off' | 'medium';

export interface GameOptions {
  bot: BotDifficulty;
  botCount: 1 | 2 | 3;
  laps: number;
  mom: boolean;   // Momentum token rule
  skip: boolean;  // Skip rule (leader skips highest, trailer skips lowest)
  pass: boolean;  // Slipstream pass rule (advance ahead if landing behind single opponent with open space)
}

export interface PlayerState {
  pos: number;
  lane: number;
  dice: number[];
  used: number[];
  slip: number;
  mom: number;
  tot: number;
  cnt: number;
}

export interface TargetSelection {
  die: number | null;
  slip: number;
  mom: number;
  tgt: { pos: number; lane: number } | null;
}

export type GamePhase = 'roll' | 'turn' | 'pick0' | 'pick1' | 'cover' | 'react' | 'result' | 'over';

export interface LogEntry {
  id: string;
  n?: number;
  t: string;
  time?: string;
  type?: 'system' | 'p1' | 'p2' | 'lap' | 'win';
}

export interface ReachMap {
  [coordKey: string]: number; // key: "pos:lane", value: pips used
}

export interface Waypoint {
  x: number;
  y: number;
}

export type TrackSectionType = 'T' | 'S' | 'L' | 'R' | 'SL' | 'SR';

export interface TrackCellMeta {
  type: 'T' | 'S' | 'C';
  outsideLane?: 0 | 1;
}

export interface TrackDefinition {
  id: string;
  name: string;
  country: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Pro';
  lapsDefault: number;
  segments: string[];
  sections?: TrackSectionType[];
  cellTypes?: TrackCellMeta[];
  waypoints?: Waypoint[];
}

export interface CircuitCellRender {
  idx: number;
  type: 'T' | 'S' | 'C';
  outsideLane: 0 | 1;
  poly0: string;
  poly1: string;
  center0: [number, number];
  center1: [number, number];
  angle: number;
  kerbPoly?: string;
  kerbSide?: 'left' | 'right';
}

export interface CircuitRenderGeometry {
  W: number;
  H: number;
  minX?: number;
  minY?: number;
  width?: number;
  height?: number;
  viewBox?: string;
  cells: CircuitCellRender[];
  finishLine: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    angle: number;
  };
}

export interface ChampionshipStanding {
  playerIdx: number;
  name: string;
  points: number;
  wins: number;
  secondPlaces: number;
  thirdPlaces: number;
  fourthPlaces: number;
  history: number[]; // points per race
}

export interface ChampionshipState {
  active: boolean;
  type: 'solo' | 'pass-and-play';
  currentRaceIndex: number;
  totalRaces: number;
  tracks: TrackDefinition[];
  standings: ChampionshipStanding[];
}

export interface GameState {
  round: number;
  step: number;
  turnIdx: number;       // Current index in turnOrder
  turnOrder: number[];   // Array of player indices ordered from 1st to last place
  lead: number;          // Leader player index (turnOrder[0])
  tr: number;            // Current active player index
  spd: number[];
  dv: number[];
  phase: GamePhase;
  P: PlayerState[];
  picks: (TargetSelection | null)[];
  log: LogEntry[];
  win: number | null;
  sel: TargetSelection;
  discardedDice?: number[][];
}

export interface GeoCell {
  g: {
    k: 'L' | 'A';
    len: number;
    th: number;
    x?: number;
    y?: number;
    cx?: number;
    cy?: number;
  };
  t1: number;
  t2: number;
  t: 'T' | 'S' | 'C';
}

export interface TrackGeometry {
  W: number;
  H: number;
  cells: GeoCell[];
  xs: number;
  yB: number;
  xL: number;
  xR: number;
  yT: number;
}
