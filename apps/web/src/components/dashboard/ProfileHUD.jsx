import React from 'react';
import { useAuth } from '../../store/AuthContext';

function getRatingTitle(rating = 0) {
  if (rating >= 2100) return 'Grandmaster';
  if (rating >= 1900) return 'Master';
  if (rating >= 1600) return 'Expert';
  if (rating >= 1400) return 'Specialist';
  if (rating >= 1200) return 'Pupil';
  return 'Newbie';
}

export function ProfileHUD({ user: propUser, stats: propStats }) {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;

  const username = (() => {
    if (!user) return 'Coder';
    const first = user.first_name || '';
    const last  = user.last_name || '';
    const full  = `${first} ${last}`.trim();
    if (full) return full;
    const fn = user.fullName || user.name;
    if (fn && !fn.includes('@')) return fn;
    const un = user.username;
    if (un && !un.includes('@')) return un;
    const email = user.email || un;
    if (email && email.includes('@')) {
      const raw = email.split('@')[0];
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    return 'Coder';
  })();

  const initial = username[0]?.toUpperCase() || 'U';
  const eloCurrent = propStats?.contest_rating ?? 1200;
  const eloNext = eloCurrent < 1400 ? 1400 : eloCurrent < 1600 ? 1600 : eloCurrent < 1900 ? 1900 : eloCurrent < 2100 ? 2100 : 2500;
  const eloPrev = eloCurrent < 1400 ? 1000 : eloCurrent < 1600 ? 1400 : eloCurrent < 1900 ? 1600 : eloCurrent < 2100 ? 1900 : 2100;
  const eloPct = Math.min(100, Math.max(5, Math.round(((eloCurrent - eloPrev) / (eloNext - eloPrev)) * 100)));
  const rankTitle = getRatingTitle(eloCurrent);

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
        {initial}
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
          {username}
        </span>

        {/* Rank line */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: '#64748b' }}>
            RANK:
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#ef4444' }}>
            {rankTitle}
          </span>
          <span className="text-[9px] font-mono" style={{ color: '#475569' }}>
            · {eloCurrent} ELO
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
                width: `${eloPct}%`,
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span className="text-[8px] font-mono whitespace-nowrap" style={{ color: '#334155' }}>
            {eloPct}% → {eloNext}
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