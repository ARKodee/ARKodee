// apps/web/src/components/contests/ContestList.jsx
import React from 'react'
import { Users, Clock, Shield, KeyRound, GraduationCap, Check, ArrowRight, Trophy, Flame, CalendarClock, ArchiveRestore, Play } from 'lucide-react'
import './ContestList.css'

/**
 * Resolve the CTA button configuration based on contest runtime status and registration status
 */
const getCtaConfig = (contest) => {
  const status = contest.runtimeStatus || 'ended'
  const isRegistered = contest.is_registered

  if (status === 'upcoming' && !isRegistered) {
    return {
      text: 'Register Now',
      className: 'contest-card__action contest-card__action--register',
      icon: <ArrowRight />,
      disabled: false,
    }
  }

  if (status === 'upcoming' && isRegistered) {
    return {
      text: 'Registered',
      className: 'contest-card__action contest-card__action--registered',
      icon: <Check />,
      disabled: true,
    }
  }

  if (status === 'active') {
    return {
      text: isRegistered ? 'Enter Arena' : 'Register & Enter',
      className: `contest-card__action ${isRegistered ? 'contest-card__action--enter' : 'contest-card__action--register'}`,
      icon: isRegistered ? <Play /> : <ArrowRight />,
      disabled: false,
    }
  }

  // ended / past
  return {
    text: 'Virtual Practice',
    className: 'contest-card__action contest-card__action--practice',
    icon: <Trophy />,
    disabled: false,
  }
}

/**
 * Render dynamic badges based on contest properties
 */
const ContestBadges = ({ contest }) => {
  return (
    <div className="contest-card__badges">
      {contest.is_rated && (
        <span className="contest-card__badge contest-card__badge--rated">
          <Shield />
          Rated
        </span>
      )}
      {contest.access_code_required && (
        <span className="contest-card__badge contest-card__badge--pin">
          <KeyRound />
          PIN Required
        </span>
      )}
      {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
        <span className="contest-card__badge contest-card__badge--class">
          <GraduationCap />
          {contest.eligible_class_tier.replace('_', ' ')}
        </span>
      )}
    </div>
  )
}

/**
 * Format a date for display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Single Contest Card component
 */
function ContestCard({ contest, onSelectContest, onActionClick }) {
  const status = contest.runtimeStatus || 'ended'
  const cta = getCtaConfig(contest)

  const cardClass = `contest-card${
    status === 'active' ? ' contest-card--active' :
    status === 'upcoming' ? ' contest-card--upcoming' : ''
  }`

  return (
    <div
      onClick={() => onSelectContest(contest)}
      className={cardClass}
    >
      <div className="contest-card__info">
        <div className="contest-card__status-row">
          {status === 'active' && (
            <span className="contest-card__status-badge contest-card__status-badge--live">
              <span className="contest-card__ping" />
              LIVE MATCH
            </span>
          )}
          {status === 'upcoming' && (
            <span className="contest-card__status-badge contest-card__status-badge--upcoming">
              <CalendarClock />
              UPCOMING
            </span>
          )}
          {status === 'ended' && (
            <span className="contest-card__status-badge contest-card__status-badge--ended">
              <ArchiveRestore />
              ENDED
            </span>
          )}
        </div>

        <h3 className="contest-card__title">
          {contest.title}
        </h3>

        {contest.description && (
          <p className="contest-card__description">
            {contest.description}
          </p>
        )}

        <div className="contest-card__meta">
          <span className="contest-card__meta-item">
            <Clock />
            {formatDate(contest.start_time)}
          </span>
          <span className="contest-card__meta-item">
            <Users />
            {contest.participant_count ?? 0} participants
          </span>
          {contest.is_rated && (
            <span className="contest-card__badge contest-card__badge--rated">
              <Shield />
              Rated
            </span>
          )}
          {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
            <span className="contest-card__badge contest-card__badge--class">
              <GraduationCap />
              {contest.eligible_class_tier.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      <button
        disabled={cta.disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (!cta.disabled) onActionClick(contest)
        }}
        className={cta.className}
      >
        <span>{cta.text}</span>
        {cta.icon}
      </button>
    </div>
  )
}

/**
 * Grouped Section component
 */
function SectionBlock({ title, icon: Icon, colorClass, items, onSelectContest, onActionClick }) {
  if (!items || items.length === 0) return null

  return (
    <div className="contest-section">
      <div className="contest-section__header">
        <div className={`contest-section__icon ${colorClass}`}>
          <Icon />
        </div>
        <h2 className="contest-section__title">{title}</h2>
        <span className="contest-section__count">
          {items.length}
        </span>
      </div>

      <div className="contest-section__list">
        {items.map((contest) => (
          <ContestCard
            key={contest.id || contest.slug}
            contest={contest}
            onSelectContest={onSelectContest}
            onActionClick={onActionClick}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * ContestList Master Component
 */
export function ContestList({ contests, activeFilter, onSelectContest, onActionClick }) {
  if (!contests || contests.length === 0) {
    return (
      <div className="contest-empty">
        <Trophy />
        <p className="contest-empty__title">No contests available</p>
        <p className="contest-empty__description">Check back soon for upcoming matches!</p>
      </div>
    )
  }

  // Categorize contests dynamically
  const liveItems = contests.filter((c) => c.runtimeStatus === 'active')
  const upcomingItems = contests.filter((c) => c.runtimeStatus === 'upcoming')
  const pastItems = contests.filter((c) => c.runtimeStatus === 'ended')

  // Render based on activeFilter key
  if (activeFilter === 'live') {
    return (
      <SectionBlock
        title="Live Matches"
        icon={Flame}
        colorClass="contest-section__icon--live"
        items={liveItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />
    )
  }

  if (activeFilter === 'upcoming') {
    return (
      <SectionBlock
        title="Upcoming Contests"
        icon={CalendarClock}
        colorClass="contest-section__icon--upcoming"
        items={upcomingItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />
    )
  }

  if (activeFilter === 'past') {
    return (
      <SectionBlock
        title="Past Contests & Practice"
        icon={ArchiveRestore}
        colorClass="contest-section__icon--past"
        items={pastItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />
    )
  }

  // By default ('all' or 'all contests'), render all sections grouped on the same page
  return (
    <div>
      <SectionBlock
        title="Live Matches"
        icon={Flame}
        colorClass="contest-section__icon--live"
        items={liveItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />

      <SectionBlock
        title="Upcoming Contests"
        icon={CalendarClock}
        colorClass="contest-section__icon--upcoming"
        items={upcomingItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />

      <SectionBlock
        title="Past Contests & Practice"
        icon={ArchiveRestore}
        colorClass="contest-section__icon--past"
        items={pastItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />
    </div>
  )
}
