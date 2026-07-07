// apps/web/src/components/contests/ContestList.jsx
import React from 'react'
import { Users, Clock, Shield, KeyRound, GraduationCap, Check, ArrowRight, Trophy, Flame, CalendarClock, ArchiveRestore, Play } from 'lucide-react'

/**
 * Resolve the CTA button configuration based on contest runtime status and registration status
 */
const getCtaConfig = (contest) => {
  const status = contest.runtimeStatus || 'ended'
  const isRegistered = contest.is_registered

  if (status === 'upcoming' && !isRegistered) {
    return {
      text: 'Register Now',
      className:
        'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]',
      icon: <ArrowRight className="w-3.5 h-3.5" />,
      disabled: false,
    }
  }

  if (status === 'upcoming' && isRegistered) {
    return {
      text: 'Registered',
      className:
        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default',
      icon: <Check className="w-3.5 h-3.5" />,
      disabled: true,
    }
  }

  if (status === 'active') {
    return {
      text: 'Enter Arena',
      className:
        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_24px_rgba(16,185,129,0.3)] animate-pulse',
      icon: <Play className="w-3.5 h-3.5 fill-current" />,
      disabled: false,
    }
  }

  // ended / past
  return {
    text: 'Virtual Practice',
    className:
      'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400 hover:shadow-[0_0_16px_rgba(245,158,11,0.2)]',
    icon: <Trophy className="w-3.5 h-3.5" />,
    disabled: false,
  }
}

/**
 * Render dynamic badges based on contest properties
 */
const ContestBadges = ({ contest }) => {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {contest.is_rated && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
          <Shield className="w-3 h-3" />
          Rated
        </span>
      )}
      {contest.access_code_required && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <KeyRound className="w-3 h-3" />
          PIN Required
        </span>
      )}
      {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <GraduationCap className="w-3 h-3" />
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

  const cardBorder =
    status === 'active'
      ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-[#111113]/90 to-[#111113]/90 shadow-[0_0_30px_rgba(16,185,129,0.04)] hover:border-emerald-400/50'
      : status === 'upcoming'
        ? 'border-indigo-500/20 bg-gradient-to-r from-indigo-950/15 via-[#111113]/90 to-[#111113]/90 hover:border-indigo-500/40'
        : 'border-zinc-800/80 bg-[#111113]/50 hover:border-zinc-700/60'

  return (
    <div
      onClick={() => onSelectContest(contest)}
      className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 ${cardBorder}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {status === 'active' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE MATCH
            </span>
          )}
          {status === 'upcoming' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <CalendarClock className="w-3 h-3 text-indigo-400" />
              UPCOMING
            </span>
          )}
          {status === 'ended' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-zinc-800/60 text-zinc-400 border border-zinc-700/40">
              <ArchiveRestore className="w-3 h-3 text-zinc-500" />
              ENDED
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-zinc-100 group-hover:text-white truncate mt-1">
          {contest.title}
        </h3>

        {contest.description && (
          <p className="text-xs text-zinc-500 line-clamp-1 mt-1 max-w-2xl font-normal font-mono">
            {contest.description}
          </p>
        )}

        <ContestBadges contest={contest} />

        <div className="flex items-center gap-5 mt-4 text-xs text-zinc-400 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            {formatDate(contest.start_time)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            {contest.participant_count ?? 0} participants
          </span>
        </div>
      </div>

      <button
        disabled={cta.disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (!cta.disabled) onActionClick(contest)
        }}
        className={`shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${cta.className}`}
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
    <div className="space-y-3.5 mb-8">
      <div className="flex items-center gap-2 px-1">
        <div className={`p-1.5 rounded-lg border ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-xs font-extrabold text-white tracking-widest uppercase">{title}</h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
          {items.length}
        </span>
      </div>

      <div className="grid gap-3.5">
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
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-zinc-800/80 bg-[#111113]/30 text-zinc-500">
        <Trophy className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-sm font-semibold text-zinc-300">No contests available</p>
        <p className="text-xs text-zinc-600 mt-1">Check back soon for upcoming matches!</p>
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
        colorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
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
        colorClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
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
        colorClass="bg-amber-500/10 text-amber-400 border-amber-500/30"
        items={pastItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />
    )
  }

  // By default ('all' or 'all contests'), render all sections grouped on the same page
  return (
    <div className="space-y-4">
      <SectionBlock
        title="Live Matches"
        icon={Flame}
        colorClass="bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        items={liveItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />

      <SectionBlock
        title="Upcoming Contests"
        icon={CalendarClock}
        colorClass="bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
        items={upcomingItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />

      <SectionBlock
        title="Past Contests & Practice"
        icon={ArchiveRestore}
        colorClass="bg-amber-500/10 text-amber-400 border-amber-500/30"
        items={pastItems}
        onSelectContest={onSelectContest}
        onActionClick={onActionClick}
      />
    </div>
  )
}
