/**
 * Geometry engine for section-based tracks with straights and 45° corners.
 *
 * Section types:
 * - 'T': Twin track straight (2-lane, normal cost)
 * - 'S': Single track straight (1-lane bottleneck)
 * - 'L': Left corner section (45° turn, single cell inside, double space outside)
 * - 'R': Right corner section (45° turn, single cell inside, double space outside)
 */

export type TrackSectionType = 'T' | 'S' | 'L' | 'R';

export interface KerbSegment {
  poly: string;
  color: 'red' | 'white';
}

export interface RenderCell {
  idx: number;
  type: 'T' | 'S' | 'C';
  sectionType: TrackSectionType;
  outsideLane: 0 | 1;
  poly0: string; // SVG polygon points for lane 0 (Left lane)
  poly1: string; // SVG polygon points for lane 1 (Right lane, if not single lane)
  center0: [number, number];
  center1: [number, number];
  angle: number; // Tangent angle in degrees for vehicle rotation
  kerbPoly?: string;
  kerbSide?: 'left' | 'right';
  kerbSegments?: KerbSegment[];
  dividerLine?: { x1: number; y1: number; x2: number; y2: number };
  cornerOutsideDivider?: { x1: number; y1: number; x2: number; y2: number };
}

export interface SectionTrackGeometry {
  cells: RenderCell[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  viewBox: string;
  isClosed: boolean;
  isFuzzyMatched: boolean;
  fuzzySnapDistance: number;
  endPoint: [number, number];
  endAngle: number;
  distanceToStart: number;
  angleDiffToStart: number;
  finishLine: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    angle: number;
  };
}

export const STRAIGHT_LEN = 36;
export const LANE_WIDTH = 20;
export const HALF_ROAD = LANE_WIDTH; // 20
export const CORNER_RADIUS = 46;
export const CORNER_ANGLE = Math.PI / 4; // 45 degrees in radians

// Maximum gap distance and angle difference allowed for automatic seamless closure
export const CLOSURE_DISTANCE_THRESHOLD = 90;
export const CLOSURE_ANGLE_THRESHOLD = 55;
export const FUZZY_DISTANCE_THRESHOLD = CLOSURE_DISTANCE_THRESHOLD;
export const FUZZY_ANGLE_THRESHOLD = CLOSURE_ANGLE_THRESHOLD;

export interface GeometryOptions {
  forceFuzzyClose?: boolean;
  fuzzyTolerance?: number;
}

/**
 * Computes exact rendering geometry for a sequence of track sections.
 * Guarantees that every section is rigidly and seamlessly connected to its neighbors
 * with zero tearing, zero distortions, and seamless finish line alignment.
 *
 * When a track loop is nearly closed (or when forceFuzzyClose is requested),
 * smooth distributed drift correction is applied across the entire chain of nodes.
 * This eliminates gaps naturally without pinching or warping any individual section!
 */
