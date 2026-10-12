import React, { useState } from 'react';
import { GameOptions, GameState, TrackDefinition } from '../types/game';
import {
  DEFAULT_TRACK_SEGMENTS,
  encodeTrackCode,
  loadSavedCustomTracks,
  parseTrackCode,
  saveCustomTracks,
  saveStoredTrack,
  SEGMENT_NAMES,
  TRACK_PRESETS,
} from '../game/tracks';
import {
  computeReach,
  createEmptySelection,
  createInitialPlayer,
  getEndPosition,
  getLeaderIndex,
  getRoundSteps,
  getTrackArray,
  shuffle,
  CARDS,
  SLIP_VAL,
  MOM_VAL,
} from '../game/engine';
import { X, Sliders, Play, Copy, Check, Bookmark, RotateCcw, AlertTriangle } from 'lucide-react';

interface TrackEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: string[];
  options: GameOptions;
  editorActive: boolean;
  onToggleEditorActive: (active: boolean) => void;
  onUpdateSegments: (newSegments: string[]) => void;
  onRestartRace: () => void;
}

export const TrackEditorModal: React.FC<TrackEditorModalProps> = ({
  isOpen,
  onClose,
  segments,
  options,
  editorActive,
  onToggleEditorActive,
  onUpdateSegments,
  onRestartRace,
}) => {
  const [codeInput, setCodeInput] = useState(encodeTrackCode(segments));
  const [trackNameInput, setTrackNameInput] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [simResults, setSimResults] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const [savedTracks, setSavedTracks] = useState(() => loadSavedCustomTracks());

  if (!isOpen) return null;

  const handleAdjustLength = (index: number, delta: number) => {
    const next = [...segments];
    const s = next[index];
    const isCorner = index % 2 !== 0;

    if (isCorner) {
      const newLen = Math.max(1, Math.min(5, s.length + delta));
      next[index] = 'C'.repeat(newLen);
    } else {
      if (delta > 0) {
        if (s.length < 14) next[index] = s + 'T';
      } else {
        if (s.length > 1) next[index] = s.slice(0, -1);
      }
    }

    onUpdateSegments(next);
    setCodeInput(encodeTrackCode(next));
    saveStoredTrack(options.mode, next);
    onRestartRace();
  };

  const handleApplyCode = () => {
    const parsed = parseTrackCode(codeInput);
    if (!parsed) {
      setErrorMsg('Invalid track code. Must be 9 parts separated by /, corners C (1-5), straights T/S.');
      return;
    }
    setErrorMsg(null);
    onUpdateSegments(parsed);
    saveStoredTrack(options.mode, parsed);
    onRestartRace();
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(encodeTrackCode(segments));
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus('Copy failed');
    }
  };

  const handleSaveTrack = () => {
    const name = trackNameInput.trim().slice(0, 30);
    if (!name) return;
    const currentCode = encodeTrackCode(segments);
    const updated = savedTracks
      .filter((t) => !(t.name === name && t.mode === options.mode))
      .concat([{ name, mode: options.mode, code: currentCode }]);
    setSavedTracks(updated);
    saveCustomTracks(updated);
    setTrackNameInput('');
  };

  const handleLoadTrackPreset = (preset: TrackDefinition) => {
    onUpdateSegments(preset.segments);
    setCodeInput(encodeTrackCode(preset.segments));
    saveStoredTrack(options.mode, preset.segments);
    onRestartRace();
  };

  const handleResetDefault = () => {
    const def = DEFAULT_TRACK_SEGMENTS[options.mode];
    onUpdateSegments(def);
    setCodeInput(encodeTrackCode(def));
    saveStoredTrack(options.mode, def);
    onRestartRace();
  };

  // 100-Game Monte Carlo Track Evaluation
  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      try {
        const track = getTrackArray(segments);
        const endPos = getEndPosition(segments, options.laps);
        const stats = {
          games: 0,
          rounds: 0,
          wins: [0, 0],
          leadChanges: 0,
          moves: 0,
          blockedMoves: 0,
          zeroMoves: 0,
          totalPips: 0,
          usedPips: 0,
          finished: 0,
        };

        const rnd = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

        for (let g = 0; g < 100; g++) {
          const simState: GameState = {
            round: 1,
            step: 0,
            lead: 0,
            tr: 1,
            spd: [0, 0],
            dv: [0, 0],
            phase: 'roll',
            P: [createInitialPlayer(0), createInitialPlayer(1)],
            picks: [null, null],
            log: [],
            win: null,
            sel: createEmptySelection(),
          };

          let stepsCount = 0;
          let prevLeader: number | null = null;

          while (simState.phase !== 'over' && stepsCount++ < 600) {
            if (simState.phase === 'roll') {
              simState.P.forEach((p) => {
                p.dice = Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 6));
                p.used = [];
              });
              simState.phase = 'pick0';
            } else if (simState.phase === 'pick0') {
              const p = simState.P[0];
              const avail = p.dice.map((_, i) => i).filter((i) => !p.used.includes(i));
              const dieIdx = rnd(avail);
              const reach = computeReach(0, p.dice[dieIdx], simState, track, options);
              const targetKey = rnd(Object.keys(reach));
              const [pos, lane] = targetKey.split(':').map(Number);
              p.used.push(dieIdx);
              p.pos = pos;
              p.lane = lane;
              stats.moves++;
              stats.totalPips += p.dice[dieIdx];
              stats.usedPips += reach[targetKey] || 0;
              if ((reach[targetKey] || 0) < p.dice[dieIdx]) stats.blockedMoves++;
              if ((reach[targetKey] || 0) === 0) stats.zeroMoves++;
              if (p.pos >= endPos) {
                simState.win = 0;
                simState.phase = 'over';
                break;
              }
              simState.phase = 'pick1';
            } else if (simState.phase === 'pick1') {
              const p = simState.P[1];
              const avail = p.dice.map((_, i) => i).filter((i) => !p.used.includes(i));
              const dieIdx = rnd(avail);
              const reach = computeReach(1, p.dice[dieIdx], simState, track, options);
              const targetKey = rnd(Object.keys(reach));
              const [pos, lane] = targetKey.split(':').map(Number);
              p.used.push(dieIdx);
              p.pos = pos;
              p.lane = lane;
              stats.moves++;
              stats.totalPips += p.dice[dieIdx];
              stats.usedPips += reach[targetKey] || 0;
              if ((reach[targetKey] || 0) < p.dice[dieIdx]) stats.blockedMoves++;
              if ((reach[targetKey] || 0) === 0) stats.zeroMoves++;
              if (p.pos >= endPos) {
                simState.win = 1;
                simState.phase = 'over';
                break;
              }
              simState.step++;
              if (simState.step >= 5) {
                simState.round++;
                simState.step = 0;
                simState.phase = 'roll';
              } else {
                simState.phase = 'pick0';
              }

              const currLead = getLeaderIndex(simState.P, simState.lead);
              if (prevLeader !== null && currLead !== prevLeader) {
                stats.leadChanges++;
              }
              prevLeader = currLead;
            }
          }

          stats.games++;
          stats.rounds += simState.round;
          if (simState.win !== null) {
            stats.finished++;
            stats.wins[simState.win]++;
          }
        }

        const pct = (x: number) => Math.round(100 * x) + '%';
        setSimResults(
          `100 Simulated Races:\n• Average duration: ${(stats.rounds / stats.games).toFixed(1)} rounds\n• Finished: ${stats.finished}/100\n• P1 Win Rate: ${pct(stats.wins[0] / Math.max(1, stats.finished))} | P2 Win Rate: ${pct(stats.wins[1] / Math.max(1, stats.finished))}\n• Lead changes: ${(stats.leadChanges / stats.games).toFixed(1)} per race\n• Moves bottlenecked: ${pct(stats.blockedMoves / Math.max(1, stats.moves))}\n• Total pips lost: ${pct(1 - stats.usedPips / Math.max(1, stats.totalPips))}`
        );
      } catch (err) {
        setSimResults('Simulation encountered an error.');
      } finally {
        setIsSimulating(false);
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Track Architect</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-stone-200">
          {/* Preset Circuits for future expansion */}
          <div className="space-y-1.5">
            <span className="font-semibold text-white block">Preset Circuits</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TRACK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleLoadTrackPreset(preset)}
                  className="p-2 rounded-xl bg-stone-950/70 border border-stone-800 hover:border-amber-500/60 text-left transition flex flex-col justify-between"
                >
                  <div>
                    <span className="font-bold text-white block text-xs truncate">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-stone-400 block line-clamp-2 mt-0.5">
                      {preset.description}
                    </span>
                  </div>
                  <span className="text-[9px] text-amber-400 font-mono mt-2 uppercase">
                    {preset.difficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Board Click Toggle */}
          <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Board Touch Editing</span>
              <span className="text-[11px] text-stone-400">
                Tap straight spaces directly on the board to flip 2-lane ↔ 1-lane bottleneck
              </span>
            </div>
            <button
              onClick={() => onToggleEditorActive(!editorActive)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                editorActive ? 'bg-amber-500' : 'bg-stone-800'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  editorActive ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Sector Lengths */}
          <div className="space-y-2">
            <span className="font-semibold text-white block">Sector Lengths</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {segments.map((seg, idx) => (
                <div
                  key={`seg-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-stone-950/50 border border-stone-800/80"
                >
                  <span className="text-stone-300 font-medium">
                    {SEGMENT_NAMES[idx]}:{' '}
                    <strong className="text-amber-400 font-mono">{seg.length}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjustLength(idx, -1)}
                      className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <button
                      onClick={() => handleAdjustLength(idx, 1)}
                      className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 active:scale-95 text-white font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track Code Import / Export */}
          <div className="space-y-2 pt-2 border-t border-stone-800/80">
            <span className="font-semibold text-white block">Track Code (Share / Import)</span>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                placeholder="Track code string..."
              />
              <button
                onClick={handleApplyCode}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition shrink-0"
              >
                Apply
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium transition shrink-0 flex items-center gap-1"
              >
                {copyStatus ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errorMsg && (
              <p className="text-red-400 text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errorMsg}
              </p>
            )}
          </div>

          {/* Simulation Benchmark */}
          <div className="space-y-2 pt-2 border-t border-stone-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white block">AI Track Benchmark</span>
              <button
                disabled={isSimulating}
                onClick={runSimulation}
                className="py-1 px-3 rounded-lg bg-stone-100 hover:bg-white text-stone-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isSimulating ? 'Simulating...' : 'Run 100 Games'}</span>
              </button>
            </div>
            {simResults && (
              <pre className="p-2.5 rounded-lg bg-stone-950 text-[11px] font-mono text-stone-300 whitespace-pre-wrap leading-relaxed border border-stone-800">
                {simResults}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-800 shrink-0 bg-stone-950 flex items-center justify-between gap-2">
          <button
            onClick={handleResetDefault}
            className="px-3 py-2 rounded-xl text-stone-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Track</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-stone-950 transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
