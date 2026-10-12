export type GameMode = 'dice' | 'cards';

export type BotDifficulty = 'off' | 'medium';

export interface GameOptions {
  mode: GameMode;
  bot: BotDifficulty;
  laps: number;
  mom: boolean;   // Momentum token rule
  head: boolean;  // Headwind rule
  skip: boolean;  // Skip rule (leader skips highest, trailer skips lowest)
  pass: boolean;  // Slipstream pass rule (jump ahead if landing behind/on opponent)
}

export interface PlayerState {
  pos: number;
  lane: number;
  dice: number[];
  used: number[];
  slip: number;
  mom: number;
  head: number;
  deck: number[];
  played: number[];
  tot: number;
  cnt: number;
}

export interface TargetSelection {
  die: number | null;
  slip: number;
  mom: number;
  tgt: { pos: number; lane: number } | null;
}

export type GamePhase = 'roll' | 'pick0' | 'pick1' | 'cover' | 'react' | 'result' | 'over';

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

export type TrackSectionType = 'T' | 'S' | 'L' | 'R';

export interface TrackCellMeta {
  type: 'T' | 'S' | 'C';
  outsideLane?: 0 | 1; // 1 if turning right (left lane is outside), 0 if turning left (right lane is outside)
}

export interface TrackDefinition {
  id: string;
  name: string;
  country: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Pro';
  lapsDefault: number;
  segments: string[]; // 9 segments fallback
  sections?: TrackSectionType[]; // Section-based layout: 'T' (twin), 'S' (single), 'L' (45° left), 'R' (45° right)
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
  angle: number; // tangent direction in degrees (0..360)
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

export interface GameState {
  round: number;
  step: number;
  lead: number; // 0 or 1
  tr: number;   // trailing player index in current step
  spd: [number, number];
  dv: [number, number];
  phase: GamePhase;
  P: [PlayerState, PlayerState];
  picks: [TargetSelection | null, TargetSelection | null];
  log: LogEntry[];
  win: number | null;
  sel: TargetSelection;
  discardedCards?: [number[], number[]];
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
