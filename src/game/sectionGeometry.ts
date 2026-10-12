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

export interface RenderCell {
  idx: number;
  type: 'T' | 'S' | 'C';
  sectionType: TrackSectionType;
  outsideLane: 0 | 1; // In 'L', outside is lane 1 (right). In 'R', outside is lane 0 (left).
  poly0: string; // SVG polygon points for lane 0 (Left lane)
  poly1: string; // SVG polygon points for lane 1 (Right lane, if not single lane)
  center0: [number, number];
  center1: [number, number];
  angle: number; // Tangent angle in degrees for vehicle rotation
  kerbPoly?: string;
  kerbSide?: 'left' | 'right';
  dividerLine?: { x1: number; y1: number; x2: number; y2: number };
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
export const HALF_ROAD = LANE_WIDTH; // Road width is 2 * LANE_WIDTH = 40 (or 20 each side of centerline)
export const CORNER_RADIUS = 46; // Centerline radius of 45° corner
export const CORNER_ANGLE = Math.PI / 4; // 45 degrees in radians

/**
 * Computes exact rendering geometry for a sequence of track sections.
 */
export function computeSectionTrackGeometry(
  sections: TrackSectionType[]
): SectionTrackGeometry {
  // Start position and heading (East = 0 rad, +x right, +y down)
  let curX = 0;
  let curY = 0;
  let curHeading = 0;

  const cells: RenderCell[] = [];

  // Start / finish line orientation at (0, 0), perpendicular to heading 0
  const finishLine = {
    x1: 0,
    y1: -HALF_ROAD,
    x2: 0,
    y2: HALF_ROAD,
    angle: 0,
  };

  sections.forEach((sec, idx) => {
    const isTwin = sec === 'T';
    const isSingle = sec === 'S';
    const isLeft = sec === 'L';
    const isRight = sec === 'R';

    if (isTwin || isSingle) {
      // Straight section: moves forward by STRAIGHT_LEN
      const dx = Math.cos(curHeading);
      const dy = Math.sin(curHeading);

      // Normal perpendicular vectors (in screen space +y down):
      // Left normal (pointing left of travel): (sin, -cos)
      // Right normal (pointing right of travel): (-sin, cos)
      const nLx = Math.sin(curHeading);
      const nLy = -Math.cos(curHeading);
      const nRx = -Math.sin(curHeading);
      const nRy = Math.cos(curHeading);

      const startX = curX;
      const startY = curY;
      const endX = curX + dx * STRAIGHT_LEN;
      const endY = curY + dy * STRAIGHT_LEN;

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const headingDeg = (curHeading * 180) / Math.PI;

      if (isSingle) {
        // Single lane centered bottleneck
        const p1 = [startX + nLx * (LANE_WIDTH * 0.8), startY + nLy * (LANE_WIDTH * 0.8)];
        const p2 = [endX + nLx * (LANE_WIDTH * 0.8), endY + nLy * (LANE_WIDTH * 0.8)];
        const p3 = [endX + nRx * (LANE_WIDTH * 0.8), endY + nRy * (LANE_WIDTH * 0.8)];
        const p4 = [startX + nRx * (LANE_WIDTH * 0.8), startY + nRy * (LANE_WIDTH * 0.8)];

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
          angle: headingDeg,
        });
      } else {
        // Twin lane straight
        // Lane 0 is Left lane: from centerline (0) to left edge (HALF_ROAD)
        // Lane 1 is Right lane: from centerline (0) to right edge (HALF_ROAD)
        const pL_s = [startX + nLx * LANE_WIDTH, startY + nLy * LANE_WIDTH];
        const pL_e = [endX + nLx * LANE_WIDTH, endY + nLy * LANE_WIDTH];
        const pC_s = [startX, startY];
        const pC_e = [endX, endY];
        const pR_s = [startX + nRx * LANE_WIDTH, startY + nRy * LANE_WIDTH];
        const pR_e = [endX + nRx * LANE_WIDTH, endY + nRy * LANE_WIDTH];

        const poly0 = `${pL_s[0].toFixed(1)},${pL_s[1].toFixed(1)} ${pL_e[0].toFixed(1)},${pL_e[1].toFixed(1)} ${pC_e[0].toFixed(1)},${pC_e[1].toFixed(1)} ${pC_s[0].toFixed(1)},${pC_s[1].toFixed(1)}`;
        const poly1 = `${pC_s[0].toFixed(1)},${pC_s[1].toFixed(1)} ${pC_e[0].toFixed(1)},${pC_e[1].toFixed(1)} ${pR_e[0].toFixed(1)},${pR_e[1].toFixed(1)} ${pR_s[0].toFixed(1)},${pR_s[1].toFixed(1)}`;

        const c0: [number, number] = [midX + nLx * (LANE_WIDTH / 2), midY + nLy * (LANE_WIDTH / 2)];
        const c1: [number, number] = [midX + nRx * (LANE_WIDTH / 2), midY + nRy * (LANE_WIDTH / 2)];

        cells.push({
          idx,
          type: 'T',
          sectionType: 'T',
          outsideLane: 1,
          poly0,
          poly1,
          center0: c0,
          center1: c1,
          angle: headingDeg,
          dividerLine: { x1: startX, y1: startY, x2: endX, y2: endY },
        });
      }

      curX = endX;
      curY = endY;
    } else if (isLeft) {
      // 45° Left Corner: turns counter-clockwise in screen coordinates
      // Center is to the left: P_start + nLeft * R
      const R = CORNER_RADIUS;
      const nLx = Math.sin(curHeading);
      const nLy = -Math.cos(curHeading);

      const cx = curX + nLx * R;
      const cy = curY + nLy * R;

      // Angle from center to start point:
      const phi0 = Math.atan2(curY - cy, curX - cx);
      // Turning left reduces phi by 45° (-Math.PI / 4)
      const phi1 = phi0 - CORNER_ANGLE;

      // Sample arc points for smooth SVG polygon
      const STEPS = 5;
      const ptsInner: [number, number][] = []; // Left / inside lane (radius R - LANE_WIDTH)
      const ptsCenter: [number, number][] = []; // Centerline (radius R)
      const ptsOuter: [number, number][] = []; // Right / outside lane (radius R + LANE_WIDTH)
      const ptsKerb: [number, number][] = [];

      for (let s = 0; s <= STEPS; s++) {
        const phi = phi0 + (phi1 - phi0) * (s / STEPS);
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);

        ptsInner.push([cx + (R - LANE_WIDTH) * cosP, cy + (R - LANE_WIDTH) * sinP]);
        ptsCenter.push([cx + R * cosP, cy + R * sinP]);
        ptsOuter.push([cx + (R + LANE_WIDTH) * cosP, cy + (R + LANE_WIDTH) * sinP]);
        ptsKerb.push([cx + (R - LANE_WIDTH - 5) * cosP, cy + (R - LANE_WIDTH - 5) * sinP]);
      }

      // Lane 0 is INSIDE (Left lane): between ptsInner and ptsCenter
      const poly0 = ptsInner
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat(
          [...ptsCenter]
            .reverse()
            .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        )
        .join(' ');

      // Lane 1 is OUTSIDE (Right lane, double space / cost 2): between ptsCenter and ptsOuter
      const poly1 = ptsCenter
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat(
          [...ptsOuter]
            .reverse()
            .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        )
        .join(' ');

      // Apex kerb along inside edge
      const kerbPoly = ptsKerb
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat(
          [...ptsInner]
            .reverse()
            .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        )
        .join(' ');

      const midPhi = (phi0 + phi1) / 2;
      const midAngleDeg = ((curHeading - CORNER_ANGLE / 2) * 180) / Math.PI;

      const c0: [number, number] = [
        cx + (R - LANE_WIDTH / 2) * Math.cos(midPhi),
        cy + (R - LANE_WIDTH / 2) * Math.sin(midPhi),
      ];
      const c1: [number, number] = [
        cx + (R + LANE_WIDTH / 2) * Math.cos(midPhi),
        cy + (R + LANE_WIDTH / 2) * Math.sin(midPhi),
      ];

      cells.push({
        idx,
        type: 'C',
        sectionType: 'L',
        outsideLane: 1, // Lane 1 is outside
        poly0,
        poly1,
        center0: c0,
        center1: c1,
        angle: midAngleDeg,
        kerbPoly,
        kerbSide: 'left',
      });

      // Update position and heading
      curX = cx + R * Math.cos(phi1);
      curY = cy + R * Math.sin(phi1);
      curHeading -= CORNER_ANGLE;
    } else if (isRight) {
      // 45° Right Corner: turns clockwise in screen coordinates
      // Center is to the right: P_start + nRight * R
      const R = CORNER_RADIUS;
      const nRx = -Math.sin(curHeading);
      const nRy = Math.cos(curHeading);

      const cx = curX + nRx * R;
      const cy = curY + nRy * R;

      // Angle from center to start point:
      const phi0 = Math.atan2(curY - cy, curX - cx);
      // Turning right increases phi by 45° (+Math.PI / 4)
      const phi1 = phi0 + CORNER_ANGLE;

      const STEPS = 5;
      const ptsInner: [number, number][] = []; // Right / inside lane (radius R - LANE_WIDTH)
      const ptsCenter: [number, number][] = []; // Centerline (radius R)
      const ptsOuter: [number, number][] = []; // Left / outside lane (radius R + LANE_WIDTH)
      const ptsKerb: [number, number][] = [];

      for (let s = 0; s <= STEPS; s++) {
        const phi = phi0 + (phi1 - phi0) * (s / STEPS);
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);

        ptsInner.push([cx + (R - LANE_WIDTH) * cosP, cy + (R - LANE_WIDTH) * sinP]);
        ptsCenter.push([cx + R * cosP, cy + R * sinP]);
        ptsOuter.push([cx + (R + LANE_WIDTH) * cosP, cy + (R + LANE_WIDTH) * sinP]);
        ptsKerb.push([cx + (R - LANE_WIDTH - 5) * cosP, cy + (R - LANE_WIDTH - 5) * sinP]);
      }

