import {
  CircuitCellRender,
  CircuitRenderGeometry,
  GeoCell,
  TrackCellMeta,
  TrackGeometry,
  Waypoint,
} from '../types/game';

export const LANE_WIDTH = 24;
export const CORNER_RADIUS = 46;

export function tangentAngle(
  g: { k: 'L' | 'A'; th: number },
  t: number
): number {
  if (g.k === 'L') {
    return (g.th * 180) / Math.PI;
  }
  return ((g.th - t * (Math.PI / 2)) * 180) / Math.PI;
}

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

// -------------------------------------------------------------
// Real-World Circuit Spline Geometry (Left and Right Corners)
// -------------------------------------------------------------

function catmullRomPoint(
  p0: Waypoint,
  p1: Waypoint,
  p2: Waypoint,
  p3: Waypoint,
  t: number
): { x: number; y: number; dx: number; dy: number } {
  const t2 = t * t;
  const t3 = t2 * t;

  // Position
  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  // Derivative (tangent)
  const dx =
    0.5 *
    (-p0.x +
      p2.x +
      2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t +
      3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2);

  const dy =
    0.5 *
    (-p0.y +
      p2.y +
      2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t +
      3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2);

  return { x, y, dx, dy };
}

export function computeCircuitGeometry(
  waypoints: Waypoint[],
  cellTypes: TrackCellMeta[]
): CircuitRenderGeometry {
  const N = cellTypes.length;
  const M = waypoints.length;
  const TRACK_WIDTH = 28;
  const HALF_W = TRACK_WIDTH / 2;

  // 1. Densely sample the spline perimeter to find equidistant arc-length stations
  const SAMPLES_PER_SEG = 30;
  const densePoints: { x: number; y: number; dx: number; dy: number }[] = [];
  const distAccum: number[] = [0];

  let totalPerimeter = 0;
  let prevPt: { x: number; y: number } | null = null;

  for (let i = 0; i < M; i++) {
    const p0 = waypoints[(i - 1 + M) % M];
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % M];
    const p3 = waypoints[(i + 2) % M];

    for (let s = 0; s < SAMPLES_PER_SEG; s++) {
      const t = s / SAMPLES_PER_SEG;
      const pt = catmullRomPoint(p0, p1, p2, p3, t);
      densePoints.push(pt);

      if (prevPt) {
        const d = Math.hypot(pt.x - prevPt.x, pt.y - prevPt.y);
        totalPerimeter += d;
        distAccum.push(totalPerimeter);
      }
      prevPt = pt;
    }
  }

  // Helper to interpolate dense samples at distance d
  const sampleAtDist = (targetDist: number) => {
    let dNorm = targetDist % totalPerimeter;
    if (dNorm < 0) dNorm += totalPerimeter;

    // Binary search in distAccum
    let low = 0;
    let high = distAccum.length - 1;
    while (low < high - 1) {
      const mid = (low + high) >> 1;
      if (distAccum[mid] <= dNorm) low = mid;
      else high = mid;
    }

    const d0 = distAccum[low];
    const d1 = distAccum[high];
    const span = Math.max(0.0001, d1 - d0);
    const frac = (dNorm - d0) / span;

    const pA = densePoints[low % densePoints.length];
    const pB = densePoints[high % densePoints.length];

    const x = pA.x + (pB.x - pA.x) * frac;
    const y = pA.y + (pB.y - pA.y) * frac;
    const dx = pA.dx + (pB.dx - pA.dx) * frac;
    const dy = pA.dy + (pB.dy - pA.dy) * frac;
    const len = Math.hypot(dx, dy) || 1;

    return {
      x,
      y,
      tx: dx / len,
      ty: dy / len,
    };
  };

  // 2. Compute the stations for each cell
  const stepDist = totalPerimeter / N;
  const cells: CircuitCellRender[] = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < N; i++) {
    const meta = cellTypes[i];
    const dStart = i * stepDist;
    const dEnd = (i + 1) * stepDist;
    const dMid = (i + 0.5) * stepDist;

    const ptStart = sampleAtDist(dStart);
    const ptEnd = sampleAtDist(dEnd);
    const ptMid = sampleAtDist(dMid);

    // Normal vectors (pointing left/outside)
    const nx0 = -ptStart.ty;
    const ny0 = ptStart.tx;

    const nx1 = -ptEnd.ty;
    const ny1 = ptEnd.tx;

    const nxM = -ptMid.ty;
    const nyM = ptMid.tx;

    // Outer edge (+HALF_W), Centerline (0), Inner edge (-HALF_W)
    const o0 = [ptStart.x + nx0 * HALF_W, ptStart.y + ny0 * HALF_W];
    const o1 = [ptEnd.x + nx1 * HALF_W, ptEnd.y + ny1 * HALF_W];

    const c0 = [ptStart.x, ptStart.y];
    const c1 = [ptEnd.x, ptEnd.y];

    const i0 = [ptStart.x - nx0 * HALF_W, ptStart.y - ny0 * HALF_W];
    const i1 = [ptEnd.x - nx1 * HALF_W, ptEnd.y - ny1 * HALF_W];

    // Bounding box tracking
    [o0, o1, i0, i1].forEach(([px, py]) => {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    });

    const isBottleneck = meta.type === 'S';
    const isCorner = meta.type === 'C';
    const outsideLane = meta.outsideLane ?? 1; // 1 = left lane is outside, 0 = right lane is outside

    // Lane 0: between inner edge and centerline (width / 4 offset)
    // Lane 1: between centerline and outer edge (+width / 4 offset)
    const poly0 = `${i0[0].toFixed(1)},${i0[1].toFixed(1)} ${i1[0].toFixed(1)},${i1[1].toFixed(1)} ${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c0[0].toFixed(1)},${c0[1].toFixed(1)}`;
    const poly1 = isBottleneck
      ? poly0
      : `${c0[0].toFixed(1)},${c0[1].toFixed(1)} ${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${o1[0].toFixed(1)},${o1[1].toFixed(1)} ${o0[0].toFixed(1)},${o0[1].toFixed(1)}`;

    const center0: [number, number] = [
      ptMid.x - nxM * (HALF_W * 0.5),
      ptMid.y - nyM * (HALF_W * 0.5),
    ];
    const center1: [number, number] = isBottleneck
      ? [ptMid.x, ptMid.y]
      : [
          ptMid.x + nxM * (HALF_W * 0.5),
          ptMid.y + nyM * (HALF_W * 0.5),
        ];

    const angle = (Math.atan2(ptMid.ty, ptMid.tx) * 180) / Math.PI;

    // Optional Kerb (apex & exit curb strips along the corner)
    let kerbPoly: string | undefined;
    let kerbSide: 'left' | 'right' | undefined;
    if (isCorner) {
      kerbSide = outsideLane === 1 ? 'left' : 'right';
      const kerbW = 4;
      if (outsideLane === 1) {
        // Outside is on the left, apex is on the right
        const k0 = [ptStart.x - nx0 * (HALF_W + kerbW), ptStart.y - ny0 * (HALF_W + kerbW)];
        const k1 = [ptEnd.x - nx1 * (HALF_W + kerbW), ptEnd.y - ny1 * (HALF_W + kerbW)];
        kerbPoly = `${i0[0].toFixed(1)},${i0[1].toFixed(1)} ${i1[0].toFixed(1)},${i1[1].toFixed(1)} ${k1[0].toFixed(1)},${k1[1].toFixed(1)} ${k0[0].toFixed(1)},${k0[1].toFixed(1)}`;
      } else {
        // Outside is on the right, apex is on the left
        const k0 = [ptStart.x + nx0 * (HALF_W + kerbW), ptStart.y + ny0 * (HALF_W + kerbW)];
        const k1 = [ptEnd.x + nx1 * (HALF_W + kerbW), ptEnd.y + ny1 * (HALF_W + kerbW)];
        kerbPoly = `${o0[0].toFixed(1)},${o0[1].toFixed(1)} ${o1[0].toFixed(1)},${o1[1].toFixed(1)} ${k1[0].toFixed(1)},${k1[1].toFixed(1)} ${k0[0].toFixed(1)},${k0[1].toFixed(1)}`;
      }
    }

    cells.push({
      idx: i,
      type: meta.type,
      outsideLane,
      poly0,
      poly1,
      center0,
      center1,
      angle,
      kerbPoly,
      kerbSide,
    });
  }

  // Finish line spanning both lanes at cell 0
  const pt0 = sampleAtDist(0);
  const fnx = -pt0.ty;
  const fny = pt0.tx;
  const finishLine = {
    x1: pt0.x - fnx * HALF_W,
    y1: pt0.y - fny * HALF_W,
    x2: pt0.x + fnx * HALF_W,
    y2: pt0.y + fny * HALF_W,
    angle: (Math.atan2(pt0.ty, pt0.tx) * 180) / Math.PI,
  };

  const pad = 24;
  const minVx = Math.floor(minX - pad);
  const minVy = Math.floor(minY - pad);
  const totalW = Math.ceil(maxX - minX + pad * 2);
  const totalH = Math.ceil(maxY - minY + pad * 2);

  return {
    W: totalW,
    H: totalH,
    minX: minVx,
    minY: minVy,
    width: totalW,
    height: totalH,
    viewBox: `${minVx} ${minVy} ${totalW} ${totalH}`,
    cells,
    finishLine,
  };
}
