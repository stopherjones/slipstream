import React from 'react';
import { ChampionshipState, TrackDefinition } from '../types/game';
import { Trophy, Award, ChevronRight, RotateCcw, Home, Flag, Car } from 'lucide-react';
import { sound } from '../game/audio';

interface ChampionshipStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  championship: ChampionshipState;
  completedRaceIndex?: number;
  lastRaceOrder?: number[]; // indices of players in 1st, 2nd, 3rd, 4th order
  onNextRace: () => void;
  onRestartChampionship: () => void;
  onGoHome: () => void;
}

export const ChampionshipStandingsModal: React.FC<ChampionshipStandingsModalProps> = ({
  isOpen,
  onClose,
  championship,
  completedRaceIndex,
  lastRaceOrder,
  onNextRace,
  onRestartChampionship,
  onGoHome,
}) => {
  if (!isOpen) return null;

  const currentRace = championship.tracks[championship.currentRaceIndex] || championship.tracks[0];
  const nextRace = championship.tracks[championship.currentRaceIndex + 1];
  const isFinalRaceCompleted =
    completedRaceIndex !== undefined && completedRaceIndex + 1 >= championship.totalRaces;

  // Car visual details
  const carStyles = [
    { color: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500/40', badge: 'bg-blue-950/60' },
    { color: 'bg-orange-600', text: 'text-orange-400', border: 'border-orange-500/40', badge: 'bg-orange-950/60' },
    { color: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/40', badge: 'bg-emerald-950/60' },
    { color: 'bg-violet-600', text: 'text-violet-400', border: 'border-violet-500/40', badge: 'bg-violet-950/60' },
  ];

  // Sort standings by points descending (then wins, then second places)
  const sortedStandings = [...championship.standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.secondPlaces !== a.secondPlaces) return b.secondPlaces - a.secondPlaces;
    return b.thirdPlaces - a.thirdPlaces;
  });

  const championshipLeader = sortedStandings[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-800 bg-stone-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
                Championship Standings
              </h2>
              <p className="text-xs text-stone-400 font-medium">
                {isFinalRaceCompleted
                  ? 'Season Completed · Final Results'
                  : `Race ${championship.currentRaceIndex + 1} of ${championship.totalRaces} · ${currentRace.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {championship.type === 'solo' ? 'Solo (3 Bots)' : 'Pass & Play (4P)'}
            </span>
          </div>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-stone-200">
          {/* Winner Banner if Final Race */}
          {isFinalRaceCompleted && championshipLeader && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-stone-900 border border-amber-500/40 text-center space-y-1.5 shadow-lg shadow-amber-950/30">
              <span className="text-2xl">👑 🏆 🏁</span>
              <h3 className="text-lg font-black text-amber-300 tracking-wide uppercase">
                {championshipLeader.name} Wins the Championship!
              </h3>
              <p className="text-xs text-stone-300">
                Champion crowned with <strong className="text-amber-400 font-bold">{championshipLeader.points} total points</strong> across {championship.totalRaces} grueling Grand Prix rounds!
              </p>
            </div>
          )}

          {/* Last Race Results (if applicable) */}
          {lastRaceOrder && lastRaceOrder.length === 4 && (
            <div className="space-y-2 bg-stone-950/60 p-3 rounded-xl border border-stone-800">
              <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                <span className="flex items-center gap-1 text-white">
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Race {completedRaceIndex !== undefined ? completedRaceIndex + 1 : championship.currentRaceIndex + 1} Finishers & Points</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">6 - 4 - 2 - 1 pts</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {lastRaceOrder.map((playerIdx, rank) => {
                  const pts = rank === 0 ? 6 : rank === 1 ? 4 : rank === 2 ? 2 : 1;
                  const rankLabel = rank === 0 ? '1st' : rank === 1 ? '2nd' : rank === 2 ? '3rd' : '4th';
                  const standing = championship.standings.find((s) => s.playerIdx === playerIdx);
                  const style = carStyles[playerIdx] || carStyles[0];

                  return (
                    <div
                      key={`finisher-${playerIdx}`}
                      className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${style.badge} ${style.border}`}
                    >
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        {rankLabel}
                      </span>
                      <div className="flex items-center gap-1 my-0.5">
                        <span className={`w-3.5 h-3.5 rounded-full ${style.color} inline-block`} />
                        <span className="font-bold text-white text-xs truncate max-w-[70px]">
                          {standing?.name || `Driver ${playerIdx + 1}`}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-amber-400">
                        +{pts} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overall Standings Table */}
          <div className="space-y-1.5">
            <span className="font-bold text-stone-300 text-xs flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Overall Championship Leaderboard</span>
            </span>

            <div className="border border-stone-800 rounded-xl overflow-hidden bg-stone-950/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/60 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    <th className="py-2 px-3 w-8 text-center">Pos</th>
                    <th className="py-2 px-3">Driver</th>
                    <th className="py-2 px-2 text-center">W-2-3-4</th>
                    <th className="py-2 px-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-xs">
                  {sortedStandings.map((st, posIdx) => {
                    const style = carStyles[st.playerIdx] || carStyles[0];
                    const isLeader = posIdx === 0;

                    return (
                      <tr
                        key={st.playerIdx}
                        className={`transition-colors ${
                          isLeader ? 'bg-amber-500/10' : 'hover:bg-stone-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold font-mono">
                          {posIdx === 0 ? '🥇 1' : posIdx === 1 ? '🥈 2' : posIdx === 2 ? '🥉 3' : '4'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full ${style.color} text-white font-bold text-[9px] flex items-center justify-center shrink-0`}>
                              {st.playerIdx + 1}
                            </span>
                            <div>
                              <span className="font-bold text-white block text-xs">
                                {st.name}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] font-mono text-stone-400">
                                {st.history.map((pts, rIdx) => (
                                  <span
                                    key={rIdx}
                                    title={`Race ${rIdx + 1}: ${pts} pts`}
                                    className="px-1 rounded bg-stone-800 text-stone-300"
                                  >
                                    {pts}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[11px] text-stone-300">
                          {st.wins}-{st.secondPlaces}-{st.thirdPlaces}-{st.fourthPlaces}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm text-amber-400">
                          {st.points} <span className="text-[10px] font-normal text-stone-400">pts</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scoring System Reminder */}
          <div className="p-2.5 rounded-lg bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
            <span className="font-semibold text-stone-300">Scoring Formula:</span>
            <span className="font-mono text-stone-200">
              1st: <strong className="text-amber-400">6pts</strong> · 2nd: <strong className="text-amber-400">4pts</strong> · 3rd: <strong className="text-amber-400">2pts</strong> · 4th: <strong className="text-amber-400">1pt</strong>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={onGoHome}
            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Home className="w-3.5 h-3.5 text-stone-400" />
            <span>Home Menu</span>
          </button>

          {!isFinalRaceCompleted && nextRace ? (
            <button
              onClick={() => {
                sound.playTurnStart();
                onNextRace();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20"
            >
              <span>Next: {nextRace.name}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onRestartChampionship}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start New Season</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
