// src/components/dashboard/GlobalLeaderboard.jsx
import React from 'react';


// DHARMIL :- Fetch Players from API instead of hardcoding them in the component.
const PLAYERS = [
  { rank: 1, name: 'Nihar_X',       elo: 2890, delta: '+42', tag: 'APEX'     },
  { rank: 2, name: 'Ansh_Code',     elo: 2610, delta: '+17', tag: 'ELITE'    },
  { rank: 3, name: 'Dharmil_07',    elo: 2450, delta: '+28', tag: 'IMMORTAL', isSelf: true },
  { rank: 4, name: 'Bug_Destroyer', elo: 2300, delta: '-5',  tag: 'DIAMOND'  },
  { rank: 5, name: 'AlgoKing_99',   elo: 2190, delta: '+11', tag: 'DIAMOND'  },
  { rank: 6, name: 'Ptr_Syntax',    elo: 2040, delta: '-8',  tag: 'PLATINUM' },
  { rank: 7, name: 'null_slayer',   elo: 1980, delta: '+3',  tag: 'PLATINUM' },
  { rank: 8, name: 'RecurseKing',   elo: 1845, delta: '+19', tag: 'GOLD'     },
];

const RANK_MEDALS = ['①', '②', '③'];

const TAG_COLORS = {
  APEX:     '#f59e0b',
  ELITE:    '#8b5cf6',
  IMMORTAL: '#ef4444',
  DIAMOND:  '#60a5fa',
  PLATINUM: '#10b981',
  GOLD:     '#fbbf24',
};

export function GlobalLeaderboard() {
  return (
    <div
      className="h-full flex flex-col rounded-xl overflow-hidden"
      style={{
        background: 'rgba(15,23,42,0.60)',
        border: '1px solid rgba(30,41,59,0.70)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Panel Header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: '1px solid rgba(30,41,59,0.8)',
          background: 'rgba(2,6,23,0.40)',
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[8px] font-mono tracking-[0.24em] uppercase"
            style={{ color: '#475569' }}
          >
            GLOBAL
          </span>
          <span
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ color: '#f59e0b' }}
          >
            ⚔ LEADERBOARD
          </span>
        </div>

        <span
          className="px-2 py-0.5 rounded text-[8px] font-mono tracking-widest uppercase"
          style={{
            background: 'rgba(245,158,11,0.09)',
            border: '1px solid rgba(245,158,11,0.20)',
            color: '#f59e0b',
          }}
        >
          SEASON 1
        </span>
      </div>

      {/* ── Column Headers ── */}
      <div
        className="flex-shrink-0 grid grid-cols-12 gap-1 px-3 py-1.5
                   text-[8px] font-mono uppercase tracking-widest"
        style={{ borderBottom: '1px solid #0f172a', color: '#1e293b' }}
      >
        <span className="col-span-1">#</span>
        <span className="col-span-6">PLAYER</span>
        <span className="col-span-3 text-right">ELO</span>
        <span className="col-span-2 text-right">Δ</span>
      </div>

      {/* ── Player Rows ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {PLAYERS.map((p) => (
          <div
            key={p.name}
            id={p.isSelf ? 'leaderboard-self-row' : undefined}
            className="grid grid-cols-12 gap-1 items-center px-3 py-2 transition-all duration-200"
            style={{
              borderBottom: '1px solid rgba(30,41,59,0.40)',
              /* Self-highlight — fully decoupled styling block */
              ...(p.isSelf
                ? {
                    background:
                      'linear-gradient(90deg, rgba(245,158,11,0.08), rgba(239,68,68,0.04))',
                    borderLeft: '2px solid rgba(245,158,11,0.50)',
                  }
                : {
                    background: 'transparent',
                    borderLeft: '2px solid transparent',
                  }),
            }}
          >
            {/* Rank */}
            <span
              className="col-span-1 text-[10px] font-black"
              style={{
                color: p.rank <= 3 ? '#f59e0b' : '#334155',
                textShadow: p.rank === 1 ? '0 0 8px rgba(245,158,11,0.6)' : 'none',
              }}
            >
              {p.rank <= 3 ? RANK_MEDALS[p.rank - 1] : p.rank}
            </span>

            {/* Name + tag */}
            <div className="col-span-6 flex flex-col gap-[2px] min-w-0">
              <span
                className="text-[10px] font-semibold tracking-wide truncate"
                style={{ color: p.isSelf ? '#ffffff' : '#94a3b8' }}
              >
                {p.name}
                {p.isSelf && (
                  <span
                    className="ml-1 text-[8px] font-bold"
                    style={{ color: '#f59e0b' }}
                  >
                    ◀ YOU
                  </span>
                )}
              </span>
              <span
                className="text-[8px] font-mono tracking-widest uppercase"
                style={{ color: TAG_COLORS[p.tag] ?? '#475569', opacity: 0.8 }}
              >
                {p.tag}
              </span>
            </div>

            {/* ELO */}
            <span
              className="col-span-3 text-right text-[10px] font-mono font-bold"
              style={{ color: p.isSelf ? '#f59e0b' : '#475569' }}
            >
              {p.elo.toLocaleString()}
            </span>

            {/* Delta */}
            <span
              className="col-span-2 text-right text-[9px] font-mono"
              style={{ color: p.delta.startsWith('+') ? '#10b981' : '#ef4444' }}
            >
              {p.delta}
            </span>
          </div>
        ))}
      </div>

      {/* ── Panel Footer ── */}
      <div
        className="flex-shrink-0 px-4 py-2 text-[9px] font-mono uppercase
                   tracking-widest text-center"
        style={{ borderTop: '1px solid #0f172a', color: '#1e293b' }}
      >
        Queue Latency: ~38s · 342 Online
      </div>
    </div>
  );
}