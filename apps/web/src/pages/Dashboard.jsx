// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { getUserProfile } from '../lib/auth';
import { Navbar }          from '../components/layout/Navbar';
import { DailyBugCard }    from '../components/dashboard/DailyBugCard';
import { GlobalLeaderboard } from '../components/dashboard/GlobalLeaderboard';
import { MatchmakerPanel } from '../components/dashboard/MatchmakerPanel';
import { Button }          from '../components/ui/Button';
import { Badge }           from '../components/ui/Badge';
import { Skeleton }        from '../components/ui/Skeleton';
import './Dashboard.css';
import '../components/dashboard/dashboard-widgets.css';

/* ── Icons ───────────────────────────────────────────────────────────────────── */
const IconBook    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
const IconSwords  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="21" x2="21" y2="7"/></svg>
const IconTrophy  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v2a6 6 0 0 0 6 6"/><path d="M17 4h3a2 2 0 0 1 2 2v2a6 6 0 0 1-6 6"/><rect x="7" y="2" width="10" height="11" rx="1"/></svg>
const IconFlame   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
const IconTarget  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
const IconCode    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
const IconArrow   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
const IconBug     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2"/><path d="M5 7l3 2"/><path d="M19 12h-4"/><path d="M5 12h4"/><path d="M19 17l-3-2"/><path d="M5 17l3-2"/><path d="M9 3h6"/></svg>

/* ── Activity feed data ─────────────────────────────────────────────────────── */
const SEED_FEED = [
  { ts: '21:14', msg: 'Nihar_X solved Two Sum in 4m 12s',          type: 'solve'   },
  { ts: '21:13', msg: 'Match #108 started — 1v1 Ranked',           type: 'match'   },
  { ts: '21:12', msg: 'Dharmil_07 reached Expert tier',            type: 'rank'    },
  { ts: '21:11', msg: 'Contest GRAPH_BRAWL — registration open',   type: 'contest' },
  { ts: '21:10', msg: 'Match #107 ended — 342 players online',     type: 'result'  },
  { ts: '21:09', msg: 'AlgoKing_99 solved Longest Substring',      type: 'solve'   },
  { ts: '21:08', msg: 'Ptr_Syntax promoted to Specialist',         type: 'rank'    },
];
const FEED_TEMPLATES = [
  { type: 'solve',   msg: 'RecurseKing solved Binary Search in 2m 44s' },
  { type: 'match',   msg: 'Match #109 started — 1v1 Ranked'             },
  { type: 'rank',    msg: 'Ptr_Syntax promoted to Specialist'            },
  { type: 'contest', msg: 'Contest TREE_ELITE — 42 joined'              },
  { type: 'result',  msg: 'Match #108 ended — Dharmil_07 MVP'           },
];
const FEED_COLORS = {
  solve: 'var(--success)', match: 'var(--accent)', rank: 'var(--warning)',
  contest: 'var(--info)', result: 'var(--text-secondary)',
};
function pad(n) { return String(n).padStart(2, '0'); }

/* ── Quick nav tiles ─────────────────────────────────────────────────────────── */
const NAV_TILES = [
  { to: '/practice',   icon: IconBook,   iconVariant: 'accent',  name: 'Practice',  desc: 'Solve problems and build problem-solving skills.' },
  { to: '/contests',   icon: IconTrophy, iconVariant: 'warning', name: 'Contests',  desc: 'Compete in rated and unrated coding contests.' },
  { to: '/matchmaking',icon: IconSwords, iconVariant: 'success', name: '1v1 Arena', desc: 'Challenge others in real-time ranked matches.'  },
];

