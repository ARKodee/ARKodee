// src/pages/ContestsDashboard.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useContestData } from '../hooks/useContestData'
import { ContestList } from '../components/contests/ContestList'
import { Leaderboard } from '../components/contests/Leaderboard'
import { Navbar } from '../components/layout/Navbar'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import './ContestsDashboard.css'

/* ── Icons ───────────────────────────────────────────────────────────────────── */
const IconSwords   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="21" x2="21" y2="7"/></svg>
const IconFlame    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
const IconClock    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconArchive  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
const IconKey      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>
const IconClose    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconShield   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>

const FILTER_TABS = [
  { key: 'all',      label: 'All',      icon: IconSwords  },
  { key: 'live',     label: 'Live',     icon: IconFlame   },
  { key: 'upcoming', label: 'Upcoming', icon: IconClock   },
  { key: 'past',     label: 'Past',     icon: IconArchive },
]

/* ── Registration Modal ─────────────────────────────────────────────────────── */
function RegistrationModal({ contest, onClose, onRegisterConfirm }) {
  const [accessCode, setAccessCode] = useState('')
  const [consent, setConsent]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]               = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!consent) { setErr('You must agree to the contest rules.'); return }
    setSubmitting(true)
    setErr('')
    try {
      await onRegisterConfirm(contest.id, accessCode)
      onClose()
    } catch (error) {
      setErr(error.message || 'Registration failed. Check your access PIN.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cd-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal__header">
          <div className="cd-modal__title-row">
            <h2 className="cd-modal__title">Contest Registration</h2>
            <span className="cd-modal__subtitle">{contest.title}</span>
          </div>
          <button className="cd-modal__close-btn" onClick={onClose} aria-label="Close dialog">
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleRegister} className="cd-modal__form">
          {err && <div className="cd-modal__error" role="alert">{err}</div>}

          <div className="cd-modal__meta">
            <div className="cd-modal__meta-item">
              <span className="cd-modal__meta-label">Access</span>
              <span className="cd-modal__meta-value">
                {contest.access_code_required ? 'Private (PIN Required)' : 'Public (Open)'}
              </span>
            </div>
            <div className="cd-modal__meta-item">
              <span className="cd-modal__meta-label">Rated</span>
              <span className="cd-modal__meta-value">
                {contest.is_rated ? <><IconShield /> Rated</> : 'Unrated'}
              </span>
            </div>
          </div>

          {contest.access_code_required && (
            <div className="cd-modal__input-group">
              <label htmlFor="reg-pin" className="cd-modal__input-label">Access PIN Code</label>
              <Input
                id="reg-pin"
                type="password"
                placeholder="Enter 4-digit PIN"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                maxLength={10}
                required
              />
            </div>
          )}

          <label className="cd-modal__checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="cd-modal__checkbox"
            />
            <span>I agree to follow the code of conduct, solve problems individually, and prevent plagiarism.</span>
          </label>

          <div className="cd-modal__actions">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={submitting}>Register</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */
export function ContestsDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('status') || 'all'

  const { contests, leaderboard, loading, error, handleRegister, fetchLeaderboard } = useContestData(activeFilter)
  const [registeringContest, setRegisteringContest] = useState(null)
  const stickyRef = useRef(null)

  useEffect(() => { fetchLeaderboard('global') }, [fetchLeaderboard])

  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    let lastScrollY = window.scrollY;
    let sidebarState = 'top'; // 'top' | 'sticky-bottom' | 'scrolling' | 'sticky-top'
    let currentTop = 0; // Relative top offset inside parent container in px

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const deltaY = scrollY - lastScrollY;
      lastScrollY = scrollY;

      if (deltaY === 0) return;

      const rect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const navbarHeight = 80;
      const margin = 16;
      const elHeight = rect.height;
      const parentHeight = parentRect.height;

      // If sidebar is shorter than viewport, stick it normally to top
      if (elHeight + navbarHeight + margin <= viewportHeight) {
        el.style.position = 'sticky';
        el.style.top = `${navbarHeight + margin}px`;
        el.style.bottom = 'auto';
        el.style.transform = 'none';
        return;
      }

      const parentPageTop = parentRect.top + scrollY;
      const maxTop = Math.max(0, parentHeight - elHeight);

      if (deltaY > 0) {
        // Scrolling DOWN
        if (sidebarState === 'sticky-top') {
          sidebarState = 'scrolling';
          currentTop = Math.max(0, scrollY + navbarHeight + margin - parentPageTop - deltaY);
          el.style.position = 'relative';
          el.style.top = `${currentTop}px`;
          el.style.bottom = 'auto';
          el.style.transform = 'none';
        } else if (sidebarState === 'top') {
          const bottomLimit = scrollY + viewportHeight - margin;
          if (bottomLimit >= parentPageTop + elHeight) {
            sidebarState = 'sticky-bottom';
            el.style.position = 'sticky';
            el.style.top = 'auto';
            el.style.bottom = `${margin}px`;
            el.style.transform = 'none';
          }
        } else if (sidebarState === 'scrolling') {
          const bottomLimit = scrollY + viewportHeight - margin;
          if (bottomLimit >= parentPageTop + currentTop + elHeight) {
            sidebarState = 'sticky-bottom';
            el.style.position = 'sticky';
            el.style.top = 'auto';
            el.style.bottom = `${margin}px`;
            el.style.transform = 'none';
          }
        }
      } else {
        // Scrolling UP
        if (sidebarState === 'sticky-bottom') {
          sidebarState = 'scrolling';
          currentTop = Math.min(maxTop, scrollY + viewportHeight - margin - elHeight - parentPageTop - deltaY);
          el.style.position = 'relative';
          el.style.top = `${currentTop}px`;
          el.style.bottom = 'auto';
          el.style.transform = 'none';
        } else if (sidebarState === 'scrolling') {
          const topLimit = scrollY + navbarHeight + margin;
          if (topLimit <= parentPageTop + currentTop) {
            sidebarState = 'sticky-top';
            el.style.position = 'sticky';
            el.style.top = `${navbarHeight + margin}px`;
            el.style.bottom = 'auto';
            el.style.transform = 'none';
          }
        } else if (sidebarState === 'sticky-top') {
          const topLimit = scrollY + navbarHeight + margin;
          if (topLimit <= parentPageTop) {
            sidebarState = 'top';
            el.style.position = 'relative';
            el.style.top = '0px';
            el.style.bottom = 'auto';
            el.style.transform = 'none';
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [contests, leaderboard]);

  const handleFilterChange    = (key) => setSearchParams({ status: key })
  const handleSelectContest   = (contest) => {
    const status = contest.runtimeStatus || 'ended'
    if (status === 'ended') return navigate(`/contests/${contest.slug}`)
    if (contest.is_registered && status === 'active') return navigate(`/contests/${contest.slug}/arena`)
    setRegisteringContest(contest)
  }
  const handleActionClick = (contest) => {
    const status = contest.runtimeStatus || 'ended'
    if (status === 'ended')  return navigate(`/contests/${contest.slug}/arena?virtual=true`)
    if (status === 'active' && contest.is_registered) return navigate(`/contests/${contest.slug}/arena`)
    setRegisteringContest(contest)
  }

  return (
    <div className="cd-db-page">
      <Navbar />

      <div className="cd-db-body">
        {/* Page title */}
        <div className="cd-db-page-header">
          <h1 className="cd-db-page-title">Contests</h1>
          <p className="cd-db-page-sub">Compete, rank, and conquer</p>
        </div>

        <div className="cd-db-grid">
          {/* Left — filter + list */}
          <section className="cd-db-main">
            {/* Filter tabs */}
            <div className="cd-db-filters">
              {FILTER_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`cd-db-filter-btn${activeFilter === key ? ' cd-db-filter-btn--active' : ''}`}
                  onClick={() => handleFilterChange(key)}
                >
                  <Icon /> {label}
                </button>
              ))}
            </div>

            {/* States */}
            {loading && (
              <div className="cd-db-center-state">
                <Spinner size="md" />
              </div>
            )}
            {error && !loading && (
              <EmptyState
                title="Failed to load contests"
                description={error}
                action={<Button variant="ghost" size="sm" onClick={() => handleFilterChange(activeFilter)}>Try again</Button>}
              />
            )}
            {!loading && !error && (
              <ContestList
                contests={contests}
                activeFilter={activeFilter}
                onSelectContest={handleSelectContest}
                onActionClick={handleActionClick}
              />
            )}
          </section>

          {/* Right — leaderboard */}
          <aside className="cd-db-side">
            <div className="cd-db-side-sticky" ref={stickyRef}>
              <Leaderboard leaderboard={leaderboard} title="Global ELO Standing" />
            </div>
          </aside>
        </div>
      </div>

      {registeringContest && (
        <RegistrationModal
          contest={registeringContest}
          onClose={() => setRegisteringContest(null)}
          onRegisterConfirm={async (id, code) => await handleRegister(id, code)}
        />
      )}
    </div>
  )
}