      // Lane 0 is OUTSIDE (Left lane, double space / cost 2): between ptsOuter and ptsCenter
      const poly0 = ptsCenter
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat(
          [...ptsOuter]
            .reverse()
            .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        )
        .join(' ');

      // Lane 1 is INSIDE (Right lane, single cell / cost 1): between ptsCenter and ptsInner
      const poly1 = ptsInner
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat(
          [...ptsCenter]
            .reverse()
            .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        )
        .join(' ');

      // Apex kerb along inside edge
      const kerbPoly = ptsKerb
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .concat(
          [...ptsInner]
            .reverse()
            .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        )
        .join(' ');

      const midPhi = (phi0 + phi1) / 2;
      const midAngleDeg = ((curHeading + CORNER_ANGLE / 2) * 180) / Math.PI;

      const c0: [number, number] = [
        cx + (R + LANE_WIDTH / 2) * Math.cos(midPhi),
        cy + (R + LANE_WIDTH / 2) * Math.sin(midPhi),
      ];
      const c1: [number, number] = [
        cx + (R - LANE_WIDTH / 2) * Math.cos(midPhi),
        cy + (R - LANE_WIDTH / 2) * Math.sin(midPhi),
      ];

      cells.push({
        idx,
        type: 'C',
        sectionType: 'R',
        outsideLane: 0, // Lane 0 is outside
        poly0,
        poly1,
        center0: c0,
        center1: c1,
        angle: midAngleDeg,
        kerbPoly,
        kerbSide: 'right',
      });

