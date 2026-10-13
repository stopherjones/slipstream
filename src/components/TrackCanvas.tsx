import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
import { CarToken } from './CarToken';
import { Maximize2, ZoomIn, ZoomOut, Target } from 'lucide-react';

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
  editorMode: _editorMode,
  onSelectTarget,
  onToggleCellEditor: _onToggleCellEditor,
  onOpenTrackSelector,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------
  // VIEWPORT ZOOM & PAN STATE
  // -------------------------------------------------------------
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [focusMode, setFocusMode] = useState<'all' | 'p1' | 'p2' | 'custom'>('all');

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const touchStartRef = useRef<{
    dist: number;
    pan: { x: number; y: number };
    zoom: number;
    mid: { x: number; y: number };
  } | null>(null);

  const isSectionTrack = Boolean(track.sections && track.sections.length > 0);

  // Reset zoom & pan when track switches
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFocusMode('all');
  }, [track.id]);

  // Compute section geometry if track has sections
  const sectionGeo = useMemo(() => {
    if (!isSectionTrack) return null;
    try {
      return computeSectionTrackGeometry(track.sections!, { forceFuzzyClose: true });
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

  // Centers of viewport in track coordinates
  const centerX = useMemo(() => {
    if (sectionGeo) return (sectionGeo.minX + sectionGeo.maxX) / 2;
    if (trackGeo) return trackGeo.xL + (trackGeo.xR - trackGeo.xL) / 2;
    return 0;
  }, [sectionGeo, trackGeo]);

  const centerY = useMemo(() => {
    if (sectionGeo) return (sectionGeo.minY + sectionGeo.maxY) / 2;
    if (trackGeo) return trackGeo.yT + (trackGeo.yB - trackGeo.yT) / 2;
    return 0;
  }, [sectionGeo, trackGeo]);

  const viewBoxWidth = useMemo(() => {
    if (sectionGeo) return sectionGeo.width + 48;
    if (trackGeo) return trackGeo.W + 24;
    return 300;
  }, [sectionGeo, trackGeo]);

  // Helper to get coordinates and angle for any arbitrary space
  const getSpaceCoordsAndAngle = useCallback(
    (pos: number, lane: number): { x: number; y: number; angle: number } => {
      const cellIdx = ((pos % NC) + NC) % NC;
      if (sectionGeo) {
        const cell = sectionGeo.cells[cellIdx];
        if (cell) {
          const pt = lane === 0 ? cell.center0 : cell.center1;
          return { x: pt[0], y: pt[1], angle: cell.angle };
        }
      }
      if (trackGeo) {
        const cell = trackGeo.cells[cellIdx];
        if (cell) {
          const mid = (cell.t1 + cell.t2) / 2;
          const pt = at(cell.g, mid, lane === 0 ? -LANE_WIDTH / 2 : LANE_WIDTH / 2);
          const ang = tangentAngle(cell.g, mid);
          return { x: pt[0], y: pt[1], angle: ang };
        }
      }
      return { x: 0, y: 0, angle: 0 };
    },
    [NC, sectionGeo, trackGeo]
  );

  // Animated Car Rendering State: smooth movement along the track
  const [displayCars, setDisplayCars] = useState<[
    { x: number; y: number; angle: number },
    { x: number; y: number; angle: number }
  ]>(() => [
    getSpaceCoordsAndAngle(gameState.P[0].pos, gameState.P[0].lane),
    getSpaceCoordsAndAngle(gameState.P[1].pos, gameState.P[1].lane),
  ]);

  const prevCarsRef = useRef<[
    { pos: number; lane: number },
    { pos: number; lane: number }
  ]>([
    { pos: gameState.P[0].pos, lane: gameState.P[0].lane },
    { pos: gameState.P[1].pos, lane: gameState.P[1].lane },
  ]);

  const animFrameRef = useRef<number | null>(null);

  // Smoothly animate car movement along the track waypoints when positions update
  useEffect(() => {
    const p0 = gameState.P[0];
    const p1 = gameState.P[1];
    const prev0 = prevCarsRef.current[0];
    const prev1 = prevCarsRef.current[1];

    const p0Changed = p0.pos !== prev0.pos || p0.lane !== prev0.lane;
    const p1Changed = p1.pos !== prev1.pos || p1.lane !== prev1.lane;

    if (!p0Changed && !p1Changed) return;

    // Helper: build waypoint sequence from start to destination space
    const buildWaypoints = (
      fromPos: number,
      fromLane: number,
      toPos: number,
      toLane: number
    ) => {
      // If moved backwards or reset to 0 (new race or big warp): snap directly
      if (toPos < fromPos || toPos - fromPos > 30) {
        return [getSpaceCoordsAndAngle(toPos, toLane)];
      }
      const wps: { x: number; y: number; angle: number }[] = [];
      for (let s = fromPos; s <= toPos; s++) {
        const curLane = s === fromPos ? fromLane : toLane;
        wps.push(getSpaceCoordsAndAngle(s, curLane));
      }
      return wps;
    };

    const wps0 = p0Changed ? buildWaypoints(prev0.pos, prev0.lane, p0.pos, p0.lane) : [];
    const wps1 = p1Changed ? buildWaypoints(prev1.pos, prev1.lane, p1.pos, p1.lane) : [];

    prevCarsRef.current = [
      { pos: p0.pos, lane: p0.lane },
      { pos: p1.pos, lane: p1.lane },
    ];

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const maxWpLen = Math.max(wps0.length, wps1.length);
    const duration = Math.min(850, Math.max(240, (maxWpLen - 1) * 85));
    const startTime = performance.now();

    const sampleWaypoint = (
      wps: { x: number; y: number; angle: number }[],
      progress: number,
      fallback: { x: number; y: number; angle: number }
    ) => {
      if (wps.length === 0) return fallback;
      if (wps.length === 1) return wps[0];
      const totalSegs = wps.length - 1;
      const exact = progress * totalSegs;
      const idx = Math.min(totalSegs - 1, Math.floor(exact));
      const frac = exact - idx;
      const a = wps[idx];
      const b = wps[idx + 1];
      const x = a.x + (b.x - a.x) * frac;
      const y = a.y + (b.y - a.y) * frac;
      let dAng = ((b.angle - a.angle + 540) % 360) - 180;
      const angle = a.angle + dAng * frac;
      return { x, y, angle };
    };

    const animateCars = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayCars((prev) => [
        p0Changed
          ? sampleWaypoint(wps0, eased, getSpaceCoordsAndAngle(p0.pos, p0.lane))
          : prev[0],
        p1Changed
          ? sampleWaypoint(wps1, eased, getSpaceCoordsAndAngle(p1.pos, p1.lane))
          : prev[1],
      ]);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateCars);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateCars);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    gameState.P[0].pos,
    gameState.P[0].lane,
    gameState.P[1].pos,
    gameState.P[1].lane,
    getSpaceCoordsAndAngle,
  ]);

  // Helper: get world coordinates of player's car
  const getCarCoords = useCallback((playerIdx: number): [number, number] | null => {
    if (displayCars && displayCars[playerIdx]) {
      return [displayCars[playerIdx].x, displayCars[playerIdx].y];
    }
    const p = gameState.P[playerIdx];
    if (!p) return null;
    const coords = getSpaceCoordsAndAngle(p.pos, p.lane);
    return [coords.x, coords.y];
  }, [displayCars, gameState.P, getSpaceCoordsAndAngle]);

  // Auto-follow car if currently snapped to P1 or P2
  useEffect(() => {
    if (focusMode === 'p1') {
      const coords = getCarCoords(0);
      if (coords) {
        setPan({
          x: (centerX - coords[0]) * zoom,
          y: (centerY - coords[1]) * zoom,
        });
      }
    } else if (focusMode === 'p2') {
      const coords = getCarCoords(1);
      if (coords) {
        setPan({
          x: (centerX - coords[0]) * zoom,
          y: (centerY - coords[1]) * zoom,
        });
      }
    }
  }, [
    displayCars,
    focusMode,
    zoom,
    centerX,
    centerY,
    getCarCoords,
  ]);

  // Zoom / Snap Action Handlers
  const handleFitTrack = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFocusMode('all');
  }, []);

  const handleSnapToCar = useCallback((playerIdx: 0 | 1) => {
    const coords = getCarCoords(playerIdx);
    if (!coords) return;
    const targetZoom = 2.4;
    setZoom(targetZoom);
    setPan({
      x: (centerX - coords[0]) * targetZoom,
      y: (centerY - coords[1]) * targetZoom,
    });
    setFocusMode(playerIdx === 0 ? 'p1' : 'p2');
  }, [getCarCoords, centerX, centerY]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(Number((z * 1.25).toFixed(2)), 4.0));
    setFocusMode('custom');
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(Number((z * 0.8).toFixed(2)), 0.6));
    setFocusMode('custom');
  }, []);

  // -------------------------------------------------------------
  // GESTURE HANDLERS (WHEEL, TOUCH PINCH, POINTER DRAG)
  // -------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * factor, 0.6), 4.0);
        return Number(nextZoom.toFixed(2));
      });
      setFocusMode('custom');
    };

    container.addEventListener('wheel', onWheelHandler, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelHandler);
    };
  }, []);

  // Pointer drag to pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 5) {
      isDraggingRef.current = true;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const scaleRatio = viewBoxWidth / rect.width;
        setPan({
          x: dragStartRef.current.panX + dx * scaleRatio,
          y: dragStartRef.current.panY + dy * scaleRatio,
        });
        setFocusMode('custom');
      }
    }
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 60);
  };

  // Touch pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const mid = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      touchStartRef.current = { dist, pan: { ...pan }, zoom, mid };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = newDist / touchStartRef.current.dist;
      const newZoom = Math.min(Math.max(touchStartRef.current.zoom * factor, 0.6), 4.0);
      setZoom(Number(newZoom.toFixed(2)));

      const newMid = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      const dx = newMid.x - touchStartRef.current.mid.x;
      const dy = newMid.y - touchStartRef.current.mid.y;

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const scaleRatio = viewBoxWidth / rect.width;
        setPan({
          x: touchStartRef.current.pan.x + dx * scaleRatio,
          y: touchStartRef.current.pan.y + dy * scaleRatio,
        });
      }
      setFocusMode('custom');
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Safe selection handler that ignores drag operations
  const handleSafeSelect = (targetPos: number, targetLane: number) => {
    if (isDraggingRef.current) return;
    onSelectTarget(targetPos, targetLane);
  };

  // Shared Toolbar Controls
  const renderZoomToolbar = () => (
    <div
      className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30 flex items-center gap-1 sm:gap-1.5 bg-stone-900/90 backdrop-blur-md border border-stone-700/80 rounded-full px-2 py-1 shadow-2xl select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Fit Track Button */}
      <button
        type="button"
        onClick={handleFitTrack}
        title="Fill viewport with entire track (100%)"
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
          focusMode === 'all' && zoom === 1
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
            : 'text-stone-300 hover:text-white hover:bg-stone-800'
        }`}
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Fit</span>
      </button>

      {/* Snap to Car 1 (Blue Hatchback) */}
      <button
        type="button"
        onClick={() => handleSnapToCar(0)}
        title="Snap to Player 1 (Blue Hatchback)"
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
          focusMode === 'p1'
            ? 'bg-blue-600/30 text-blue-300 border border-blue-400 shadow-sm shadow-blue-500/20'
            : 'text-stone-300 hover:text-blue-300 hover:bg-stone-800'
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm ring-1 ring-blue-300" />
        <span className="hidden sm:inline">P1</span>
      </button>

      {/* Snap to Car 2 (Red Saloon) */}
      <button
        type="button"
        onClick={() => handleSnapToCar(1)}
        title={`Snap to ${options.bot === 'medium' ? 'AI Bot' : 'Player 2'} (Red Saloon)`}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
          focusMode === 'p2'
            ? 'bg-rose-600/30 text-rose-300 border border-rose-400 shadow-sm shadow-rose-500/20'
            : 'text-stone-300 hover:text-rose-300 hover:bg-stone-800'
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-sm ring-1 ring-rose-300" />
        <span className="hidden sm:inline">{options.bot === 'medium' ? 'Bot' : 'P2'}</span>
      </button>

      {/* Vertical separator */}
      <div className="w-[1px] h-3.5 bg-stone-700 mx-0.5" />

      {/* Zoom Out Button */}
      <button
        type="button"
        onClick={handleZoomOut}
        title="Zoom Out (−)"
        className="p-1 rounded-full text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition-all"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      {/* Zoom Percent Badge */}
      <button
        type="button"
        onClick={handleFitTrack}
        title="Reset zoom to 100%"
        className="font-mono text-[10px] font-bold text-stone-400 hover:text-amber-300 px-1 py-0.5 rounded transition-colors"
      >
        {Math.round(zoom * 100)}%
      </button>

      {/* Zoom In Button */}
      <button
        type="button"
        onClick={handleZoomIn}
        title="Zoom In (+)"
        className="p-1 rounded-full text-stone-300 hover:text-white hover:bg-stone-800 active:scale-95 transition-all"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // -------------------------------------------------------------
  // 1. SECTION-BASED TRACK RENDERING
  // -------------------------------------------------------------
  if (sectionGeo) {
    return (
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full relative flex items-center justify-center p-1 sm:p-2 select-none overflow-hidden touch-none cursor-grab active:cursor-grabbing"
      >
        {renderZoomToolbar()}

        <svg
          viewBox={sectionGeo.viewBox}
          className="w-full h-full max-h-[48vh] sm:max-h-[52vh] drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))' }}
        >
          <defs>
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

          {/* Root Transform Group with Zoom & Pan */}
          <g
            transform={`translate(${(centerX + pan.x).toFixed(1)}, ${(centerY + pan.y).toFixed(1)}) scale(${zoom.toFixed(2)}) translate(${(-centerX).toFixed(1)}, ${(-centerY).toFixed(1)})`}
            className="transition-transform duration-100 ease-out"
          >
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
              const lanesList = isBottleneck ? [0] : [0, 1];

              return (
                <g key={`sec-cell-${cell.idx}`}>
                  {/* Apex Kerb with radial teeth pointing directly into the corner apex */}
                  {cell.kerbSegments && cell.kerbSegments.length > 0 ? (
                    <g key={`sec-kerb-${cell.idx}`}>
                      {cell.kerbSegments.map((seg, sIdx) => (
                        <polygon
                          key={`sec-kerb-${cell.idx}-${sIdx}`}
                          points={seg.poly}
                          fill={seg.color === 'red' ? '#dc2626' : '#ffffff'}
                          stroke="#991b1b"
                          strokeWidth="0.3"
                        />
                      ))}
                    </g>
                  ) : null}

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
                        {/* Road surface: standard asphalt on corners (no red striping) */}
                        <polygon
                          points={pts}
                          fill={isBottleneck ? '#3f2f21' : '#1a1f28'}
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

                        {/* Outside corner divider: splits outside curve into two distinct spaces */}
                        {isOutsideCorner && cell.cornerOutsideDivider && (
                          <line
                            x1={cell.cornerOutsideDivider.x1}
                            y1={cell.cornerOutsideDivider.y1}
                            x2={cell.cornerOutsideDivider.x2}
                            y2={cell.cornerOutsideDivider.y2}
                            stroke="#ffffff"
                            strokeWidth="1.2"
                            opacity={0.75}
                          />
                        )}

                        {/* Reach Target overlay highlight */}
                        {hm && (
                          <g
                            onClick={() => handleSafeSelect(hm.n, lane)}
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
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Animated Car SVGs Layer (Blue Hatchback for P1, Red Saloon for P2) */}
            <g key="sec-animated-cars-layer">
              {[0, 1].map((q) => (
                <CarToken
                  key={`sec-anim-car-p${q}`}
                  cx={displayCars[q].x}
                  cy={displayCars[q].y}
                  angle={displayCars[q].angle}
                  playerIdx={q}
                  isLeader={gameState.lead === q}
                />
              ))}
            </g>

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
          </g>
        </svg>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. RECTILINEAR 9-SEGMENT TRACK RENDERING (Fallback)
  // -------------------------------------------------------------
  if (!trackGeo) return null;

  const pad = 12;
  const svgViewBox = `-${pad} -${pad} ${trackGeo.W + pad * 2} ${trackGeo.H + pad * 2}`;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full h-full relative flex items-center justify-center p-1 sm:p-2 select-none overflow-hidden touch-none cursor-grab active:cursor-grabbing"
    >
      {renderZoomToolbar()}

      <svg
        viewBox={svgViewBox}
        className="w-full h-full max-h-[48vh] sm:max-h-[52vh] drop-shadow-2xl"
        style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))' }}
      >
        <defs>
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
        </defs>

        {/* Root Transform Group with Zoom & Pan */}
        <g
          transform={`translate(${(centerX + pan.x).toFixed(1)}, ${(centerY + pan.y).toFixed(1)}) scale(${zoom.toFixed(2)}) translate(${(-centerX).toFixed(1)}, ${(-centerY).toFixed(1)})`}
          className="transition-transform duration-100 ease-out"
        >
          {/* Base Infield */}
          <rect
            x={trackGeo.xL - 8}
            y={trackGeo.yT - 8}
            width={trackGeo.xR - trackGeo.xL + 16}
            height={trackGeo.yB - trackGeo.yT + 16}
            rx={20}
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Quick Track Switcher in Infield Center */}
          <g
            transform={`translate(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`}
            onClick={onOpenTrackSelector}
            className="cursor-pointer group"
          >
            <rect
              x="-75"
              y="-20"
              width="150"
              height="40"
              rx="20"
              fill="rgba(15, 23, 42, 0.7)"
              stroke="rgba(245, 158, 11, 0.3)"
              strokeWidth="1"
              className="group-hover:stroke-amber-400 group-hover:fill-slate-900 transition-all"
            />
            <text
              x="0"
              y="-3"
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

          {/* Track Cells */}
          {trackGeo.cells.map((cell, idx) => {
            const isBottleneck = cell.t === 'S';
            const isCorner = cell.t === 'C';
            const mid = (cell.t1 + cell.t2) / 2;
            const headingAngle = tangentAngle(cell.g, mid);

            const lanes: [number, number, number, number][] = isBottleneck
              ? [[0, -LANE_WIDTH, LANE_WIDTH, 0]]
              : [
                  [0, -LANE_WIDTH, 0, -LANE_WIDTH / 2],
                  [1, 0, LANE_WIDTH, LANE_WIDTH / 2],
                ];

            // Radial Kerb Teeth: each tooth points directly into the corner apex along normal
            const kerbTeeth = isCorner ? (() => {
              const steps = 6;
              const teeth: { poly: string; color: 'red' | 'white' }[] = [];
              for (let s = 0; s < steps; s++) {
                const ta = cell.t1 + (s / steps) * (cell.t2 - cell.t1);
                const tb = cell.t1 + ((s + 1) / steps) * (cell.t2 - cell.t1);
                const p1 = at(cell.g, ta, -LANE_WIDTH);
                const p2 = at(cell.g, tb, -LANE_WIDTH);
                const p3 = at(cell.g, tb, -LANE_WIDTH - 5.5);
                const p4 = at(cell.g, ta, -LANE_WIDTH - 5.5);
                teeth.push({
                  poly: `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} ${p3[0].toFixed(1)},${p3[1].toFixed(1)} ${p4[0].toFixed(1)},${p4[1].toFixed(1)}`,
                  color: (idx * steps + s) % 2 === 0 ? 'red' : 'white',
                });
              }
              return teeth;
            })() : null;

            return (
              <g key={`cell-${idx}`}>
                {/* Radial teeth pointing into the corner apex */}
                {kerbTeeth && (
                  <g key={`rect-kerb-${idx}`}>
                    {kerbTeeth.map((t, sIdx) => (
                      <polygon
                        key={`rect-kerb-tooth-${idx}-${sIdx}`}
                        points={t.poly}
                        fill={t.color === 'red' ? '#dc2626' : '#ffffff'}
                        stroke="#991b1b"
                        strokeWidth="0.3"
                      />
                    ))}
                  </g>
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
                      {/* Road surface: standard asphalt on corners (no red striping) */}
                      <polygon
                        points={pts}
                        fill={isBottleneck ? '#3f2f21' : '#1a1f28'}
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

                      {/* Outside corner divider: splits outside curve into two distinct spaces */}
                      {isOutsideCorner && (
                        <line
                          x1={at(cell.g, mid, 0)[0].toFixed(1)}
                          y1={at(cell.g, mid, 0)[1].toFixed(1)}
                          x2={at(cell.g, mid, LANE_WIDTH)[0].toFixed(1)}
                          y2={at(cell.g, mid, LANE_WIDTH)[1].toFixed(1)}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          opacity={0.75}
                        />
                      )}

                      {/* Reach Target overlay highlight */}
                      {hm && (
                        <g
                          onClick={() => handleSafeSelect(hm.n, lane)}
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

          {/* Animated Car SVGs Layer for Rectilinear Track */}
          <g key="rect-animated-cars-layer">
            {[0, 1].map((q) => (
              <CarToken
                key={`rect-anim-car-p${q}`}
                cx={displayCars[q].x}
                cy={displayCars[q].y}
                angle={displayCars[q].angle}
                playerIdx={q}
                isLeader={gameState.lead === q}
              />
            ))}
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
        </g>
      </svg>
    </div>
  );
};
