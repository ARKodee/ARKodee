// src/pages/Dashboard.jsx
// ──────────────────────────────────────────────────────────────────────────────
// Master Canvas — structural coordinate management ONLY.
// No business logic, no data, no animation state lives here.
// Each imported panel owns its own state and data completely.
// ──────────────────────────────────────────────────────────────────────────────
import React from 'react';

import { ProfileHUD }       from '../components/dashboard/ProfileHUD';
import { TacticalNav }      from '../components/dashboard/TacticalNav';
import { ArenaShowcase }    from '../components/dashboard/ArenaShowcase';
import { LiveActivityLog }  from '../components/dashboard/LiveActivityLog';
import { GlobalLeaderboard} from '../components/dashboard/GlobalLeaderboard';
import { MatchmakerPanel }  from '../components/dashboard/MatchmakerPanel';

/* ── Ambient decorative constants — pure visual, no state ── */
const TICKER_ITEMS = [
  '⚡ MATCH #108 LIVE — Dharmil_07 vs Nihar_X',
  '▲ Ansh_Code promoted to ELITE tier',
  '● CONTEST: BINARY_STORM — Opens in 8 min',
  '⚠ SERVER MAINTENANCE: IN_EAST — 03:00 IST',
  '★ BUG SQUASH BOUNTY: +750 XP for HEAP_EXPLOIT',
  '⚡ MATCH #107 — Attackers win 13-9',
  '● 342 players online · Season 1 ends in 6 days',
];
const TICKER_DOUBLED = [...TICKER_ITEMS, ...TICKER_ITEMS];

const FOOTER_STATS = [
  { label: 'MATCHES TODAY', value: '7'    },
  { label: 'WIN STREAK',    value: '5'    },
  { label: 'XP EARNED',     value: '+840' },
  { label: 'QUEUED',        value: '342'  },
];

/* ── Dashboard ── */
export function Dashboard() {
  return (
    <div
      id="ark-dashboard"
      className="w-screen h-screen overflow-hidden select-none flex flex-col font-mono"
      style={{ background: '#020617', color: '#ffffff' }}
    >

      {/* ════════════════════════════════════════
          AMBIENT LAYER (fixed, pointer-events-none)
          ════════════════════════════════════════ */}

      {/* Scanline sweep */}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 animate-scan-line"
        style={{
          height: 3,
          background:
            'linear-gradient(transparent 0%, rgba(245,158,11,0.045) 50%, transparent 100%)',
        }}
      />

      {/* Dot-grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.018) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(245,158,11,0.018) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Amber bloom — bottom-left */}
      <div
        className="pointer-events-none fixed z-0"
        style={{
          bottom: -140, left: -100,
          width: 520, height: 520,
          background:
            'radial-gradient(circle, rgba(245,158,11,0.045) 0%, transparent 68%)',
        }}
      />

      {/* Red bloom — top-right */}
      <div
        className="pointer-events-none fixed z-0"
        style={{
          top: -100, right: -80,
          width: 420, height: 420,
          background:
            'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 68%)',
        }}
      />

      {/* ════════════════════════════════════════
          CONTENT STACK (relative z-10)
          ════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col h-full p-4 gap-3">

        {/* ━━━━━━━━━━━━━━━━━━━━
            1. HEADER LAYER
            ━━━━━━━━━━━━━━━━━━━━ */}
        <header className="flex-shrink-0 flex items-center gap-4">
          {/* Left: Profile HUD */}
          <ProfileHUD />

          {/* Center + Right: Tactical Nav bar + telemetry (TacticalNav owns both) */}
          <div className="flex-1 min-w-0">
            <TacticalNav />
          </div>
        </header>

        {/* ━━━━━━━━━━━━━━━━━━━━
            2. MAIN ARENA LAYER
            ━━━━━━━━━━━━━━━━━━━━ */}
        <main className="flex-1 grid grid-cols-12 gap-4 min-h-0">

          {/* Left buffer — intentionally empty (breathing room) */}
          <div className="col-span-3 hidden lg:block" aria-hidden="true" />

          {/* Center showcase + live feed */}
          <section
            className="col-span-12 lg:col-span-6 flex flex-col gap-3 min-h-0 justify-center"
            aria-label="Operator Arena"
          >
            <ArenaShowcase />
            <LiveActivityLog />
          </section>

          {/* Right — global leaderboard */}
          <aside
            className="col-span-12 lg:col-span-3 min-h-0 flex flex-col"
            aria-label="Global Leaderboard"
          >
            <GlobalLeaderboard />
          </aside>

        </main>

        {/* ━━━━━━━━━━━━━━━━━━━━
            3. FOOTER OPS ROW
            ━━━━━━━━━━━━━━━━━━━━ */}
        <footer className="flex-shrink-0 grid grid-cols-12 gap-4 items-end">

          {/* Matchmaker panel — bottom-left */}
          <div className="col-span-12 lg:col-span-4">
            <MatchmakerPanel />
          </div>

          {/* Center — decorative mini stat chips */}
          <div
            className="col-span-12 lg:col-span-5 hidden lg:flex items-end gap-5 pb-0.5"
            aria-label="Session Stats"
          >
            {FOOTER_STATS.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span
                  className="text-[8px] font-mono uppercase tracking-[0.2em]"
                  style={{ color: '#1e293b' }}
                >
                  {label}
                </span>
                <span
                  className="text-sm font-black tracking-wider"
                  style={{ color: '#334155' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Right spacer — reserved */}
          <div className="col-span-3 hidden lg:block" aria-hidden="true" />

        </footer>

        {/* ━━━━━━━━━━━━━━━━━━━━
            TICKER TAPE
            ━━━━━━━━━━━━━━━━━━━━ */}
        <div
          className="flex-shrink-0 overflow-hidden -mx-4 -mb-4"
          style={{ height: 22, borderTop: '1px solid rgba(30,41,59,0.50)' }}
          aria-hidden="true"
        >
          <div
            className="flex items-center gap-10 whitespace-nowrap animate-ticker h-full"
            style={{ willChange: 'transform' }}
          >
            {TICKER_DOUBLED.map((item, i) => (
              <span
                key={i}
                className="text-[9px] font-mono tracking-wider"
                style={{ color: i % 3 === 0 ? '#334155' : '#1e293b' }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}