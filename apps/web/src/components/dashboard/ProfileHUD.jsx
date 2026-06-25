// src/components/dashboard/ProfileHUD.jsx
import React from 'react';

// DHARMIL :- Fetch ELO stats from API instead of hardcoding them in the component.
// THINK ABOUT AVATAR BADGE AND ONLINE STATUS TOO. MAYBE FETCH AVATAR URL AND ONLINE STATUS FROM API.
const ELO_CURRENT = 2450;
const ELO_NEXT    = 2600;
const ELO_PREV    = 2200;
const ELO_PCT     = Math.round(((ELO_CURRENT - ELO_PREV) / (ELO_NEXT - ELO_PREV)) * 100);

export function ProfileHUD() {
  return (
    <div
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg min-w-[240px]"
      style={{
        background: 'rgba(15,23,42,0.60)',
        border: '1px solid #1e293b',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Corner bracket — top-left */}
      <span style={corner('top','left')} />
      {/* Corner bracket — bottom-right */}
      <span style={corner('bottom','right')} />

      {/* ── Avatar Badge ── */}
      <div
        className="relative flex-shrink-0 w-11 h-11 rounded-md flex items-center justify-center
                   font-black text-lg text-white"
        style={{
          background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
          border: '1px solid rgba(245,158,11,0.45)',
          boxShadow: '0 0 12px rgba(245,158,11,0.25)',
        }}
      >
        D
        {/* Online dot */}
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
          style={{ border: '2px solid #020617' }}
        />
      </div>

      {/* ── Info Block ── */}
      <div className="flex flex-col gap-[3px] flex-1 min-w-0">
        {/* Gamertag */}
        <span className="text-[13px] font-bold tracking-wider text-white truncate">
          Dharmil_07
        </span>

        {/* Rank line */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: '#64748b' }}>
            RANK:
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>
            IMMORTAL
          </span>
          <span className="text-[9px] font-mono" style={{ color: '#475569' }}>
            · {ELO_CURRENT} ELO
          </span>
        </div>

        {/* ELO progress micro-bar */}
        <div className="flex items-center gap-2 mt-0.5">
          <div
            className="flex-1 h-[3px] rounded-full overflow-hidden"
            style={{ background: '#0f172a', border: '1px solid #1e293b' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${ELO_PCT}%`,
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span className="text-[8px] font-mono whitespace-nowrap" style={{ color: '#334155' }}>
            {ELO_PCT}% → {ELO_NEXT}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function corner(v, h) {
  return {
    position: 'absolute',
    [v]: 0,
    [h]: 0,
    width: 9,
    height: 9,
    borderColor: 'rgba(245,158,11,0.55)',
    borderStyle: 'solid',
    borderWidth: v === 'top'
      ? h === 'left' ? '1px 0 0 1px' : '1px 1px 0 0'
      : h === 'left' ? '0 0 1px 1px' : '0 1px 1px 0',
  };
}