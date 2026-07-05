// src/components/dashboard/TacticalNav.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TABS = ['PROBLEMS', 'CONTESTS', 'DASHBOARD', 'MATCH HISTORY', 'BUG SQUASH'];

export function TacticalNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ping, setPing] = useState(14);

  // Simulate live ping jitter
  useEffect(() => {
    const id = setInterval(() => setPing(Math.floor(Math.random() * 9) + 10), 3500);
    return () => clearInterval(id);
  }, []);

  // Compute active tab from route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/practice')) return 'PROBLEMS';
    if (path.startsWith('/contests')) return 'CONTESTS';
    if (path === '/dashboard' || path === '/') return 'DASHBOARD';
    return 'DASHBOARD'; // Default fallback
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab) => {
    if (tab === 'PROBLEMS') {
      navigate('/practice');
    } else if (tab === 'CONTESTS') {
      navigate('/contests');
    } else if (tab === 'DASHBOARD') {
      navigate('/dashboard');
    } else {
      alert(`${tab} mode is currently locked. Complete active campaigns to unlock!`);
    }
  };

  const pingColor =
    ping < 20 ? '#10b981' :
      ping < 60 ? '#f59e0b' :
        '#ef4444';

  return (
    <div className="flex items-center justify-between gap-6 w-full">

      {/* ── Tab Bar ── */}
      <nav
        className="flex items-center px-1 py-1 rounded-md gap-0.5"
        style={{
          background: 'rgba(15,23,42,0.40)',
          border: '1px solid rgba(30,41,59,0.55)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              id={`nav-tab-${tab.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => handleTabClick(tab)}
              className="relative px-3 py-1.5 rounded text-[10px] font-mono font-semibold
                         uppercase tracking-widest transition-all duration-200"
              style={{
                color: active ? '#ffffff' : '#475569',
                background: active ? 'rgba(245,158,11,0.07)' : 'transparent',
                letterSpacing: '0.14em',
              }}
            >
              {tab}
              {/* Active underline */}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-px"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Telemetry HUD ── */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-mono tracking-wider flex-shrink-0"
        style={{
          background: 'rgba(15,23,42,0.60)',
          border: '1px solid rgba(30,41,59,0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Server status */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
          />
          <span style={{ color: '#64748b' }}>SERVER:</span>
          <span style={{ color: '#10b981' }}>ONLINE</span>
        </div>

        <Divider />

        {/* Ping */}
        <div className="flex items-center gap-1">
          <span style={{ color: '#64748b' }}>PING:</span>
          <span style={{ color: pingColor, transition: 'color 0.4s' }}>{ping}ms</span>
        </div>

        <Divider />

        {/* Region */}
        <div className="flex items-center gap-1">
          <span style={{ color: '#64748b' }}>REGION:</span>
          <span style={{ color: '#94a3b8' }}>IN_WEST</span>
        </div>
      </div>

    </div>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 12, background: '#1e293b', display: 'block' }} />;
}