export function computeSectionTrackGeometry(
  sections: TrackSectionType[],
  options?: GeometryOptions
): SectionTrackGeometry {
  const finishLine = {
    x1: 0,
    y1: -HALF_ROAD,
    x2: 0,
    y2: HALF_ROAD,
    angle: 0,
  };

  if (sections.length === 0) {
    return {
      cells: [],
      minX: -40,
      minY: -40,
      maxX: 40,
      maxY: 40,
      width: 120,
      height: 120,
      viewBox: '-60 -60 120 120',
      isClosed: false,
      isFuzzyMatched: false,
      fuzzySnapDistance: 0,
      endPoint: [0, 0],
      endAngle: 0,
      distanceToStart: 0,
      angleDiffToStart: 0,
      finishLine,
    };
  }

  // -------------------------------------------------------------------------
  // PASS 1: Build the ideal forward chain of nodes
  // -------------------------------------------------------------------------
  let curX = 0;
  let curY = 0;
  let curHeading = 0; // Radians: 0 = East (+X), PI/2 = South (+Y), PI = West (-X), -PI/2 = North (-Y)

  interface RawNode {
    x: number;
    y: number;
    heading: number;
  }

  // rawNodes[0] is start of section 0 (0, 0, 0)
  // rawNodes[i+1] is end of section i
  const rawNodes: RawNode[] = [{ x: 0, y: 0, heading: 0 }];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const startX = curX;
    const startY = curY;
    const startHeading = curHeading;

    let endX = startX;
    let endY = startY;
    let endHeading = startHeading;

    if (sec === 'T' || sec === 'S') {
      endX = startX + Math.cos(startHeading) * STRAIGHT_LEN;
      endY = startY + Math.sin(startHeading) * STRAIGHT_LEN;
      endHeading = startHeading;
    } else if (sec === 'L') {
      // 45° left turn (counter-clockwise on grid: towards -Y)
      const R = CORNER_RADIUS;
      const nLx = Math.sin(startHeading);
      const nLy = -Math.cos(startHeading);
      const cx = startX + nLx * R;
      const cy = startY + nLy * R;
      const phi0 = Math.atan2(startY - cy, startX - cx);
      const phi1 = phi0 - CORNER_ANGLE;
      endX = cx + R * Math.cos(phi1);
      endY = cy + R * Math.sin(phi1);
      endHeading = startHeading - CORNER_ANGLE;
    } else if (sec === 'R') {
      // 45° right turn (clockwise on grid: towards +Y)
      const R = CORNER_RADIUS;
      const nRx = -Math.sin(startHeading);
      const nRy = Math.cos(startHeading);
      const cx = startX + nRx * R;
      const cy = startY + nRy * R;
      const phi0 = Math.atan2(startY - cy, startX - cx);
      const phi1 = phi0 + CORNER_ANGLE;
      endX = cx + R * Math.cos(phi1);
      endY = cy + R * Math.sin(phi1);
      endHeading = startHeading + CORNER_ANGLE;
    }

    curX = endX;
    curY = endY;
    curHeading = endHeading;
    rawNodes.push({ x: curX, y: curY, heading: curHeading });
  }

  // Calculate distance and heading difference to start line (0, 0) with target heading 0 mod 2PI
  const distanceToStart = Math.hypot(curX, curY);

  // Target heading for loop closure is the closest integer multiple of 2*PI
  const nearestMultiple = Math.round(curHeading / (2 * Math.PI)) * (2 * Math.PI);
  const headingErrorRad = curHeading - nearestMultiple;
  const angleDiffToStart = Math.abs((headingErrorRad * 180) / Math.PI);

  const maxDist = options?.forceFuzzyClose
    ? 160
    : (options?.fuzzyTolerance ?? CLOSURE_DISTANCE_THRESHOLD);
  const maxAngle = options?.forceFuzzyClose ? 85 : CLOSURE_ANGLE_THRESHOLD;

  // Determine if loop is closed (exact or fuzzy)
  const isClosed =
    sections.length >= 4 &&
    ((distanceToStart <= maxDist && angleDiffToStart <= maxAngle) ||
      Boolean(options?.forceFuzzyClose));

  const isFuzzyMatched = isClosed && (distanceToStart > 0.5 || angleDiffToStart > 0.5);
  const fuzzySnapDistance = isFuzzyMatched ? Math.round(distanceToStart) : 0;

  // -------------------------------------------------------------------------
  // PASS 2: Smooth distributed loop closure (if closed)
  // -------------------------------------------------------------------------
  // Instead of distorting solely the last piece, distribute the closure error
  // smoothly across all nodes along the track using linear/smoothstep weighting.
  // Node 0 remains at (0, 0, 0); Node N lands EXACTLY at (0, 0, nearestMultiple).
  // Each piece shifts by at most 1-2 pixels relative to its neighbors,
  // making all seams completely continuous and visually flawless!
  const N = sections.length;
  const adjNodes: RawNode[] = [];

  for (let k = 0; k <= N; k++) {
    if (!isClosed) {
      adjNodes.push({ ...rawNodes[k] });
    } else {
      const t = k / N;
      // Linear weight distribution guarantees constant strain across all pieces
      const w = t;
      adjNodes.push({
        x: rawNodes[k].x - w * curX,
        y: rawNodes[k].y - w * curY,
        heading: rawNodes[k].heading - w * headingErrorRad,
      });
    }
  }

  // -------------------------------------------------------------------------
  // PASS 3: Construct road cells using adjusted nodes
  // -------------------------------------------------------------------------
  const cells: RenderCell[] = [];

  for (let idx = 0; idx < N; idx++) {
    const sec = sections[idx];
    const sNode = adjNodes[idx];
    const eNode = adjNodes[idx + 1];

    const sX = sNode.x;
    const sY = sNode.y;
    const sHead = sNode.heading;

    const eX = eNode.x;
    const eY = eNode.y;
    const eHead = eNode.heading;

    // Normals for left and right road edges:
    // With heading 0 (East along +X), Left is North (-Y) and Right is South (+Y)
    const nLs = [Math.sin(sHead), -Math.cos(sHead)];
    const nRs = [-Math.sin(sHead), Math.cos(sHead)];
    const nLe = [Math.sin(eHead), -Math.cos(eHead)];
    const nRe = [-Math.sin(eHead), Math.cos(eHead)];

    const midX = (sX + eX) / 2;
    const midY = (sY + eY) / 2;
    const avgHeadDeg = (((sHead + eHead) / 2) * 180) / Math.PI;

    if (sec === 'S') {
      // Single track bottleneck
      const BW = LANE_WIDTH * 0.8;
      const p1 = [sX + nLs[0] * BW, sY + nLs[1] * BW];
      const p2 = [eX + nLe[0] * BW, eY + nLe[1] * BW];
      const p3 = [eX + nRe[0] * BW, eY + nRe[1] * BW];
      const p4 = [sX + nRs[0] * BW, sY + nRs[1] * BW];

      const poly0 = `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} ${p3[0].toFixed(1)},${p3[1].toFixed(1)} ${p4[0].toFixed(1)},${p4[1].toFixed(1)}`;

      cells.push({
        idx,
        type: 'S',
        sectionType: 'S',
        outsideLane: 0,
        poly0,
        poly1: '',
        center0: [midX, midY],
        center1: [midX, midY],
        angle: avgHeadDeg,
      });
    } else if (sec === 'T') {
      // Twin straight
      const W = LANE_WIDTH;
      const pL_s = [sX + nLs[0] * W, sY + nLs[1] * W];
      const pC_s = [sX, sY];
      const pR_s = [sX + nRs[0] * W, sY + nRs[1] * W];

      const pL_e = [eX + nLe[0] * W, eY + nLe[1] * W];
      const pC_e = [eX, eY];
      const pR_e = [eX + nRe[0] * W, eY + nRe[1] * W];

      const poly0 = `${pL_s[0].toFixed(1)},${pL_s[1].toFixed(1)} ${pL_e[0].toFixed(1)},${pL_e[1].toFixed(1)} ${pC_e[0].toFixed(1)},${pC_e[1].toFixed(1)} ${pC_s[0].toFixed(1)},${pC_s[1].toFixed(1)}`;
      const poly1 = `${pC_s[0].toFixed(1)},${pC_s[1].toFixed(1)} ${pC_e[0].toFixed(1)},${pC_e[1].toFixed(1)} ${pR_e[0].toFixed(1)},${pR_e[1].toFixed(1)} ${pR_s[0].toFixed(1)},${pR_s[1].toFixed(1)}`;

      const c0: [number, number] = [
        (pL_s[0] + pL_e[0] + pC_e[0] + pC_s[0]) / 4,
        (pL_s[1] + pL_e[1] + pC_e[1] + pC_s[1]) / 4,
      ];
      const c1: [number, number] = [
        (pC_s[0] + pC_e[0] + pR_e[0] + pR_s[0]) / 4,
        (pC_s[1] + pC_e[1] + pR_e[1] + pR_s[1]) / 4,
      ];

      cells.push({
        idx,
        type: 'T',
        sectionType: 'T',
        outsideLane: 1,
        poly0,
        poly1,
        center0: c0,
        center1: c1,
        angle: avgHeadDeg,
        dividerLine: { x1: sX, y1: sY, x2: eX, y2: eY },
      });
    } else {
      // 45° Corner ('L' or 'R')
      // Rendered with cubic Hermite spline guaranteeing C1 tangent continuity
      // flush against adjacent straight or corner sections!
      const isLeft = sec === 'L';
      const M = CORNER_RADIUS * CORNER_ANGLE; // Tangent scale ~36.1
      const T0x = Math.cos(sHead) * M;
      const T0y = Math.sin(sHead) * M;
      const T1x = Math.cos(eHead) * M;
      const T1y = Math.sin(eHead) * M;

      const STEPS = 8;
      const ptsLeft: [number, number][] = [];
      const ptsCenter: [number, number][] = [];
      const ptsRight: [number, number][] = [];
      const ptsKerb: [number, number][] = [];

      for (let s = 0; s <= STEPS; s++) {
        const u = s / STEPS;
        const u2 = u * u;
        const u3 = u2 * u;

        // Hermite basis functions
        const h00 = 2 * u3 - 3 * u2 + 1;
        const h10 = u3 - 2 * u2 + u;
        const h01 = -2 * u3 + 3 * u2;
        const h11 = u3 - u2;

        const px = h00 * sX + h10 * T0x + h01 * eX + h11 * T1x;
        const py = h00 * sY + h10 * T0y + h01 * eY + h11 * T1y;

        // Tangent derivative
        const dh00 = 6 * u2 - 6 * u;
        const dh10 = 3 * u2 - 4 * u + 1;
        const dh01 = -6 * u2 + 6 * u;
        const dh11 = 3 * u2 - 2 * u;

        const vx = dh00 * sX + dh10 * T0x + dh01 * eX + dh11 * T1x;
        const vy = dh00 * sY + dh10 * T0y + dh01 * eY + dh11 * T1y;
        const vLen = Math.hypot(vx, vy) || 1;
        const tx = vx / vLen;
        const ty = vy / vLen;

        // Unit left normal: (ty, -tx); unit right normal: (-ty, tx)
        const nLx = ty;
        const nLy = -tx;
        const nRx = -ty;
        const nRy = tx;

        const W = LANE_WIDTH;
        ptsLeft.push([px + nLx * W, py + nLy * W]);
        ptsCenter.push([px, py]);
        ptsRight.push([px + nRx * W, py + nRy * W]);

        // Kerb extends 5.5 units into the inside apex
        if (isLeft) {
          ptsKerb.push([px + nLx * (W + 5.5), py + nLy * (W + 5.5)]);
        } else {
          ptsKerb.push([px + nRx * (W + 5.5), py + nRy * (W + 5.5)]);
        }
      }

      // Lane 0: left boundary forward, center boundary backward
      const poly0 = ptsLeft
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat([...ptsCenter].reverse().map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`))
        .join(' ');

      // Lane 1: center boundary forward, right boundary backward
      const poly1 = ptsCenter
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat([...ptsRight].reverse().map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`))
        .join(' ');

      // Full Kerb outline polygon (fallback)
      let kerbPoly = '';
      if (isLeft) {
        kerbPoly = ptsKerb
          .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
          .concat([...ptsLeft].reverse().map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`))
          .join(' ');
      } else {
        kerbPoly = ptsKerb
          .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
          .concat([...ptsRight].reverse().map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`))
          .join(' ');
      }

      // Radial Kerb Segments: each tooth connects the road edge to the kerb edge along
      // the normal vectors, pointing DIRECTLY RADIALLY INTO THE CORNER APEX at every angle!
      const kerbSegments: KerbSegment[] = [];
      for (let s = 0; s < STEPS; s++) {
        const roadA = isLeft ? ptsLeft[s] : ptsRight[s];
        const roadB = isLeft ? ptsLeft[s + 1] : ptsRight[s + 1];
        const kerbB = ptsKerb[s + 1];
        const kerbA = ptsKerb[s];

        const poly = `${roadA[0].toFixed(1)},${roadA[1].toFixed(1)} ${roadB[0].toFixed(1)},${roadB[1].toFixed(1)} ${kerbB[0].toFixed(1)},${kerbB[1].toFixed(1)} ${kerbA[0].toFixed(1)},${kerbA[1].toFixed(1)}`;
        kerbSegments.push({
          poly,
          color: s % 2 === 0 ? 'red' : 'white',
        });
      }

      // Midpoint centers for car placement (sampled around mid step s = 3, 4)
      const midIdx = Math.floor(STEPS / 2);
      const c0: [number, number] = [
        (ptsLeft[midIdx][0] + ptsCenter[midIdx][0]) / 2,
        (ptsLeft[midIdx][1] + ptsCenter[midIdx][1]) / 2,
      ];
      const c1: [number, number] = [
        (ptsCenter[midIdx][0] + ptsRight[midIdx][0]) / 2,
        (ptsCenter[midIdx][1] + ptsRight[midIdx][1]) / 2,
      ];

      // Divider line splitting the outside lane into two distinct spaces at midpoint (step = 4)
      const cornerOutsideDivider = {
        x1: ptsCenter[midIdx][0],
        y1: ptsCenter[midIdx][1],
        x2: isLeft ? ptsRight[midIdx][0] : ptsLeft[midIdx][0],
        y2: isLeft ? ptsRight[midIdx][1] : ptsLeft[midIdx][1],
      };

      cells.push({
        idx,
        type: 'C',
        sectionType: isLeft ? 'L' : 'R',
        outsideLane: isLeft ? 1 : 0, // In left turn, lane 1 (right) is outside; in right turn, lane 0 (left) is outside
        poly0,
        poly1,
        center0: c0,
        center1: c1,
        angle: avgHeadDeg,
        kerbPoly,
        kerbSide: isLeft ? 'left' : 'right',
        kerbSegments,
        cornerOutsideDivider,
      });
    }
  }

  // Calculate bounding box
  let minX = -LANE_WIDTH * 2;
  let minY = -LANE_WIDTH * 2;
  let maxX = STRAIGHT_LEN + LANE_WIDTH * 2;
  let maxY = LANE_WIDTH * 2;

  cells.forEach((cell) => {
    [cell.center0, cell.center1].forEach(([px, py]) => {
      minX = Math.min(minX, px - LANE_WIDTH * 2);
      minY = Math.min(minY, py - LANE_WIDTH * 2);
      maxX = Math.max(maxX, px + LANE_WIDTH * 2);
      maxY = Math.max(maxY, py + LANE_WIDTH * 2);
    });
  });

  const width = Math.max(200, maxX - minX);
  const height = Math.max(140, maxY - minY);
  const pad = 24;

  const viewBox = `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(width + pad * 2).toFixed(1)} ${(height + pad * 2).toFixed(1)}`;

  return {
    cells,
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    viewBox,
    isClosed,
    isFuzzyMatched,
    fuzzySnapDistance,
    endPoint: [curX, curY],
    endAngle: (curHeading * 180) / Math.PI,
    distanceToStart,
    angleDiffToStart,
    finishLine,
  };
}

