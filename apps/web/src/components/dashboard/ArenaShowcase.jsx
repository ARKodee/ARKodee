// src/components/dashboard/ArenaShowcase.jsx
import React from 'react';



// DHARMIL :- Fetch Stats and Loadout from API instead of hardcoding them in the component.
const STATS = [
  {
    label:  'WIN RATE',
    value:  '68.4%',
    sub:    '↑ +2.1% this week',
    color:  '#10b981',
    icon:   '▲',
  },
  {
    label:  'STREAK',
    value:  '5 WINS',
    sub:    'Personal best: 8',
    color:  '#f59e0b',
    icon:   '⚡',
  },
  {
    label:  'DEFUSES',
    value:  '142',
    sub:    'Season avg: 3.2/match',
    color:  '#94a3b8',
    icon:   '●',
  },
];


const LOADOUT = ['BFS Blaster', 'DP Shield', 'Greedy Strike'];

export function ArenaShowcase() {
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: 'rgba(15,23,42,0.75)',
        border: '1px solid #1e293b',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Top accent gradient bar ── */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, #f59e0b 38%, #ef4444 62%, transparent)',
        }}
      />

      {/* ── Subtle grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.022) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(245,158,11,0.022) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Card Body ── */}
      <div className="relative p-5">

        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p
              className="text-[9px] font-mono tracking-[0.28em] uppercase mb-1"
              style={{ color: '#475569' }}
            >
              ACTIVE OPERATOR PROFILE
            </p>
            <h2
              className="text-xl font-black tracking-widest uppercase"
              style={{ color: '#f59e0b', textShadow: '0 0 20px rgba(245,158,11,0.35)' }}
            >
              SYNTAX ASSASSIN
            </h2>
            <p
              className="text-[10px] font-mono mt-1 leading-relaxed"
              style={{ color: '#475569', maxWidth: 320 }}
            >
              Specialized in Real-Time Code Execution Disruptions<br />
              and Screen Blurring Sabotages.
            </p>
          </div>

          {/* Class badge */}
          <span
            className="flex-shrink-0 px-2 py-1 rounded text-[9px] font-mono font-bold
                       tracking-widest uppercase"
            style={{
              background: 'rgba(239,68,68,0.13)',
              border: '1px solid rgba(239,68,68,0.28)',
              color: '#ef4444',
            }}
          >
            ATTACKER
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, #1e293b 20%, #1e293b 80%, transparent)',
            marginBottom: 14,
          }}
        />

        {/* ── 3-Column Stats Cluster ── */}
        <div className="grid grid-cols-3 gap-2">
          {STATS.map(({ label, value, sub, color, icon }) => (
            <div
              key={label}
              className="flex flex-col gap-1 p-3 rounded-lg"
              style={{
                background: 'rgba(2,6,23,0.65)',
                border: '1px solid rgba(30,41,59,0.7)',
              }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span style={{ color, fontSize: 8 }}>{icon}</span>
                <span
                  className="text-[8px] font-mono uppercase tracking-widest"
                  style={{ color: '#334155' }}
                >
                  {label}
                </span>
              </div>
              <span className="text-base font-black tracking-wider" style={{ color }}>
                {value}
              </span>
              <span className="text-[8px] font-mono" style={{ color: '#1e293b' }}>
                {sub}
              </span>
            </div>
          ))}
        </div>

        {/* ── Loadout Tags ── */}
        <div className="mt-3 flex items-center flex-wrap gap-1.5">
          <span
            className="text-[9px] font-mono tracking-widest uppercase"
            style={{ color: '#1e293b' }}
          >
            LOADOUT:
          </span>
          {LOADOUT.map((item) => (
            <span
              key={item}
              className="px-2 py-0.5 rounded text-[9px] font-mono tracking-wider"
              style={{
                background: 'rgba(30,41,59,0.7)',
                border: '1px solid #1e293b',
                color: '#475569',
              }}
            >
              {item}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}
