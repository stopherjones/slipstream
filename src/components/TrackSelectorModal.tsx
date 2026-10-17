import React from 'react';
import { TrackDefinition } from '../types/game';
import {
  loadSavedCustomTracks,
  parseTrackCode,
  parseSectionTrackCode,
  TRACK_PRESETS,
} from '../game/tracks';
import {
  computePolygonPoints,
  computeTrackGeometry,
  LANE_WIDTH,
} from '../game/geometry';
import { computeSectionTrackGeometry } from '../game/sectionGeometry';
import { getTrackTheme } from '../game/trackThemes';
import { sound } from '../game/audio';
import { X, Trophy, Flag, Check, Compass, Sliders, Layers } from 'lucide-react';

interface TrackSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCircuitId: string;
  onSelectCircuit: (circuit: TrackDefinition) => void;
  onOpenEditor?: () => void;
}

export const TrackSelectorModal: React.FC<TrackSelectorModalProps> = ({
  isOpen,
  onClose,
  currentCircuitId,
  onSelectCircuit,
  onOpenEditor,
}) => {
  if (!isOpen) return null;

  const customTracks = loadSavedCustomTracks();

  // Combined list of tracks
  const allCircuits: TrackDefinition[] = [
    ...TRACK_PRESETS,
    ...customTracks.map((tr) => ({
      id: tr.id ?? tr.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      name: tr.name,
      country: tr.country || 'Custom 🏁',
      description: tr.description || 'Custom crafted circuit.',
      difficulty: (tr.difficulty ?? 'Intermediate') as 'Beginner' | 'Intermediate' | 'Pro',
      lapsDefault: tr.lapsDefault ?? 2,
      sections: tr.sections ?? (tr.code ? parseSectionTrackCode(tr.code) ?? undefined : undefined),
      segments: tr.segments ?? (tr.code ? parseTrackCode(tr.code) : null) ?? TRACK_PRESETS[0].segments,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0 bg-stone-950/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Select Circuit
              </h2>
              <p className="text-[11px] text-stone-400">
                Varied racing circuits with straights, bottlenecks & 90° corners
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close track selector"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Launch Architect Bar */}
        <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800/80 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-stone-300 font-medium">
            Want to build your own track?
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenEditor?.();
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Open Track Architect</span>
          </button>
        </div>

        {/* Circuit Cards List */}
        <div className="p-3 overflow-y-auto space-y-3 flex-1 overscroll-contain">
          {allCircuits.map((circuit) => {
            const isSelected = circuit.id === currentCircuitId || circuit.name === currentCircuitId;
            const isSectionTrack = Boolean(circuit.sections && circuit.sections.length > 0);
            
            let rectGeo = null;
            let secGeo = null;
            if (isSectionTrack) {
              try {
                secGeo = computeSectionTrackGeometry(circuit.sections!, { forceFuzzyClose: true });
              } catch {
                // fallback
              }
            } else {
              try {
                rectGeo = computeTrackGeometry(circuit.segments);
              } catch {
                // fallback
              }
            }

            const totalSpaces = isSectionTrack
              ? circuit.sections!.length
              : circuit.segments.join('').length;
            const cornerCount = isSectionTrack
              ? circuit.sections!.filter((s) => s === 'L' || s === 'R' || s === 'SL' || s === 'SR').length
              : circuit.segments.join('').split('').filter((c) => c === 'C').length;
            const bottleneckCount = isSectionTrack
              ? circuit.sections!.filter((s) => s === 'S' || s === 'SL' || s === 'SR').length
              : circuit.segments.join('').split('').filter((c) => c === 'S').length;

            const circuitTheme = getTrackTheme(circuit.id);

            return (
              <div
                key={circuit.id}
                onClick={() => {
                  sound.playSelect();
                  onSelectCircuit(circuit);
                  onClose();
                }}
                className={`relative group rounded-xl p-3 border transition-all cursor-pointer flex flex-col gap-2.5 ${
                  isSelected
                    ? 'bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                    : 'bg-stone-900/90 border-stone-800 hover:border-stone-600 hover:bg-stone-900 shadow-md'
                }`}
              >
                {/* Top Row: Country Flag, Name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{circuit.country.split(' ')[1] || '🏁'}</span>
                      <h3 className="font-bold text-white text-sm truncate">
                        {circuit.name}
                      </h3>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-300/90 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>📍 {circuitTheme.landmark}</span>
                      <span className="text-stone-500">·</span>
                      <span className="text-stone-400 font-mono text-[10px]">{circuitTheme.weatherFlavour}</span>
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1 line-clamp-2 leading-relaxed">
                      {circuit.description}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      circuit.difficulty === 'Beginner'
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/60'
                        : circuit.difficulty === 'Intermediate'
                        ? 'bg-blue-950/70 text-blue-300 border border-blue-600/60'
                        : 'bg-rose-950/70 text-rose-300 border border-rose-600/60'
                    }`}
                  >
                    {circuit.difficulty}
                  </span>
                </div>

                {/* Middle: Mini Track Geometry Preview & Telemetry */}
                <div className="flex items-center gap-3 pt-1">
                  {/* Thumbnail Preview with Local Scenic Backdrop + SVG Track */}
                  <div className="w-28 h-20 rounded-xl border border-stone-700/80 relative flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner group-hover:border-stone-500 transition">
                    <img
                      src={circuitTheme.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[1px]" />
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                      {secGeo ? (
                        <svg viewBox={secGeo.viewBox} className="w-full h-full drop-shadow-md">
                        {secGeo.cells.map((cell) => (
                          <polygon
                            key={`st-${cell.idx}`}
                            points={cell.poly0}
                            fill={
                              cell.type === 'C'
                                ? '#ef4444'
                                : cell.type === 'S'
                                ? '#d97706'
                                : '#475569'
                            }
                          />
                        ))}
                        <rect x="-2" y="-15" width="4" height="30" fill="#fbbf24" />
                      </svg>
                    ) : rectGeo ? (
                      <svg
                        viewBox={`-8 -8 ${rectGeo.W + 16} ${rectGeo.H + 16}`}
                        className="w-full h-full"
                      >
                        <rect
                          x={rectGeo.xL - 4}
                          y={rectGeo.yT - 4}
                          width={rectGeo.xR - rectGeo.xL + 8}
                          height={rectGeo.yB - rectGeo.yT + 8}
                          rx={10}
                          fill="#141a22"
                        />
                        {rectGeo.cells.map((cell, idx) => {
                          const pts = computePolygonPoints(
                            cell.g,
                            cell.t1,
                            cell.t2,
                            -LANE_WIDTH,
                            LANE_WIDTH
                          );
                          return (
                            <polygon
                              key={`t-${idx}`}
                              points={pts}
                              fill={
                                cell.t === 'C'
                                  ? '#ef4444'
                                  : cell.t === 'S'
                                  ? '#d97706'
                                  : '#475569'
                              }
                            />
                          );
                        })}
                        {/* Start Line */}
                        <line
                          x1={rectGeo.xs}
                          y1={rectGeo.yB - LANE_WIDTH}
                          x2={rectGeo.xs}
                          y2={rectGeo.yB + LANE_WIDTH}
                          stroke="#fbbf24"
                          strokeWidth="2.5"
                        />
                      </svg>
                    ) : null}
                    </div>
                  </div>

                  {/* Telemetry Stats */}
                  <div className="flex-1 grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div className="bg-stone-900/80 rounded-lg p-1.5 border border-stone-800/70">
                      <span className="block text-[9px] text-stone-500 uppercase font-sans">Length</span>
                      <span className="text-xs font-bold text-stone-200">{totalSpaces}</span>
                      <span className="text-[9px] text-stone-500 ml-0.5">sp</span>
                    </div>
                    <div className="bg-stone-900/80 rounded-lg p-1.5 border border-stone-800/70">
                      <span className="block text-[9px] text-stone-500 uppercase font-sans">Corner Sections</span>
                      <span className="text-xs font-bold text-red-400">{cornerCount}</span>
                    </div>
                    <div className="bg-stone-900/80 rounded-lg p-1.5 border border-stone-800/70">
                      <span className="block text-[9px] text-stone-500 uppercase font-sans">Single-width</span>
                      <span className="text-xs font-bold text-amber-400">{bottleneckCount}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Selection Button Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-850/80 text-[11px]">
                  <span className="text-stone-400 font-mono flex items-center gap-1">
                    <Flag className="w-3 h-3 text-stone-500" /> Default {circuit.lapsDefault} Laps
                  </span>
                  <span className="text-amber-400 font-semibold group-hover:underline flex items-center gap-1">
                    {isSelected ? 'Currently Selected' : 'Click to Load Track ➜'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-800 shrink-0 bg-stone-950 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {allCircuits.length} circuits available
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
