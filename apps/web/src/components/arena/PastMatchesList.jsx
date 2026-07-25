import React from 'react';
import { Trophy } from 'lucide-react';

export function PastMatchesList({ matches = [] }) {
  const matchRecords = matches.length > 0 ? matches : [
    { id: 1, mode: '1v1 Ranked', status: 'Victory', eloDelta: '+18 ELO', date: '2026-07-09' },
    { id: 2, mode: '1v1 Ranked', status: 'Defeat', eloDelta: '-15 ELO', date: '2026-07-08' },
    { id: 3, mode: 'Custom Arena', status: 'Victory', eloDelta: '0 ELO (Unranked)', date: '2026-07-07' },
    { id: 4, mode: '1v1 Ranked', status: 'Victory', eloDelta: '+22 ELO', date: '2026-07-05' },
    { id: 5, mode: '1v1 Ranked', status: 'Victory', eloDelta: '+14 ELO', date: '2026-07-04' },
    { id: 6, mode: '1v1 Ranked', status: 'Defeat', eloDelta: '-11 ELO', date: '2026-07-02' }
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-lg h-fit">
      {/* Panel Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/60 mb-1">
        <Trophy size={15} className="text-indigo-400" />
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          Combat Records
        </h2>
      </div>

      {/* Match Row List */}
      <div className="flex flex-col">
        {matchRecords.map((match) => {
          const isVictory = match.status === 'Victory';

          return (
            <div
              key={match.id}
              className="border-b border-zinc-800/60 py-3 last:border-0 flex items-center justify-between gap-4"
            >
              {/* Left: Mode + Date */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  {match.mode}
                </span>
                <span className="text-[9px] text-zinc-600 font-mono">
                  {match.date}
                </span>
              </div>

              {/* Right: Status Badge + ELO Delta */}
              <div className="flex flex-col items-end gap-1.5">
                {isVictory ? (
                  <span className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded text-xs font-mono font-medium tracking-wide">
                    VICTORY
                  </span>
                ) : (
                  <span className="bg-zinc-900 text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded text-xs font-mono font-medium tracking-wide">
                    DEFEAT
                  </span>
                )}
                <span
                  className={`text-[10px] font-mono ${
                    isVictory ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  {match.eloDelta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/60 pt-4 mt-3">
        <p className="text-[9px] font-mono text-zinc-600 leading-normal uppercase">
          // Archive match record logs synchronized with postgres db endpoint
        </p>
      </div>
    </div>
  );
}
