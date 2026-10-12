import React, { useMemo } from 'react';
import {
  GameOptions,
  GameState,
  ReachMap,
  TargetSelection,
  TrackDefinition,
} from '../types/game';
import {
  at,
  computePolygonPoints,
  computeTrackGeometry,
  LANE_WIDTH,
  tangentAngle,
} from '../game/geometry';
import { computeSectionTrackGeometry } from '../game/sectionGeometry';
import { getJumpTarget, getPassTarget } from '../game/engine';

interface TrackCanvasProps {
  track: TrackDefinition;
  segments: string[];
  gameState: GameState;
  options: GameOptions;
  reach: ReachMap | null;
  selectedTarget: TargetSelection['tgt'];
  editorMode: boolean;
  onSelectTarget: (pos: number, lane: number) => void;
  onToggleCellEditor?: (index: number) => void;
  onOpenTrackSelector?: () => void;
}

export const TrackCanvas: React.FC<TrackCanvasProps> = ({
  track,
  segments,
  gameState,
  options,
  reach,
  selectedTarget,
  editorMode,
  onSelectTarget,
  onToggleCellEditor,
  onOpenTrackSelector,
}) => {
  const isSectionTrack = Boolean(track.sections && track.sections.length > 0);

  // Compute section geometry if track has sections
  const sectionGeo = useMemo(() => {
    if (!isSectionTrack) return null;
    try {
      return computeSectionTrackGeometry(track.sections!);
    } catch {
      return null;
    }
  }, [isSectionTrack, track.sections]);

  // Compute rectilinear geometry if legacy 9-segment track
  const trackGeo = useMemo(() => {
    if (isSectionTrack) return null;
    return computeTrackGeometry(segments);
  }, [isSectionTrack, segments]);

  const trackArray = useMemo(() => {
    if (isSectionTrack) {
      return track.sections!.map((s) => (s === 'L' || s === 'R' ? 'C' : s));
    }
    return segments.join('').split('') as ('T' | 'S' | 'C')[];
  }, [isSectionTrack, track.sections, segments]);

  const NC = trackArray.length;

  const activePlayerIdx =
    gameState.phase === 'pick0'
      ? 0
      : gameState.phase === 'react'
      ? gameState.tr
      : 1;

  const currentDie =
    gameState.sel.die !== null
      ? gameState.P[activePlayerIdx].dice[gameState.sel.die]
      : 0;

  // Reach lookup map
  const reachMapLookup = useMemo(() => {
    if (!reach) return {};
    const map: Record<string, { n: number; c: number }> = {};
    for (const k in reach) {
      const [n, l] = k.split(':').map(Number);
      map[`${n % NC}:${l}`] = { n, c: reach[k] };
    }
    return map;
  }, [reach, NC]);

  // Render Formula Car token
  const renderFormulaCar = (
    cx: number,
    cy: number,
    angle: number,
    playerIdx: number,
    isLeader: boolean
  ) => {
    const isP1 = playerIdx === 0;
    const bodyColor = isP1 ? '#2563eb' : '#ea580c';
    const accentColor = isP1 ? '#60a5fa' : '#fb923c';

    return (
      <g
        key={`car-token-p${playerIdx}`}
        transform={`translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${angle.toFixed(1)})`}
        className="transition-all duration-300 ease-out pointer-events-none drop-shadow-lg"
      >
        {/* Aerodynamic rear wing */}
        <polygon points="-8,-6 -6,-6 -6,6 -8,6" fill="#0f172a" />
        <rect x="-8.5" y="-5.5" width="2" height="11" rx="0.5" fill={bodyColor} />

        {/* Rear Wheels */}
        <rect x="-7" y="-7.5" width="4" height="2.5" rx="0.8" fill="#1e293b" />
        <rect x="-7" y="5" width="4" height="2.5" rx="0.8" fill="#1e293b" />

        {/* Chassis body */}
        <path
          d="M -7 -3.5 L 4 -3.5 L 9 -1.2 L 9 1.2 L 4 3.5 L -7 3.5 Z"
          fill={bodyColor}
          stroke="#0f172a"
          strokeWidth="0.7"
        />

        {/* Sidepod styling line */}
        <line
          x1="-4"
          y1="0"
          x2="4"
          y2="0"
          stroke={accentColor}
          strokeWidth="0.8"
          strokeDasharray="2 1"
        />

        {/* Front Wing */}
        <polygon points="8.5,-6.5 10,-6.5 10.5,6.5 9,6.5" fill="#0f172a" />
        <path d="M 6 -1.8 L 10 0 L 6 1.8 Z" fill={accentColor} />

        {/* Front Wheels */}
        <rect x="4.5" y="-7" width="3.5" height="2.2" rx="0.8" fill="#1e293b" />
        <rect x="4.5" y="4.8" width="3.5" height="2.2" rx="0.8" fill="#1e293b" />

        {/* Cockpit & Helmet */}
        <ellipse cx="0" cy="0" rx="2.2" ry="1.5" fill="#020617" />
        <circle cx="0.5" cy="0" r="1.3" fill="#f8fafc" />

        {/* Player Number Badge */}
        <text
          x="-3"
          y="0"
          dy=".35em"
          textAnchor="middle"
          fontSize="4.5"
          fontWeight="bold"
          fill="#ffffff"
          fontFamily="system-ui"
        >
          {playerIdx + 1}
        </text>

        {/* Golden Leader Crown */}
        {isLeader && (
          <polygon
            points="0,-5.5 -2.5,-3 2.5,-3"
            fill="#facc15"
            stroke="#b45309"
            strokeWidth="0.4"
          />
        )}
      </g>
    );
  };

  // -------------------------------------------------------------
  // SECTION-BASED TRACK RENDERING
  // -------------------------------------------------------------
  if (sectionGeo) {
    const centerX = (sectionGeo.minX + sectionGeo.maxX) / 2;
    const centerY = (sectionGeo.minY + sectionGeo.maxY) / 2;

    return (
      <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 select-none overflow-hidden touch-manipulation">
        <svg
          viewBox={sectionGeo.viewBox}
          className="w-full h-full max-h-[46vh] sm:max-h-[50vh] drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))' }}
        >
          <defs>
            <pattern
              id="curbRedWhite"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="4" height="8" fill="#ef4444" />
              <rect x="4" width="4" height="8" fill="#ffffff" />
            </pattern>

            <pattern
              id="cornerCostHatch"
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="7" height="7" fill="#1b2028" />
              <rect width="3.5" height="7" fill="#dc2626" opacity="0.65" />
            </pattern>

            <pattern id="checkeredFinish" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="3" height="3" fill="#ffffff" />
              <rect x="3" width="3" height="3" fill="#000000" />
              <rect y="3" width="3" height="3" fill="#000000" />
              <rect x="3" y="3" width="3" height="3" fill="#ffffff" />
            </pattern>

            <radialGradient id="circuitBackdrop" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#141a22" />
              <stop offset="100%" stopColor="#0b0f15" />
            </radialGradient>
          </defs>

          {/* Infield Base Terrain */}
          <rect
            x={sectionGeo.minX - 16}
            y={sectionGeo.minY - 16}
            width={sectionGeo.width + 32}
            height={sectionGeo.height + 32}
            rx={24}
            fill="url(#circuitBackdrop)"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Center Watermark & Quick Switcher */}
          <g
            transform={`translate(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`}
            onClick={onOpenTrackSelector}
            className="cursor-pointer group"
          >
            <rect
              x="-80"
              y="-22"
              width="160"
              height="44"
              rx="22"
              fill="rgba(15, 23, 42, 0.75)"
              stroke="rgba(245, 158, 11, 0.3)"
              strokeWidth="1"
              className="group-hover:stroke-amber-400 group-hover:fill-slate-900 transition-all"
            />
            <text
              x="0"
              y="-4"
              textAnchor="middle"
              className="font-extrabold tracking-wider text-[11px] uppercase select-none font-sans fill-stone-100 group-hover:fill-amber-300 transition-colors"
            >
              {track.name}
            </text>
            <text
              x="0"
              y="11"
              textAnchor="middle"
              className="font-mono text-[8px] tracking-wider select-none uppercase fill-amber-400 font-semibold group-hover:underline"
            >
              ↺ {track.country} · {NC} SPACES
            </text>
          </g>

          {/* Render Section Cells */}
          {sectionGeo.cells.map((cell) => {
            const isBottleneck = cell.type === 'S';
            const isCorner = cell.type === 'C';

            // Lanes to iterate
            const lanesList = isBottleneck ? [0] : [0, 1];

            return (
              <g key={`sec-cell-${cell.idx}`}>
                {/* Apex Kerb */}
                {cell.kerbPoly && (
                  <polygon
                    points={cell.kerbPoly}
                    fill="url(#curbRedWhite)"
                    stroke="#b91c1c"
                    strokeWidth="0.5"
                  />
                )}

                {/* Lanes */}
                {lanesList.map((lane) => {
                  const pts = lane === 0 ? cell.poly0 : cell.poly1;
                  const [cx, cy] = lane === 0 ? cell.center0 : cell.center1;
                  const isOutsideCorner = isCorner && cell.outsideLane === lane;

                  const lookupKey = `${cell.idx}:${lane}`;
                  const hm = reachMapLookup[lookupKey];
                  const isSelected =
                    selectedTarget &&
                    selectedTarget.pos === hm?.n &&
                    selectedTarget.lane === lane;

                  const carsHere = gameState.P.map((p, q) =>
                    p.pos % NC === cell.idx && (isBottleneck || p.lane === lane) ? q : -1
                  ).filter((q) => q >= 0);

                  return (
                    <g key={`sec-cell-${cell.idx}-lane-${lane}`}>
                      {/* Road surface */}
                      <polygon
                        points={pts}
                        fill={
                          isOutsideCorner
                            ? 'url(#cornerCostHatch)'
                            : isBottleneck
                            ? '#3f2f21'
                            : '#1a1f28'
                        }
                        stroke={isBottleneck ? '#854d0e' : '#334155'}
                        strokeWidth={isBottleneck ? 1.2 : 0.7}
                      />

                      {/* Divider line on straight */}
                      {cell.dividerLine && lane === 0 && !isBottleneck && (
                        <line
                          x1={cell.dividerLine.x1}
                          y1={cell.dividerLine.y1}
                          x2={cell.dividerLine.x2}
                          y2={cell.dividerLine.y2}
                          stroke="#ffffff"
                          strokeWidth="0.8"
                          strokeDasharray="4 3"
                          opacity={0.4}
                        />
                      )}

                      {/* Corner Cost Pip Badge */}
                      {isOutsideCorner && (
                        <g>
                          <circle cx={cx} cy={cy} r="3.5" fill="#dc2626" stroke="#ffffff" strokeWidth="0.5" />
                          <text
                            x={cx}
                            y={cy}
                            dy=".32em"
                            textAnchor="middle"
                            fontSize="3"
                            fontWeight="bold"
                            fill="#ffffff"
                            fontFamily="monospace"
                          >
                            2
                          </text>
                        </g>
                      )}

                      {/* Reach Target overlay highlight */}
                      {hm && (
                        <g
                          onClick={() => onSelectTarget(hm.n, lane)}
                          className="cursor-pointer group"
                        >
                          <polygon
                            points={pts}
                            fill={
                              isSelected
                                ? 'rgba(234, 179, 8, 0.55)'
                                : 'rgba(255, 255, 255, 0.32)'
                            }
                            stroke={isSelected ? '#fbbf24' : '#ffffff'}
                            strokeWidth={isSelected ? 2.5 : 1.4}
                            strokeDasharray={isSelected ? undefined : '4 2'}
                            className="transition-all hover:fill-amber-300/40"
                          />
                          {carsHere.length === 0 && (
                            <text
                              x={cx.toFixed(1)}
                              y={cy.toFixed(1)}
                              dy=".35em"
                              textAnchor="middle"
                              className="font-bold text-[10px] pointer-events-none"
                              fill="#ffffff"
                              style={{
                                paintOrder: 'stroke',
                                stroke: '#0b0f15',
                                strokeWidth: '2.5px',
                              }}
                            >
                              {getJumpTarget(
                                activePlayerIdx,
                                currentDie,
                                hm.n,
                                gameState,
                                trackArray,
                                options
                              )
                                ? '★'
                                : getPassTarget(
                                    activePlayerIdx,
                                    hm.n,
                                    gameState,
                                    trackArray,
                                    options
                                  )
                                ? '➜'
                                : ''}
                              {isSelected ? '✓' : hm.c}
                            </text>
                          )}
                        </g>
                      )}

                      {/* Render Cars */}
                      {carsHere.map((q) =>
                        renderFormulaCar(
                          cx,
                          cy,
                          cell.angle,
                          q,
                          gameState.lead === q
                        )
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Checkered Start Line */}
          <g>
            <line
              x1={sectionGeo.finishLine.x1}
              y1={sectionGeo.finishLine.y1}
              x2={sectionGeo.finishLine.x2}
              y2={sectionGeo.finishLine.y2}
              stroke="#0f172a"
              strokeWidth="5"
            />
            <line
              x1={sectionGeo.finishLine.x1}
              y1={sectionGeo.finishLine.y1}
              x2={sectionGeo.finishLine.x2}
              y2={sectionGeo.finishLine.y2}
              stroke="#ffffff"
              strokeWidth="4"
              strokeDasharray="2.5 2.5"
            />
          </g>

          {/* Victory Banner */}
          {gameState.win !== null && (
            <g
              transform={`translate(${centerX.toFixed(1)}, ${(centerY + 34).toFixed(1)})`}
              className="select-none pointer-events-none animate-pulse"
            >
              <rect
                x="-110"
                y="-16"
                width="220"
                height="32"
                rx="16"
                fill="rgba(15, 23, 42, 0.95)"
                stroke="#fbbf24"
                strokeWidth="1.8"
                filter="drop-shadow(0 6px 16px rgba(245, 158, 11, 0.4))"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                className="font-black text-[12px] fill-amber-400 font-sans tracking-wide"
              >
                🏁 {gameState.win === 0 ? 'PLAYER 1' : options.bot === 'medium' ? 'AI BOT' : 'PLAYER 2'} WINS! 🏆
              </text>
            </g>
          )}
        </svg>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RECTILINEAR 9-SEGMENT TRACK RENDERING (Fallback)
  // -------------------------------------------------------------
  if (!trackGeo) return null;

  const pad = 12;
  const svgViewBox = `-${pad} -${pad} ${trackGeo.W + pad * 2} ${trackGeo.H + pad * 2}`;
  const centerX = trackGeo.xL + (trackGeo.xR - trackGeo.xL) / 2;
  const centerY = trackGeo.yT + (trackGeo.yB - trackGeo.yT) / 2;

  return (
    <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 select-none overflow-hidden touch-manipulation">
      <svg
        viewBox={svgViewBox}
        className="w-full h-full max-h-[46vh] sm:max-h-[50vh] drop-shadow-2xl"
        style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))' }}
      >
        <defs>
          <pattern
            id="curbRedWhite"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="8" fill="#ef4444" />
            <rect x="4" width="4" height="8" fill="#ffffff" />
          </pattern>

          <pattern
            id="cornerCostHatch"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="7" height="7" fill="#1b2028" />
            <rect width="3.5" height="7" fill="#dc2626" opacity="0.65" />
          </pattern>

          <radialGradient id="circuitBackdrop" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#141a22" />
            <stop offset="100%" stopColor="#0b0f15" />
          </radialGradient>
        </defs>

        <rect
          x={trackGeo.xL - 8}
          y={trackGeo.yT - 8}
          width={trackGeo.xR - trackGeo.xL + 16}
          height={trackGeo.yB - trackGeo.yT + 16}
          rx={24}
          fill="url(#circuitBackdrop)"
          stroke="#1e293b"
          strokeWidth="1.5"
        />

        <g
          transform={`translate(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`}
          onClick={onOpenTrackSelector}
          className="cursor-pointer group"
        >
          <rect
            x="-80"
            y="-22"
            width="160"
            height="44"
            rx="22"
            fill="rgba(15, 23, 42, 0.75)"
            stroke="rgba(245, 158, 11, 0.3)"
            strokeWidth="1"
            className="group-hover:stroke-amber-400 group-hover:fill-slate-900 transition-all"
          />
          <text
            x="0"
            y="-4"
            textAnchor="middle"
            className="font-extrabold tracking-wider text-[11px] uppercase select-none font-sans fill-stone-100 group-hover:fill-amber-300 transition-colors"
          >
            {track.name}
          </text>
          <text
            x="0"
            y="11"
            textAnchor="middle"
            className="font-mono text-[8px] tracking-wider select-none uppercase fill-amber-400 font-semibold group-hover:underline"
          >
            ↺ {track.country} · {NC} SPACES
          </text>
        </g>

        {trackGeo.cells.map((cell, idx) => {
          const t = cell.t;
          const mid = (cell.t1 + cell.t2) / 2;
          const isCorner = t === 'C';
          const isBottleneck = t === 'S';

          const lanes: [number, number, number, number][] =
            isBottleneck
              ? [[0, -LANE_WIDTH, LANE_WIDTH, 0]]
              : [
                  [0, 0, LANE_WIDTH, LANE_WIDTH / 2],
                  [1, -LANE_WIDTH, 0, -LANE_WIDTH / 2],
                ];

          const headingAngle = tangentAngle(cell.g, mid);

          const outerKerbPts = isCorner
            ? computePolygonPoints(
                cell.g,
                cell.t1,
                cell.t2,
                -LANE_WIDTH,
                -LANE_WIDTH - 6
              )
            : null;

          return (
            <g key={`cell-${idx}`}>
              {outerKerbPts && (
                <polygon
                  points={outerKerbPts}
                  fill="url(#curbRedWhite)"
                  stroke="#b91c1c"
                  strokeWidth="0.5"
                />
              )}

              {lanes.map(([lane, o1, o2, oc]) => {
                const pts = computePolygonPoints(cell.g, cell.t1, cell.t2, o1, o2);
                const lookupKey = `${idx}:${lane}`;
                const hm = reachMapLookup[lookupKey];
                const isSelected =
                  selectedTarget &&
                  selectedTarget.pos === hm?.n &&
                  selectedTarget.lane === lane;

                const [cx, cy] = at(cell.g, mid, oc);

                const carsHere = gameState.P.map((p, q) =>
                  p.pos % NC === idx && (isBottleneck || p.lane === lane) ? q : -1
                ).filter((q) => q >= 0);

                const isOutsideCorner = isCorner && lane === 1;

                return (
                  <g key={`seg-${idx}-${lane}`}>
                    <polygon
                      points={pts}
                      fill={
                        isOutsideCorner
                          ? 'url(#cornerCostHatch)'
                          : isBottleneck
                          ? '#3f2f21'
                          : '#1a1f28'
                      }
                      stroke={isBottleneck ? '#854d0e' : '#334155'}
                      strokeWidth={isBottleneck ? 1.2 : 0.7}
                    />

                    {!isBottleneck && lane === 0 && (
                      <line
                        x1={at(cell.g, cell.t1, 0)[0].toFixed(1)}
                        y1={at(cell.g, cell.t1, 0)[1].toFixed(1)}
                        x2={at(cell.g, cell.t2, 0)[0].toFixed(1)}
                        y2={at(cell.g, cell.t2, 0)[1].toFixed(1)}
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        strokeDasharray="4 3"
                        opacity={0.4}
                      />
                    )}

                    {editorMode && !isCorner && idx > 0 && lane === 0 && (
                      <polygon
                        points={computePolygonPoints(
                          cell.g,
                          cell.t1,
                          cell.t2,
                          -LANE_WIDTH,
                          LANE_WIDTH
                        )}
                        onClick={() => onToggleCellEditor?.(idx)}
                        fill="rgba(245, 158, 11, 0.18)"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="3 2"
                        className="cursor-pointer hover:fill-amber-400/35 transition-colors"
                      />
                    )}

                    {hm && (
                      <g
                        onClick={() => onSelectTarget(hm.n, lane)}
                        className="cursor-pointer group"
                      >
                        <polygon
                          points={pts}
                          fill={
                            isSelected
                              ? 'rgba(234, 179, 8, 0.55)'
                              : 'rgba(255, 255, 255, 0.32)'
                          }
                          stroke={isSelected ? '#fbbf24' : '#ffffff'}
                          strokeWidth={isSelected ? 2.5 : 1.4}
                          strokeDasharray={isSelected ? undefined : '4 2'}
                          className="transition-all hover:fill-amber-300/40"
                        />
                        {carsHere.length === 0 && (
                          <text
                            x={cx.toFixed(1)}
                            y={cy.toFixed(1)}
                            dy=".35em"
                            textAnchor="middle"
                            className="font-bold text-[10px] pointer-events-none"
                            fill="#ffffff"
                            style={{
                              paintOrder: 'stroke',
                              stroke: '#0b0f15',
                              strokeWidth: '2.5px',
                            }}
                          >
                            {getJumpTarget(
                              activePlayerIdx,
                              currentDie,
                              hm.n,
                              gameState,
                              trackArray,
                              options
                            )
                              ? '★'
                              : getPassTarget(
                                  activePlayerIdx,
                                  hm.n,
                                  gameState,
                                  trackArray,
                                  options
                                )
                              ? '➜'
                              : ''}
                            {isSelected ? '✓' : hm.c}
                          </text>
                        )}
                      </g>
                    )}

                    {carsHere.map((q) =>
                      renderFormulaCar(
                        cx,
                        cy,
                        headingAngle,
                        q,
                        gameState.lead === q
                      )
                    )}
                  </g>
                );
              })}

              {(idx % 5 === 0 || idx === NC - 1) && (
                <text
                  x={at(cell.g, mid, LANE_WIDTH + 8)[0].toFixed(1)}
                  y={at(cell.g, mid, LANE_WIDTH + 8)[1].toFixed(1)}
                  dy=".35em"
                  textAnchor="middle"
                  className="font-mono text-[7.5px] select-none pointer-events-none font-bold"
                  fill="#64748b"
                  opacity={0.8}
                >
                  {idx === 0 ? 'START' : idx}
                </text>
              )}
            </g>
          );
        })}

        <g key="start-finish-gantry">
          <line
            x1={trackGeo.xs}
            y1={trackGeo.yB - LANE_WIDTH}
            x2={trackGeo.xs}
            y2={trackGeo.yB + LANE_WIDTH}
            stroke="#0f172a"
            strokeWidth="5"
          />
          <line
            x1={trackGeo.xs}
            y1={trackGeo.yB - LANE_WIDTH}
            x2={trackGeo.xs}
            y2={trackGeo.yB + LANE_WIDTH}
            stroke="#ffffff"
            strokeWidth="4"
            strokeDasharray="2.5 2.5"
          />
          <text
            x={trackGeo.xs}
            y={trackGeo.yB - LANE_WIDTH - 6}
            textAnchor="middle"
            className="font-mono text-[7px] font-extrabold fill-amber-400 select-none pointer-events-none tracking-widest uppercase"
            style={{ paintOrder: 'stroke', stroke: '#0b0f15', strokeWidth: '2px' }}
          >
            FINISH 🏁 START
          </text>
        </g>

        {gameState.win !== null && (
          <g
            transform={`translate(${centerX.toFixed(1)}, ${(centerY + 34).toFixed(1)})`}
            className="select-none pointer-events-none animate-pulse"
          >
            <rect
              x="-110"
              y="-16"
              width="220"
              height="32"
              rx="16"
              fill="rgba(15, 23, 42, 0.95)"
              stroke="#fbbf24"
              strokeWidth="1.8"
              filter="drop-shadow(0 6px 16px rgba(245, 158, 11, 0.4))"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              className="font-black text-[12px] fill-amber-400 font-sans tracking-wide"
            >
              🏁 {gameState.win === 0 ? 'PLAYER 1' : options.bot === 'medium' ? 'AI BOT' : 'PLAYER 2'} WINS! 🏆
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