/* ── Main Component ─────────────────────────────────────────────────────────── */
export function Dashboard() {
  const { user: authUser } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [feed, setFeed]         = useState(SEED_FEED);
  const feedRef = useRef(null);

  /* Fetch real user profile */
  useEffect(() => {
    let alive = true;
    getUserProfile()
      .then((d) => alive && (setProfile(d), setLoading(false)))
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  /* Live feed ticker */
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const ts  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const tpl = FEED_TEMPLATES[Math.floor(Math.random() * FEED_TEMPLATES.length)];
      setFeed((prev) => [{ ts, ...tpl }, ...prev].slice(0, 20));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [feed]);

  /* Derive display values */
  const username     = profile?.username || authUser?.username || authUser?.name || 'Coder';
  const rating       = profile?.contest_rating ?? 1200;
  const streak       = profile?.streak_count   ?? 0;
  const solved       = profile?.problems_solved ?? 0;
  const totalMatches = profile?.total_matches   ?? 0;
  const winRate      = profile?.win_rate != null ? `${Math.round(profile.win_rate)}%` : '—';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const STATS = [
    { label: 'Problems solved', value: solved,       icon: <IconCode />,   iconVariant: 'accent',  trend: '+12 this week', trendDir: 'up' },
    { label: 'Contest rating',  value: rating,       icon: <IconTarget />, iconVariant: 'warning', trend: 'Pupil',         trendDir: 'flat' },
    { label: 'Win rate',        value: winRate,      icon: <IconSwords />, iconVariant: 'success', trend: `${totalMatches} matches`,  trendDir: 'up' },
    { label: 'Day streak',      value: `${streak}d`, icon: <IconFlame />,  iconVariant: 'info',    trend: streak > 0 ? 'Keep it up!' : 'Start today', trendDir: streak > 0 ? 'up' : 'flat' },
  ];

  return (
    <div className="dash">
      <Navbar />

      <div className="dash__body">

        {/* ── Hero row ──────────────────────────────────────────────────────── */}
        <div className="dash__hero">
          <div className="dash__greeting">
            <span className="dash__greeting-label">{greeting}</span>
            {loading
              ? <Skeleton width="200px" height="var(--text-xl)" />
              : <h1 className="dash__greeting-name">{username}</h1>
            }
            <p className="dash__greeting-sub">Here's your overview for today.</p>
          </div>
          <div className="dash__hero-actions">
            <Button as={Link} to="/practice" variant="secondary">Practice</Button>
            <Button as={Link} to="/matchmaking" variant="primary">Find Match</Button>
          </div>
        </div>

        {/* ── Stat tiles ────────────────────────────────────────────────────── */}
        <div className="dash__stats">
          {STATS.map(({ label, value, icon, iconVariant, trend, trendDir }) => (
            <div key={label} className="dash-stat">
              <div className="dash-stat__top">
                <span className={`dash-stat__icon dash-stat__icon--${iconVariant}`}>{icon}</span>
                <span className={`dash-stat__trend dash-stat__trend--${trendDir}`}>{trend}</span>
              </div>
              {loading
                ? <Skeleton width="60px" height="var(--text-xl)" />
                : <span className="dash-stat__value">{value}</span>
              }
              <span className="dash-stat__label">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Quick navigation ──────────────────────────────────────────────── */}
        <div className="dash-nav-grid">
          {NAV_TILES.map(({ to, icon: Icon, iconVariant, name, desc }) => (
            <Link key={to} to={to} className="dash-nav-tile">
              <span className={`dash-nav-tile__icon dash-nav-tile__icon--${iconVariant}`}>
                <Icon />
              </span>
              <div>
                <p className="dash-nav-tile__name">{name}</p>
                <p className="dash-nav-tile__desc">{desc}</p>
              </div>
              <span className="dash-nav-tile__arrow"><IconArrow /></span>
            </Link>
          ))}
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────────── */}
        <div className="dash__grid">

          {/* Center column */}
          <div className="dash__main">

            {/* Daily bug bounty */}
            <div>
              <div className="dash-section__head">
                <span className="dash-section__title">
                  <IconBug style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  Daily Bug Bounty
                </span>
                <Badge variant="warning">Today</Badge>
              </div>
              <DailyBugCard />
            </div>

            {/* Live activity feed */}
            <div>
              <div className="dash-section__head">
                <span className="dash-section__title">Activity</span>
              </div>
              <div className="dash-feed">
                <div className="dash-feed__header">
                  <span className="dash-feed__title">Recent events</span>
                  <span className="dash-feed__live">
                    <span className="dash-feed__dot" />
                    Live
                  </span>
                </div>
                <div ref={feedRef} className="dash-feed__list">
                  {feed.map((item, i) => (
                    <div key={i} className="dash-feed__row" style={{ opacity: Math.max(0.35, 1 - i * 0.04) }}>
                      <span className="dash-feed__time">{item.ts}</span>
                      <span className="dash-feed__dot-type" style={{ background: FEED_COLORS[item.type] ?? 'var(--text-muted)' }} />
                      <span className="dash-feed__msg">{item.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="dash__sidebar">
            <MatchmakerPanel />
            <GlobalLeaderboard />
          </div>

        </div>
      </div>
    </div>
  );
}