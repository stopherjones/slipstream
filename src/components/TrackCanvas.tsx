import React from 'react';
import { GameOptions, GameState, ReachMap, TargetSelection } from '../types/game';
import { at, computePolygonPoints, computeTrackGeometry, LANE_WIDTH } from '../game/geometry';
import { getJumpTarget, getPassTarget } from '../game/engine';

interface TrackCanvasProps {
  segments: string[];
  gameState: GameState;
  options: GameOptions;
  reach: ReachMap | null;
  selectedTarget: TargetSelection['tgt'];
  editorMode: boolean;
  onSelectTarget: (pos: number, lane: number) => void;
  onToggleCellEditor?: (index: number) => void;
}

export const TrackCanvas: React.FC<TrackCanvasProps> = ({
  segments,
  gameState,
  options,
  reach,
  selectedTarget,
  editorMode,
  onSelectTarget,
  onToggleCellEditor,
}) => {
  const geo = React.useMemo(() => computeTrackGeometry(segments), [segments]);
  const trackArray = React.useMemo(() => segments.join('').split(''), [segments]);
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

  // Map reach keys to track cell index
  const reachMapLookup = React.useMemo(() => {
    if (!reach) return {};
    const map: Record<string, { n: number; c: number }> = {};
    for (const k in reach) {
      const [n, l] = k.split(':').map(Number);
      map[`${n % NC}:${l}`] = { n, c: reach[k] };
    }
    return map;
  }, [reach, NC]);

  // Checkerboard finish line
  const finishLineTiles = React.useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let r = 0; r < 12; r++) {
      for (let q = 0; q < 2; q++) {
        tiles.push(
          <rect
            key={`ck-${r}-${q}`}
            x={geo.xs - 4 + q * 4}
            y={geo.yB - LANE_WIDTH + r * 4}
            width={4}
            height={4}
            fill={(r + q) % 2 ? '#0f172a' : '#f8fafc'}
          />
        );
      }
    }
    return tiles;
  }, [geo.xs, geo.yB]);

  return (
    <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 select-none overflow-hidden touch-manipulation">
      <svg
        viewBox={`0 0 ${geo.W} ${geo.H}`}
        className="w-full h-full max-h-[46vh] sm:max-h-[50vh] drop-shadow-xl"
        style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
      >
        <defs>
          {/* Corner Curbs / Hatching for high cost outside corners */}
          <pattern
            id="hatchPattern"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="#334155" />
            <rect width="4" height="8" fill="#dc2626" opacity="0.85" />
          </pattern>

          {/* Kerb red-white stripes */}
          <pattern id="kerbPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="5" height="10" fill="#ef4444" />
            <rect x="5" width="5" height="10" fill="#ffffff" />
          </pattern>

          {/* Gradients */}
          <radialGradient id="infieldGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a1e" />
            <stop offset="100%" stopColor="#142614" />
          </radialGradient>

          <filter id="carGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Grass Terrain Base */}
        <rect
          width={geo.W}
          height={geo.H}
          rx={20}
          fill="url(#infieldGrad)"
          stroke="#2d502d"
          strokeWidth="3"
        />

        {/* Inner track infield grass boundary */}
        <rect
          x={geo.xL + LANE_WIDTH}
          y={geo.yT + LANE_WIDTH}
          width={Math.max(10, geo.xR - geo.xL - 2 * LANE_WIDTH)}
          height={Math.max(10, geo.yB - geo.yT - 2 * LANE_WIDTH)}
          rx={14}
          fill="#122412"
          opacity="0.9"
        />

        {/* Center Track Emblem */}
        <text
          x={(geo.xL + geo.xR) / 2}
          y={(geo.yT + geo.H - geo.yT) / 2 - 4}
          textAnchor="middle"
          className="font-extrabold tracking-widest text-[16px] uppercase select-none"
          fill="#ffffff"
          opacity="0.18"
        >
          SLIPSTREAM
        </text>
        <text
          x={(geo.xL + geo.xR) / 2}
          y={(geo.yT + geo.H - geo.yT) / 2 + 15}
          textAnchor="middle"
          className="font-medium tracking-wider text-[11px] select-none"
          fill="#cbd5e1"
          opacity="0.25"
        >
          ↺ {NC} SPACES {options.laps > 1 ? `· ${options.laps} LAPS` : ''}
        </text>

        {/* Track Cells & Lanes */}
        {geo.cells.map((cell, idx) => {
          const t = cell.t;
          const mid = (cell.t1 + cell.t2) / 2;
          const lanes: [number, number, number, number][] =
            t === 'S'
              ? [[0, -LANE_WIDTH, LANE_WIDTH, 0]]
              : [
                  [0, 0, LANE_WIDTH, LANE_WIDTH / 2], // Inside lane (cheaper)
                  [1, -LANE_WIDTH, 0, -LANE_WIDTH / 2], // Outside lane
                ];

          return (
            <g key={`cell-${idx}`}>
              {lanes.map(([lane, o1, o2, oc]) => {
                const pts = computePolygonPoints(cell.g, cell.t1, cell.t2, o1, o2);
                const lookupKey = `${idx}:${lane}`;
                const hm = reachMapLookup[lookupKey];
                const isReachable = !!hm;
                const isSelected =
                  selectedTarget &&
                  selectedTarget.pos === hm?.n &&
                  selectedTarget.lane === lane;

                const [cx, cy] = at(cell.g, mid, oc);

                // Check if any player is at this position and lane
                const carsHere = gameState.P.map((p, q) =>
                  p.pos % NC === idx && (t === 'S' || p.lane === lane) ? q : -1
                ).filter((q) => q >= 0);

                const isCornerOutside = t === 'C' && lane === 1;

                return (
                  <g key={`seg-${idx}-${lane}`}>
                    {/* Asphalt cell polygon */}
                    <polygon
                      points={pts}
                      fill={
                        isCornerOutside
                          ? 'url(#hatchPattern)'
                          : t === 'S'
                          ? '#574134' // Bottleneck single lane asphalt
                          : '#334155' // Standard asphalt
                      }
                      stroke={t === 'S' ? '#8d6d53' : '#475569'}
                      strokeWidth={0.8}
                    />

                    {/* Editor toggle overlay */}
                    {editorMode && t !== 'C' && idx > 0 && lane === 0 && (
                      <polygon
                        points={computePolygonPoints(cell.g, cell.t1, cell.t2, -LANE_WIDTH, LANE_WIDTH)}
                        onClick={() => onToggleCellEditor?.(idx)}
                        fill="rgba(255, 255, 255, 0.18)"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        className="cursor-pointer hover:fill-amber-400/30 transition-colors"
                      />
                    )}

                    {/* Interactive target space button */}
                    {isReachable && (
                      <g
                        onClick={() => onSelectTarget(hm.n, lane)}
                        className="cursor-pointer group"
                      >
                        <polygon
                          points={pts}
                          fill={
                            isSelected
                              ? 'rgba(234, 179, 8, 0.55)'
                              : 'rgba(255, 255, 255, 0.35)'
                          }
                          stroke={isSelected ? '#fbbf24' : '#ffffff'}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          strokeDasharray={isSelected ? undefined : '4 2'}
                          className="transition-all hover:fill-amber-300/40"
                        />
                        {/* Target label / pip cost */}
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
                              stroke: '#0f172a',
                              strokeWidth: '2.5px',
                            }}
                          >
                            {getJumpTarget(activePlayerIdx, currentDie, hm.n, gameState, trackArray, options)
                              ? '★'
                              : getPassTarget(activePlayerIdx, hm.n, gameState, trackArray, options)
                              ? '➜'
                              : ''}
                            {isSelected ? '✓' : hm.c}
                          </text>
                        )}
                      </g>
                    )}

                    {/* Cars rendered here */}
                    {carsHere.map((playerIdx) => {
                      const isLeader = gameState.lead === playerIdx;
                      const isP1 = playerIdx === 0;
                      const carColor = isP1 ? '#2563eb' : '#ea580c';
                      const carBorder = isP1 ? '#60a5fa' : '#fb923c';

                      return (
                        <g
                          key={`car-${playerIdx}`}
                          className="pointer-events-none transition-transform duration-300"
                          filter="url(#carGlow)"
                        >
                          <circle
                            cx={cx.toFixed(1)}
                            cy={cy.toFixed(1)}
                            r={9}
                            fill={carColor}
                            stroke={carBorder}
                            strokeWidth={2}
                          />
                          <text
                            x={cx.toFixed(1)}
                            y={cy.toFixed(1)}
                            dy=".35em"
                            textAnchor="middle"
                            className="font-extrabold text-[10px]"
                            fill="#ffffff"
                          >
                            {playerIdx + 1}
                          </text>
                          {/* Crown for leader */}
                          {isLeader && (
                            <polygon
                              points={`${cx},${cy - 12} ${cx - 3.5},${cy - 8} ${cx + 3.5},${cy - 8}`}
                              fill="#facc15"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Space number tick markers */}
              {(idx % 5 === 0 || idx === NC - 1) && (
                <g className="pointer-events-none select-none">
                  {(() => {
                    const [nx, ny] = at(cell.g, mid, LANE_WIDTH + 10);
                    return (
                      <text
                        x={nx.toFixed(1)}
                        y={ny.toFixed(1)}
                        dy=".35em"
                        textAnchor="middle"
                        className="font-mono font-medium text-[8px]"
                        fill="#94a3b8"
                        opacity={0.8}
                      >
                        {idx === 0 ? 'START' : idx}
                      </text>
                    );
                  })()}
                </g>
              )}
            </g>
          );
        })}

        {/* Start / Finish line chequers */}
        {finishLineTiles}
      </svg>
    </div>
  );
};
