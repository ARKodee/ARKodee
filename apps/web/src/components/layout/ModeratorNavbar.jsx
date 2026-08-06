// src/components/layout/ModeratorNavbar.jsx
// Purpose-built navbar for the Moderator panel.
// Completely separate from the competitor Navbar — different links, different identity badge.
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../store/ThemeContext';
import { getUserProfile, logoutUser } from '../../lib/auth';
import './ModeratorNavbar.css';

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
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
const IconShield = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);


export function ModeratorNavbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser]         = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const initial = (user?.username || user?.fullName || 'M')[0].toUpperCase();

  return (
    <header className="mod-navbar">
      <div className="mod-navbar__inner">

        {/* ── Logo — links to moderator home ─────────────────────────────── */}
        <Link to="/moderator/dashboard" className="mod-navbar__logo" aria-label="ARKodee Moderator home">
          <span className="mod-navbar__logo-icon">
            <IconCode />
          </span>
          <span className="mod-navbar__logo-name">ARKodee</span>
          {/* Moderator identity tag — clearly differentiates from player navbar */}
          <span className="mod-navbar__role-chip">
            <IconShield /> Moderator
          </span>
        </Link>

        {/* ── Right Actions ───────────────────────────────────────────────── */}
        <div className="mod-navbar__actions">

          {/* Theme toggle */}
          <button
            className="mod-navbar__theme-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>

          {/* User dropdown */}
          <div className="mod-navbar__user-wrap" ref={menuRef}>
            <button
              className="mod-navbar__user-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="Moderator account menu"
            >
              <span className="mod-navbar__avatar">{initial}</span>
              <span>{user?.username || user?.fullName || 'Moderator'}</span>
              <IconChevron />
            </button>

            {menuOpen && (
              <div className="mod-navbar__dropdown" role="menu">
                <div className="mod-navbar__dropdown-header">
                  <p className="mod-navbar__dropdown-username">{user?.username || user?.fullName || 'Moderator'}</p>
                  <p className="mod-navbar__dropdown-email">{user?.email || ''}</p>
                  <span className="mod-navbar__dropdown-role"><IconShield /> Moderator</span>
                </div>
                <button
                  className="mod-navbar__dropdown-item mod-navbar__dropdown-item--danger"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <IconLogOut /> Sign out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
