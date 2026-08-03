// src/pages/ContestsDashboard.jsx
import React, { useState, useEffect } from 'react'
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
    if (contest.access_code_required && !accessCode.trim()) { setErr('Enter the access PIN.'); return }
    setSubmitting(true); setErr('')
    try {
      await onRegisterConfirm(contest.id, accessCode)
      onClose()
    } catch (error) {
      setErr(error.message || 'Registration failed. Check access PIN.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="cd-modal-backdrop">
      <div className="cd-modal">
        {/* Header */}
        <div className="cd-modal__header">
          <div>
            <Badge variant="accent">Contest Registration</Badge>
            <h3 className="cd-modal__title">{contest.title}</h3>
          </div>
          <button className="cd-modal__close" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        {/* Info */}
        <div className="cd-modal__info">
          {contest.description && (
            <div className="cd-modal__section">
              <p className="cd-modal__section-title">About</p>
              <p className="cd-modal__section-body">{contest.description}</p>
            </div>
          )}
          <div className="cd-modal__meta-grid">
            <div className="cd-modal__meta-item">
              <span className="cd-modal__meta-label">Start Time</span>
              <span className="cd-modal__meta-value">{new Date(contest.start_time).toLocaleString()}</span>
            </div>
            <div className="cd-modal__meta-item">
              <span className="cd-modal__meta-label">Rated</span>
              <span className="cd-modal__meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {contest.is_rated ? <><IconShield /> Rated</> : 'Unrated'}
              </span>
            </div>
          </div>
          {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
            <p className="cd-modal__eligibility">
              Restricted to: <strong>{contest.eligible_class_tier.replace('_', ' ').toUpperCase()}</strong>
            </p>
          )}
        </div>

        {/* Form */}
        <form className="cd-modal__form" onSubmit={handleRegister}>
          {contest.access_code_required && (
            <Input
              label="Access PIN"
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter private access PIN"
              icon={<IconKey />}
              required
            />
          )}
          <label className="cd-modal__consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <span>I agree to ARKodee contest rules and will not engage in any collaborative assistance or code sharing.</span>
          </label>
          {err && <p className="cd-modal__err">{err}</p>}
          <div className="cd-modal__actions">
            <Button variant="secondary" type="button" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="primary" type="submit" loading={submitting} style={{ flex: 1 }}>
              Confirm Registration
            </Button>
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

  useEffect(() => { fetchLeaderboard('global') }, [fetchLeaderboard])

  const handleFilterChange    = (key) => setSearchParams({ status: key })
  const handleSelectContest   = (contest) => {
    const status = contest.runtimeStatus || 'ended'
    if (status === 'ended') return navigate(`/contests/${contest.slug}`)
    if (contest.is_registered && status === 'active') return navigate(`/contests/${contest.slug}/arena`)
    setRegisteringContest(contest)
  }
  const handleActionClick = (contest) => {
    const status = contest.runtimeStatus || 'ended'
    if (status === 'ended')  return navigate(`/contests/${contest.slug}`)
    if (status === 'active' && contest.is_registered) return navigate(`/contests/${contest.slug}/arena`)
    setRegisteringContest(contest)
  }

  return (
    <div className="cd-page">
      <Navbar />

      <div className="cd-body">
        {/* Page title */}
        <div className="cd-page-header">
          <h1 className="cd-page-title">Contests</h1>
          <p className="cd-page-sub">Compete, rank, and conquer</p>
        </div>

        <div className="cd-grid">
          {/* Left — filter + list */}
          <section className="cd-main">
            {/* Filter tabs */}
            <div className="cd-filters">
              {FILTER_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`cd-filter-btn${activeFilter === key ? ' cd-filter-btn--active' : ''}`}
                  onClick={() => handleFilterChange(key)}
                >
                  <Icon /> {label}
                </button>
              ))}
            </div>

            {/* States */}
            {loading && (
              <div className="cd-center-state">
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
          <aside className="cd-side">
            <div className="cd-side-sticky">
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
