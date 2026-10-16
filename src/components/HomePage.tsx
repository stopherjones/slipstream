import React, { useState } from 'react';
import { BotDifficulty, ChampionshipState, GameOptions, TrackDefinition } from '../types/game';
import {
  Calendar,
  Compass,
  Trophy,
  Play,
  Sliders,
  BookOpen,
  Volume2,
  VolumeX,
  Bot,
  User,
  Users,
  Flag,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { computeSectionTrackGeometry } from '../game/sectionGeometry';
import { computeTrackGeometry } from '../game/geometry';

interface HomePageProps {
  dailyTrack: TrackDefinition;
  availableTracks: TrackDefinition[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onOpenEditor: () => void;
  onStartDailyPlay: (track: TrackDefinition, botMode: BotDifficulty, botCount: 1 | 2 | 3) => void;
  onStartPickTrack: () => void;
  onStartChampionship: (type: 'solo' | 'pass-and-play', raceCount: number) => void;
  activeChampionship?: ChampionshipState | null;
  onResumeChampionship?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  dailyTrack,
  availableTracks,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onOpenEditor,
  onStartDailyPlay,
  onStartPickTrack,
  onStartChampionship,
  activeChampionship,
  onResumeChampionship,
}) => {
  // Daily play configuration
  const [dailyBotMode, setDailyBotMode] = useState<BotDifficulty>('medium');
  const [dailyBotCount, setDailyBotCount] = useState<1 | 2 | 3>(1);

  // Championship configuration
  const [champType, setChampType] = useState<'solo' | 'pass-and-play'>('solo');
  const [champRaces, setChampRaces] = useState<number>(4);

  // Today's date formatted
  const todayStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  // Mini geometry render for daily track
  const isSectionTrack = Boolean(dailyTrack.sections && dailyTrack.sections.length > 0);
  let miniSvgPath: string | null = null;
  let viewBox = '0 0 100 100';

  try {
    if (isSectionTrack && dailyTrack.sections) {
      const geo = computeSectionTrackGeometry(dailyTrack.sections, { forceFuzzyClose: true });
      viewBox = geo.viewBox || '0 0 100 100';
      // Center line path through all cells
      const pts = geo.cells.map((c) => `${c.center0[0]},${c.center0[1]}`);
      if (pts.length > 0) {
        miniSvgPath = `M ${pts.join(' L ')} Z`;
      }
    } else {
      const geo = computeTrackGeometry(dailyTrack.segments);
      const W = geo.W;
      const H = geo.H;
      viewBox = `0 0 ${W} ${H}`;
      const pts = geo.cells.map((c) => {
        const x = c.g.x ?? c.g.cx ?? W / 2;
        const y = c.g.y ?? c.g.cy ?? H / 2;
        return `${x},${y}`;
      });
      if (pts.length > 0) {
        miniSvgPath = `M ${pts.join(' L ')} Z`;
      }
    }
  } catch {
    // fallback
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-stone-100 flex flex-col justify-between overflow-x-hidden">
      {/* Top Navigation */}
      <header className="w-full border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-md px-4 py-3 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black shadow-sm">
              🏁
            </div>
            <div>
              <h1 className="font-black text-lg text-white tracking-wider flex items-center gap-1.5 leading-none">
                SLIPSTREAM
              </h1>
              <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase">
                Tactical Board Racer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEditor}
              title="Track Architect"
              className="px-2.5 py-1.5 rounded-lg border border-stone-800 bg-stone-900 hover:bg-stone-800 hover:border-stone-700 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Track Architect</span>
            </button>
            <button
              onClick={onOpenRules}
              title="Rules & Guide"
              className="p-2 rounded-lg border border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white transition active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={onToggleSound}
              title="Toggle Sound"
              className="p-2 rounded-lg border border-stone-800 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white transition active:scale-95"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-stone-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-4 py-6 md:py-8 flex-1 flex flex-col justify-center space-y-6 md:space-y-8">
        {/* Hero Banner */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pure 5d6 Dice Tactical Motorsport</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            Master The Inside Line
          </h2>
          <p className="text-xs md:text-sm text-stone-400 leading-relaxed">
            Position your car, take corners on the inside track, manage slipstream and momentum, and outpace opponents to the checkered flag.
          </p>

          {/* Active Championship Resume Banner */}
          {activeChampionship?.active && onResumeChampionship && (
            <div className="pt-2">
              <button
                onClick={onResumeChampionship}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 mx-auto transition active:scale-95"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  Resume Active Championship (Race {activeChampionship.currentRaceIndex + 1}/{activeChampionship.totalRaces}) →
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 3 Primary Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {/* 1. Daily Play */}
          <div className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
              <Calendar className="w-24 h-24 text-amber-400" />
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>Daily Circuit</span>
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  {todayStr}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{dailyTrack.name}</span>
                  <span className="text-base">{dailyTrack.country.split(' ')[1] || '🏁'}</span>
                </h3>
                <p className="text-xs text-stone-400 line-clamp-2 mt-1">
                  {dailyTrack.description}
                </p>
              </div>

              {/* Track Preview Map */}
              <div className="h-28 w-full bg-stone-950/80 rounded-xl border border-stone-800/80 p-2 flex items-center justify-center relative overflow-hidden">
                {miniSvgPath ? (
                  <svg viewBox={viewBox} className="h-full w-full max-h-24">
                    <path
                      d={miniSvgPath}
                      fill="none"
                      stroke="#44403c"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={miniSvgPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      strokeDasharray="4 3"
                    />
                  </svg>
                ) : (
                  <div className="text-[11px] text-stone-500 font-mono">Circuit Preview</div>
                )}
                <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-stone-900/90 border border-stone-800 text-[10px] font-mono text-stone-300">
                  {dailyTrack.sections?.length || dailyTrack.segments.join('').length} spaces
                </div>
              </div>

              {/* Opponent Selection for Daily Play */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-stone-300 block">
                  Drivers Setup:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setDailyBotMode('medium')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      dailyBotMode === 'medium'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Solo vs AI</span>
                  </button>
                  <button
                    onClick={() => setDailyBotMode('off')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      dailyBotMode === 'off'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Pass & Play</span>
                  </button>
                </div>

                {dailyBotMode === 'medium' && (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-stone-400">AI Opponents:</span>
                    <div className="flex items-center gap-1">
                      {([1, 2, 3] as const).map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => setDailyBotCount(cnt)}
                          className={`w-7 h-6 rounded border font-bold text-[10px] transition ${
                            dailyBotCount === cnt
                              ? 'bg-amber-500 text-stone-950 border-amber-400'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onStartDailyPlay(dailyTrack, dailyBotMode, dailyBotCount)}
              className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Race Daily Track</span>
            </button>
          </div>

          {/* 2. Pick Track */}
          <div className="bg-stone-900/90 border border-stone-800 hover:border-sky-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
              <Compass className="w-24 h-24 text-sky-400" />
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-sky-400" />
                  <span>Track Browser</span>
                </span>
                <span className="text-[11px] font-mono text-stone-400">
                  {availableTracks.length} Circuits
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Pick Any Circuit
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Select from legendary real Grand Prix tracks or craft and race your own custom designs.
                </p>
              </div>

              {/* Circuits list snapshot */}
              <div className="space-y-1.5 pt-1">
                {availableTracks.slice(0, 3).map((tr) => (
                  <div
                    key={tr.id}
                    className="p-2 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">{tr.country.split(' ')[1] || '🏁'}</span>
                      <span className="font-bold text-stone-200 truncate">{tr.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                      {tr.difficulty}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/20 text-[11px] text-sky-200/80">
                ✨ Full customization: adjust laps, 1–3 AI bots or Pass & Play, and tactical token rules in race settings.
              </div>
            </div>

            <button
              onClick={onStartPickTrack}
              className="mt-4 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg shadow-sky-500/20 active:scale-98"
            >
              <Compass className="w-4 h-4" />
              <span>Browse Circuits & Race</span>
            </button>
          </div>

          {/* 3. Championship Mode */}
          <div className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition">
              <Trophy className="w-24 h-24 text-amber-400" />
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Season Championship</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                  ALWAYS 4 CARS
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Grand Prix Season
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Compete for season glory across multiple circuits with official 4-driver standings.
                </p>
              </div>

              {/* Scoring pill */}
              <div className="p-2 rounded-xl bg-stone-950/80 border border-stone-800 flex items-center justify-between text-[11px] font-mono">
                <span className="text-stone-400 text-[10px]">Points:</span>
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span>1st: 6pts</span>
                  <span>·</span>
                  <span>2nd: 4pts</span>
                  <span>·</span>
                  <span>3rd: 2pts</span>
                  <span>·</span>
                  <span>4th: 1pt</span>
                </div>
              </div>

              {/* Championship Setup Options */}
              <div className="space-y-2 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-stone-300 block">
                    Championship Format:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setChampType('solo')}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        champType === 'solo'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Solo (vs 3 AI)</span>
                    </button>
                    <button
                      onClick={() => setChampType('pass-and-play')}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                        champType === 'pass-and-play'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Pass & Play (4P)</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-stone-400">Tour Length:</span>
                  <div className="flex items-center gap-1">
                    {([3, 4, 5] as const).map((races) => (
                      <button
                        key={races}
                        onClick={() => setChampRaces(races)}
                        className={`px-2.5 py-1 rounded border font-bold text-[10px] transition ${
                          champRaces === races
                            ? 'bg-amber-500 text-stone-950 border-amber-400'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {races} Races
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onStartChampionship(champType, champRaces)}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-98"
            >
              <Trophy className="w-4 h-4" />
              <span>Start Championship 🏆</span>
            </button>
          </div>
        </div>

        {/* Feature summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-stone-400 text-center text-[11px] pt-2 border-t border-stone-800/80">
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-stone-900/50">
            <span className="text-amber-400">🎲</span>
            <span>Standard 5d6 Dice</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-stone-900/50">
            <span className="text-sky-400">🌀</span>
            <span>Slipstream Passing</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-stone-900/50">
            <span className="text-amber-400">⚡</span>
            <span>Momentum Pips</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-stone-900/50">
            <span className="text-emerald-400">🛡️</span>
            <span>Collision Blocking</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-800/60 bg-stone-950/80 px-4 py-3 shrink-0 text-center text-xs text-stone-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SLIPSTREAM · Tactical Board Racing Engine</span>
          <div className="flex items-center gap-4 text-[11px] text-stone-400">
            <button onClick={onOpenRules} className="hover:text-amber-400 transition">
              Rules & Strategy
            </button>
            <button onClick={onOpenEditor} className="hover:text-amber-400 transition">
              Track Architect
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