      // Update position and heading
      curX = cx + R * Math.cos(phi1);
      curY = cy + R * Math.sin(phi1);
      curHeading += CORNER_ANGLE;
    }
  });

  // Calculate distance to start (0, 0) and heading difference (0 rad)
  const distanceToStart = Math.hypot(curX, curY);
  const normalizedHeading = ((curHeading % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const angleDiffRad = Math.min(
    normalizedHeading,
    Math.abs(2 * Math.PI - normalizedHeading)
  );
  const angleDiffToStart = (angleDiffRad * 180) / Math.PI;

  // A loop is considered closed if distance to start is small and angle is aligned
  const isClosed = sections.length >= 4 && distanceToStart < 28 && angleDiffToStart < 25;

  // Compute bounding box
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
    endPoint: [curX, curY],
    endAngle: (curHeading * 180) / Math.PI,
    distanceToStart,
    angleDiffToStart,
    finishLine,
  };
}

/**
 * Intelligent pathfinder that calculates the sequence of sections
 * needed to cleanly close the track loop back onto the start line!
 */
export function autoCloseSections(
  currentSections: TrackSectionType[]
): TrackSectionType[] | null {
  const geo = computeSectionTrackGeometry(currentSections);
  if (geo.isClosed) return currentSections;

  // If blank, return a balanced compact oval
  if (currentSections.length === 0) {
    return ['T', 'T', 'R', 'R', 'T', 'T', 'R', 'R', 'T', 'T', 'R', 'R', 'T', 'T', 'R', 'R'];
  }

  const options: TrackSectionType[] = ['T', 'R', 'L', 'S'];
  
  // Best-first search with priority queue
  interface SearchNode {
    path: TrackSectionType[];
    score: number;
    dist: number;
  }

  const queue: SearchNode[] = [{ path: [], score: geo.distanceToStart + geo.angleDiffToStart * 0.8, dist: geo.distanceToStart }];
  let bestFound: TrackSectionType[] | null = null;
  let iterations = 0;
  const MAX_ITERATIONS = 400;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    // Sort ascending by score
    queue.sort((a, b) => a.score - b.score);
    const current = queue.shift()!;

    if (current.path.length > 8) continue;

    for (const opt of options) {
      const nextPath = [...current.path, opt];
      const testCandidate = [...currentSections, ...nextPath];
      const testGeo = computeSectionTrackGeometry(testCandidate);

      if (testGeo.isClosed) {
        return testCandidate;
      }

      if (nextPath.length < 8 && testGeo.distanceToStart < current.dist + 50) {
        const score = testGeo.distanceToStart + testGeo.angleDiffToStart * 0.9 + nextPath.length * 10;
        queue.push({
          path: nextPath,
          score,
          dist: testGeo.distanceToStart,
        });
      }
    }

    // Keep queue manageable
    if (queue.length > 50) {
      queue.splice(50);
    }
  }

  return bestFound;
}

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
