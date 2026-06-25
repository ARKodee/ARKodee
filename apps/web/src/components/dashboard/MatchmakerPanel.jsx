// src/components/dashboard/MatchmakerPanel.jsx
import React, { useState, useEffect } from 'react';

const MODES = ['1v1 Ranked', '2v2 Arena', 'Class Strike'];

export function MatchmakerPanel() {
  const [selectedMode, setSelectedMode] = useState('1v1 Ranked');
  const [isSearching, setIsSearching] = useState(false);
  const [elapsed, setElapsed]         = useState(0);

  /* Elapsed timer — runs only while searching */
  useEffect(() => {
    if (!isSearching) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isSearching]);

  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-2">

      {/* Section label */}
      <p
        className="text-[9px] font-mono uppercase tracking-[0.24em]"
        style={{ color: '#334155' }}
      >
        ▸ MATCHMAKING TERMINAL
      </p>

      {/* ── Mode Selector ── */}
      <div
        className="p-2.5 rounded-lg"
        style={{
          background: 'rgba(15,23,42,0.70)',
          border: '1px solid rgba(30,41,59,0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p
          className="text-[9px] font-mono uppercase tracking-widest mb-2"
          style={{ color: '#475569' }}
        >
          SELECT OPERATIONS MODE
        </p>

        <div className="grid grid-cols-3 gap-1.5">
          {MODES.map((mode) => {
            const active = selectedMode === mode;
            return (
              <button
                key={mode}
                id={`mode-btn-${mode.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => !isSearching && setSelectedMode(mode)}
                disabled={isSearching}
                className="relative py-2 rounded text-[9px] uppercase tracking-wider
                           font-bold transition-all duration-200 overflow-hidden"
                style={{
                  background: active
                    ? 'rgba(245,158,11,0.10)'
                    : 'rgba(2,6,23,0.60)',
                  border: active
                    ? '1px solid rgba(245,158,11,0.50)'
                    : '1px solid rgba(30,41,59,0.80)',
                  color:   active ? '#f59e0b' : '#475569',
                  cursor:  isSearching ? 'not-allowed' : 'pointer',
                  opacity: isSearching && !active ? 0.38 : 1,
                }}
              >
                {/* Active top accent */}
                {active && (
                  <span
                    className="absolute top-0 inset-x-0 h-px"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                    }}
                  />
                )}
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Master Launch Button ── */}
      <button
        id="launch-matchmaking-btn"
        onClick={() => setIsSearching((s) => !s)}
        className={`
          w-full py-4 rounded-xl font-black uppercase tracking-[0.2em]
          text-sm relative overflow-hidden transition-all duration-300
          ${isSearching ? 'animate-pulse' : ''}
        `}
        style={
          isSearching
            ? {
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.60)',
                color: '#ef4444',
                boxShadow:
                  '0 0 18px rgba(239,68,68,0.15), inset 0 0 24px rgba(239,68,68,0.06)',
              }
            : {
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: '1px solid rgba(245,158,11,0.55)',
                color: '#020617',
                boxShadow: '0 0 22px rgba(245,158,11,0.22)',
              }
        }
      >
        {/* Gloss sweep — idle only */}
        {!isSearching && (
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.10) 50%, transparent 70%)',
            }}
          />
        )}

        <span className="relative flex items-center justify-center gap-2">
          {isSearching ? (
            <>
              <span>❌</span>
              <span>CANCEL COMBAT SEARCH...</span>
              <span className="font-mono text-xs opacity-60">[{fmtTime(elapsed)}]</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>INITIALIZE MATCHMAKING</span>
            </>
          )}
        </span>
      </button>

      {/* ── Active-search status row ── */}
      {isSearching && (
        <div className="flex items-center gap-2 px-0.5">
          <span className="relative flex w-2 h-2">
            <span
              className="absolute inset-0 animate-ping rounded-full"
              style={{ background: 'rgba(239,68,68,0.4)' }}
            />
            <span
              className="relative block w-2 h-2 rounded-full"
              style={{ background: '#ef4444' }}
            />
          </span>
          <span
            className="text-[9px] font-mono tracking-widest"
            style={{ color: '#ef4444', opacity: 0.72 }}
          >
            SCANNING {selectedMode.toUpperCase()} LOBBIES...
          </span>
        </div>
      )}

    </div>
  );
}