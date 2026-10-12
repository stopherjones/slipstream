import { GeoCell, TrackGeometry } from '../types/game';

export const LANE_WIDTH = 24;
export const CORNER_RADIUS = 46;

export function at(
  g: { k: 'L' | 'A'; len: number; th: number; x?: number; y?: number; cx?: number; cy?: number },
  t: number,
  o: number
): [number, number] {
  let th: number;
  let x: number;
  let y: number;

  if (g.k === 'L') {
    th = g.th;
    x = (g.x ?? 0) + Math.cos(th) * g.len * t;
    y = (g.y ?? 0) + Math.sin(th) * g.len * t;
  } else {
    th = g.th - t * (Math.PI / 2);
    x = (g.cx ?? 0) - CORNER_RADIUS * Math.sin(th);
    y = (g.cy ?? 0) + CORNER_RADIUS * Math.cos(th);
  }

  return [x + Math.sin(th) * o, y - Math.cos(th) * o];
}

export function computeTrackGeometry(segments: string[]): TrackGeometry {
  const pad = 12;
  const unit = 21;
  const Lh = Math.max(5, segments[0].length + segments[8].length, segments[4].length) * unit;
  const Lv = Math.max(4, segments[2].length, segments[6].length) * unit;
  const xL = pad + LANE_WIDTH;
  const yT = pad + LANE_WIDTH;
  const xR = xL + Lh + 2 * CORNER_RADIUS;
  const yB = yT + Lv + 2 * CORNER_RADIUS;

  const a2 = (Lh * segments[8].length) / (segments[0].length + segments[8].length);
  const a1 = Lh - a2;
  const P = Math.PI;
  const arcLen = (CORNER_RADIUS * P) / 2;
  const xs = xL + CORNER_RADIUS + a2;

  const segs: GeoCell['g'][] = [
    { k: 'L', len: a1, x: xs, y: yB, th: 0 },
    { k: 'A', len: arcLen, cx: xR - CORNER_RADIUS, cy: yB - CORNER_RADIUS, th: 0 },
    { k: 'L', len: Lv, x: xR, y: yB - CORNER_RADIUS, th: -P / 2 },
    { k: 'A', len: arcLen, cx: xR - CORNER_RADIUS, cy: yT + CORNER_RADIUS, th: -P / 2 },
    { k: 'L', len: Lh, x: xR - CORNER_RADIUS, y: yT, th: -P },
    { k: 'A', len: arcLen, cx: xL + CORNER_RADIUS, cy: yT + CORNER_RADIUS, th: -P },
    { k: 'L', len: Lv, x: xL, y: yT + CORNER_RADIUS, th: -1.5 * P },
    { k: 'A', len: arcLen, cx: xL + CORNER_RADIUS, cy: yB - CORNER_RADIUS, th: -1.5 * P },
    { k: 'L', len: a2, x: xL + CORNER_RADIUS, y: yB, th: -2 * P },
  ];

  const cells: GeoCell[] = [];
  segments.forEach((str, j) => {
    const n = str.length;
    [...str].forEach((t, m) => {
      cells.push({
        g: segs[j],
        t1: m / n,
        t2: (m + 1) / n,
        t: t as 'T' | 'S' | 'C',
      });
    });
  });

  return {
    W: Math.round(xR + LANE_WIDTH + pad),
    H: Math.round(yB + LANE_WIDTH + pad),
    cells,
    xs,
    yB,
    xL,
    xR,
    yT,
  };
}

export function computePolygonPoints(
  g: GeoCell['g'],
  t1: number,
  t2: number,
  o1: number,
  o2: number
): string {
  const m = (t1 + t2) / 2;
  return [t1, m, t2]
    .map((t) => at(g, t, o1))
    .concat([t2, m, t1].map((t) => at(g, t, o2)))
    .map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1))
    .join(' ');
}