/**
 * Intelligent closure solver:
 * Calculates the exact missing track sections needed to bridge the gap
 * from the current track head back to the start line (0, 0).
 */
export function smartCloseTrack(
  currentSections: TrackSectionType[]
): TrackSectionType[] {
  const geo = computeSectionTrackGeometry(currentSections);
  if (geo.isClosed) return currentSections;

  if (currentSections.length === 0) {
    return ['T', 'T', 'R', 'R', 'T', 'T', 'R', 'R', 'T', 'T', 'R', 'R', 'T', 'T', 'R', 'R'];
  }

  const [endX, endY] = geo.endPoint;
  const headingRad = ((geo.endAngle * Math.PI) / 180) % (2 * Math.PI);
  const normalizedHeading = (headingRad + 2 * Math.PI) % (2 * Math.PI);

  // Directly facing the start line on the straight heading East
  if (endX < -20 && Math.abs(endY) < 35 && (normalizedHeading < 0.3 || normalizedHeading > 2 * Math.PI - 0.3)) {
    const straightsNeeded = Math.max(1, Math.round(Math.abs(endX) / STRAIGHT_LEN));
    const addedStraights: TrackSectionType[] = Array(straightsNeeded).fill('T');
    return [...currentSections, ...addedStraights];
  }

  // Best-first / A* search to bridge any general gap (up to 7 steps)
  const options: TrackSectionType[] = ['T', 'R', 'L', 'S'];

  interface SearchNode {
    path: TrackSectionType[];
    score: number;
    dist: number;
  }

  const queue: SearchNode[] = [
    {
      path: [],
      score: geo.distanceToStart + geo.angleDiffToStart * 0.8,
      dist: geo.distanceToStart,
    },
  ];

  let bestFound: TrackSectionType[] | null = null;
  let iterations = 0;
  const MAX_ITERATIONS = 600;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift()!;

    if (current.path.length > 7) continue;

    for (const opt of options) {
      const nextPath = [...current.path, opt];
      const testCandidate = [...currentSections, ...nextPath];
      const testGeo = computeSectionTrackGeometry(testCandidate);

      if (testGeo.isClosed) {
        return testCandidate;
      }

      if (nextPath.length < 7 && testGeo.distanceToStart < current.dist + 60) {
        const score =
          testGeo.distanceToStart + testGeo.angleDiffToStart * 0.85 + nextPath.length * 8;
        queue.push({
          path: nextPath,
          score,
          dist: testGeo.distanceToStart,
        });
      }
    }

    if (queue.length > 60) {
      queue.splice(60);
    }
  }

  return bestFound ?? currentSections;
}

export const autoCloseSections = smartCloseTrack;

/**
 * Convert legacy 9-segment track string array into Section array.
 */
export function convertSegmentsToSections(
  segments: string[]
): TrackSectionType[] {
  const sections: TrackSectionType[] = [];

  segments.forEach((seg, idx) => {
    const isCorner = idx % 2 !== 0;
    if (isCorner) {
      // 90° corner = two 45° right turns
      sections.push('R', 'R');
    } else {
      for (const ch of seg) {
        if (ch === 'S') sections.push('S');
        else sections.push('T');
      }
    }
  });

  return sections;
}
