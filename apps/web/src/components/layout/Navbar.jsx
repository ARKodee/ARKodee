// src/components/layout/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../store/ThemeContext';
import { getUserProfile, logoutUser } from '../../lib/auth';
import './Navbar.css';

/* Icons as minimal inline SVG so no extra dependency */
const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconLogOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconFlame = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);
const IconShield = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const NAV_LINKS = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Practice',  path: '/practice'  },
  { name: 'Contests',  path: '/contests'  },
  { name: '1v1 Arena', path: '/matchmaking' },
];

function getRatingTitle(rating = 1200) {
  if (rating >= 2100) return 'Grandmaster';
  if (rating >= 1900) return 'Master';
  if (rating >= 1600) return 'Expert';
  if (rating >= 1400) return 'Specialist';
  if (rating >= 1200) return 'Pupil';
  return 'Newbie';
}

export function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser]               = useState(null);
  const [menuOpen, setMenuOpen]       = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let alive = true;
    getUserProfile()
      .then((d) => alive && d && setUser(d))
      .catch(() => {});
    return () => { alive = false; };
  }, [location.pathname]);

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/auth');
  };

  const initial = (user?.username || 'U')[0].toUpperCase();
  const rating  = user?.contest_rating || 1200;
  const streak  = user?.streak_count   || 0;

  return (
    <header className="navbar">
      <div className="navbar__inner">

        {/* ── Logo ────────────────────────────────────────────────────────── */}
        <Link to="/dashboard" className="navbar__logo" aria-label="ARKodee home">
          <span className="navbar__logo-icon">
            <IconCode />
          </span>
          <span className="navbar__logo-name">ARKodee</span>
        </Link>

        {/* ── Nav Links ───────────────────────────────────────────────────── */}
        <nav className="navbar__nav" aria-label="Main navigation">
          {NAV_LINKS.map(({ name, path }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`navbar__link${isActive ? ' navbar__link--active' : ''}`}
              >
                {name}
              </Link>
            );
          })}
        </nav>

        {/* ── Right Actions ───────────────────────────────────────────────── */}
        <div className="navbar__actions">

          {/* Streak */}
          {streak > 0 && (
            <div className="navbar__stat" title="Daily streak">
              <IconFlame />
              <span>{streak}d</span>
            </div>
          )}

          {/* Rating */}
          <div className="navbar__stat" title={`Rating: ${rating}`}>
            <IconShield />
            <span>{getRatingTitle(rating)}</span>
          </div>

          {/* Theme toggle */}
          <button
            className="navbar__theme-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>

          {/* User menu */}
          <div className="navbar__user-wrap" ref={menuRef}>
            <button
              className="navbar__user-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="User menu"
            >
              <span className="navbar__avatar">{initial}</span>
              <span>{user?.username || 'Account'}</span>
              <IconChevron />
            </button>

            {menuOpen && (
              <div className="navbar__dropdown" role="menu">
                <div className="navbar__dropdown-header">
                  <p className="navbar__dropdown-username">{user?.username || 'User'}</p>
                  <p className="navbar__dropdown-email">{user?.email || ''}</p>
                </div>

                <button
                  className="navbar__dropdown-item navbar__dropdown-item--danger"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <IconLogOut />
                  Sign out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
