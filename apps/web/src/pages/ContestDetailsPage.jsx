// src/pages/ContestDetailsPage.jsx
// Contest Details Page — contest information and problem list
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Shield,
  GraduationCap,
  Hash,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trophy,
} from 'lucide-react';
import { getContestDetails, startVirtualContest, getContestLeaderboard, registerForContest } from '../lib/contests';
import { Leaderboard } from '../components/contests/Leaderboard';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../store/AuthContext';
import './ContestDetailsPage.css';

// ─── Helper Functions ──────────────────────────────────────────────────────────
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeLabel = (startTime, endTime) => {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (now < start) {
    const diff = start - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return { label: `Starts in ${hours}h ${mins}m`, status: 'upcoming' };
  }
  if (now >= start && now <= end) {
    const diff = end - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return { label: `${hours}h ${mins}m remaining`, status: 'active' };
  }
  return { label: 'Contest ended', status: 'ended' };
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function ContestDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('problems');
  const [registering, setRegistering] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [personalResult, setPersonalResult] = useState(null);
  const sidebarRef = useRef(null);

  const handleDetailRegister = async () => {
    if (contest?.access_code_required && !pinCode.trim()) {
      setShowPinInput(true);
      return;
    }
    setRegistering(true);
    setPinError('');
    try {
      await registerForContest(slug, pinCode);
      setContest((prev) => ({ ...prev, is_registered: true }));
      setShowPinInput(false);
    } catch (err) {
      setPinError(err.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  // Fetch personal result if registered
  useEffect(() => {
    if (contest && contest.is_registered && user) {
      getContestLeaderboard(slug)
        .then((data) => {
          const entry = data?.find((e) => e.username === user.username);
          if (entry) setPersonalResult(entry);
        })
        .catch((err) => console.warn('Failed to load personal result:', err));
    }
  }, [contest, slug, user]);

  // Sticky sidebar effect
  useEffect(() => {
    const el = sidebarRef.current;
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
        } else if (sidebarState === 'top') {
          const bottomLimit = scrollY + viewportHeight - margin;
          if (bottomLimit >= parentPageTop + elHeight) {
            sidebarState = 'sticky-bottom';
            el.style.position = 'sticky';
            el.style.top = 'auto';
            el.style.bottom = `${margin}px`;
          }
        } else if (sidebarState === 'scrolling') {
          const bottomLimit = scrollY + viewportHeight - margin;
          if (bottomLimit >= parentPageTop + currentTop + elHeight) {
            sidebarState = 'sticky-bottom';
            el.style.position = 'sticky';
            el.style.top = 'auto';
            el.style.bottom = `${margin}px`;
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
        } else if (sidebarState === 'scrolling') {
          const topLimit = scrollY + navbarHeight + margin;
          if (topLimit <= parentPageTop + currentTop) {
            sidebarState = 'sticky-top';
            el.style.position = 'sticky';
            el.style.top = `${navbarHeight + margin}px`;
            el.style.bottom = 'auto';
          }
        } else if (sidebarState === 'sticky-top') {
          const topLimit = scrollY + navbarHeight + margin;
          if (topLimit <= parentPageTop) {
            sidebarState = 'top';
            el.style.position = 'relative';
            el.style.top = '0px';
            el.style.bottom = 'auto';
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
  }, [contest, activeTab, leaderboard]);

  // Fetch leaderboard when standings tab is active
  useEffect(() => {
    if (activeTab === 'standings' && leaderboard.length === 0) {
      let cancelled = false;
      const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
          const data = await getContestLeaderboard(slug);
          if (!cancelled) setLeaderboard(data || []);
        } catch (err) {
          console.warn('Failed to load standings:', err);
        } finally {
          if (!cancelled) setLeaderboardLoading(false);
        }
      };
      fetchLeaderboard();
      return () => { cancelled = true; };
    }
  }, [activeTab, slug, leaderboard.length]);

  // Fetch contest details
  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getContestDetails(slug);
        if (!cancelled) setContest(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Contest details could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetails();
    return () => { cancelled = true; };
  }, [slug]);

  // Get virtual session status
  const getVirtualSessionStatus = () => {
    if (!contest) return { active: false };
    const storageKey = `virtual_start_${slug}`;
    const startTimeStr = localStorage.getItem(storageKey);
    if (!startTimeStr) return { active: false };

    const startTime = parseInt(startTimeStr, 10);
    const durationMs = new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime();
    const isExpired = startTime + durationMs <= Date.now();

    return { active: !isExpired, startTime };
  };

  const sessionStatus = getVirtualSessionStatus();

  // Handle virtual contest start
  const handleStartVirtual = async () => {
    setVirtualLoading(true);
    try {
      await startVirtualContest(slug);
      // Clear any stale localStorage data so Arena gets a fresh timer
      localStorage.removeItem(`virtual_start_${slug}`);
      if (contest && contest.problems) {
        const languagesList = ['python', 'cpp', 'java', 'javascript'];
        contest.problems.forEach((p) => {
          languagesList.forEach((lang) => {
            localStorage.removeItem(`contest_draft_${slug}_${p.slug}_${lang}`);
          });
        });
      }
      navigate(`/contests/${slug}/arena?virtual=true`);
    } catch (err) {
      // startVirtualContest may return 400 if already started — still allow entry
      navigate(`/contests/${slug}/arena?virtual=true`);
    } finally {
      setVirtualLoading(false);
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="cd-root">
        <div className="cd-loading">
          <Loader2 size={24} className="cd-loading-spinner" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cd-root">
        <div className="cd-error">
          <AlertCircle size={32} className="cd-error-icon" />
          <p className="cd-error-message">{error}</p>
          <button className="cd-error-btn" onClick={() => navigate('/contests')}>
            Back to Contests
          </button>
        </div>
      </div>
    );
  }

  if (!contest) return null;

  const timeInfo = getTimeLabel(contest.start_time, contest.end_time);
  const problems = contest.problems || [];

  // Status badge class
  let statusClass = 'cd-status cd-status--ended';
  if (timeInfo.status === 'upcoming') statusClass = 'cd-status cd-status--upcoming';
  else if (timeInfo.status === 'active') statusClass = 'cd-status cd-status--active';

  return (
    <div className="cd-root">
      <Navbar />
      {/* Page header — back button + title + status */}
      <header className="cd-header">
        <div className="cd-header-left">
          <button className="cd-back-btn" onClick={() => navigate('/contests')}>
            <ArrowLeft size={14} />
            <span>Contests</span>
          </button>
          <span className="cd-header-sep" />
          <h1 className="cd-title">{contest.title}</h1>
        </div>
        <div className={statusClass}>
          <Clock size={14} />
          <span>{timeInfo.label}</span>
        </div>
      </header>

      <div className="cd-body">
        <div className="cd-grid">
          {/* Left Column: Main Info, Tabs, Problems/Standings */}
          <main className="cd-main">
            {/* Personal Performance Summary */}
            {personalResult && (
              <div className="cd-personal-card">
                <div className="cd-personal-header">
                  <Trophy className="cd-personal-trophy" size={18} />
                  <span className="cd-personal-title">Your Participation Summary</span>
                </div>
                <div className="cd-personal-stats">
                  <div className="cd-personal-stat">
                    <span className="cd-personal-stat-label">Rank</span>
                    <span className="cd-personal-stat-value">#{personalResult.rank}</span>
                  </div>
                  <div className="cd-personal-stat">
                    <span className="cd-personal-stat-label">Score</span>
                    <span className="cd-personal-stat-value">{personalResult.total_score ?? personalResult.score ?? 0} pts</span>
                  </div>
                  <div className="cd-personal-stat">
                    <span className="cd-personal-stat-label">Penalty</span>
                    <span className="cd-personal-stat-value">{personalResult.penalty_minutes ?? personalResult.penalty ?? 0}m</span>
                  </div>
                  {personalResult.elo_change !== undefined && (
                    <div className="cd-personal-stat">
                      <span className="cd-personal-stat-label">Rating Change</span>
                      <span className={`cd-personal-stat-value ${personalResult.elo_change >= 0 ? 'cd-rating-up' : 'cd-rating-down'}`}>
                        {personalResult.elo_change >= 0 ? `+${personalResult.elo_change}` : personalResult.elo_change}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description Card */}
            {contest.description && (
              <div className="cd-card">
                <h2 className="cd-card-header-title">About the Contest</h2>
                <p className="cd-card-body">{contest.description}</p>
              </div>
            )}

            {/* Tabs (for ended contests) */}
            {timeInfo.status === 'ended' && (
              <div className="cd-tabs-wrapper">
                <div className="cd-tabs">
                  <button
                    className={`cd-tab ${activeTab === 'problems' ? 'cd-tab--active' : ''}`}
                    onClick={() => setActiveTab('problems')}
                  >
                    Problems
                  </button>
                  <button
                    className={`cd-tab ${activeTab === 'standings' ? 'cd-tab--active' : ''}`}
                    onClick={() => setActiveTab('standings')}
                  >
                    Standings
                  </button>
                </div>
              </div>
            )}

            {/* Problems or Standings */}
            {activeTab === 'problems' ? (
              <div className="cd-problem-table">
                <div className="cd-problem-header">
                  <span className="cd-problem-header-cell">#</span>
                  <span className="cd-problem-header-cell">Title</span>
                  <span className="cd-problem-header-cell cd-problem-header-cell--right">Points</span>
                </div>
                {problems.length === 0 ? (
                  <div className="cd-empty">
                    <Hash size={32} />
                    <p className="cd-empty-text">Problems are only visible during active matches</p>
                  </div>
                ) : (
                  problems.map((problem, idx) => (
                    <div
                      key={problem.id || idx}
                      className={`cd-problem-row ${timeInfo.status === 'ended' ? 'cd-problem-row--clickable' : ''}`}
                      onClick={() => {
                        if (timeInfo.status === 'ended') {
                          navigate(`/practice/problems/${problem.slug}`, {
                            state: { fromContest: slug }
                          });
                        }
                      }}
                    >
                      <span className="cd-problem-index">
                        {String.fromCharCode(65 + (problem.order_index ?? idx))}
                      </span>
                      <div className="cd-problem-cell">
                        <span className="cd-problem-title">{problem.title}</span>
                        {timeInfo.status === 'ended' && (
                          <ChevronRight size={14} className="cd-problem-arrow" />
                        )}
                      </div>
                      <span className="cd-problem-points">{problem.points ?? '—'}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="cd-leaderboard">
                {leaderboardLoading ? (
                  <div className="cd-loading">
                    <Loader2 size={24} className="cd-loading-spinner" />
                  </div>
                ) : (
                  <Leaderboard
                    leaderboard={leaderboard.map((entry) => ({
                      username: entry.username,
                      score: entry.total_score,
                      penalty: entry.penalty_minutes,
                      rank: entry.rank,
                      elo_shift: entry.elo_change,
                    }))}
                    title="Contest Leaderboard"
                  />
                )}
              </div>
            )}
          </main>

          {/* Right Column: Metadata Sidebar */}
          <aside className="cd-sidebar" ref={sidebarRef}>
            {/* Live / Upcoming Registration & Arena Access Box */}
            {timeInfo.status !== 'ended' && (
              <div className="cd-virtual-box">
                <div className="cd-virtual-box-content">
                  <span className="cd-virtual-box-title">
                    {timeInfo.status === 'active' ? '⚡ Live Match' : '📅 Upcoming Match'}
                  </span>
                  <p className="cd-virtual-box-desc">
                    {contest.is_registered
                      ? timeInfo.status === 'active'
                        ? 'You are registered for this live match! Enter the arena now.'
                        : 'You are registered! Match will start when the timer hits 00:00.'
                      : timeInfo.status === 'active'
                        ? 'This match is currently live. Register now to participate and solve problems.'
                        : 'Register now to secure your spot in this upcoming contest.'}
                  </p>
                </div>

                {pinError && (
                  <div style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '8px' }}>
                    {pinError}
                  </div>
                )}

                {showPinInput && !contest.is_registered && (
                  <input
                    type="password"
                    placeholder="Enter 4-digit PIN"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      marginBottom: '10px',
                    }}
                  />
                )}

                {contest.is_registered ? (
                  timeInfo.status === 'active' ? (
                    <button
                      className="cd-btn cd-btn--primary"
                      onClick={() => navigate(`/contests/${slug}/arena`)}
                    >
                      <Trophy size={16} />
                      <span>Enter Arena</span>
                    </button>
                  ) : (
                    <div style={{ padding: '8px', background: 'var(--success-subtle)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontWeight: 600, textAlign: 'center', fontSize: '13px' }}>
                      ✓ Registered
                    </div>
                  )
                ) : (
                  <button
                    className="cd-btn cd-btn--primary"
                    onClick={handleDetailRegister}
                    disabled={registering}
                  >
                    {registering ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trophy size={16} />
                    )}
                    <span>
                      {timeInfo.status === 'active' ? 'Register & Enter' : 'Register Now'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Virtual Practice Box (for ended contests) */}
            {timeInfo.status === 'ended' && (
              <div className="cd-virtual-box">
                <div className="cd-virtual-box-content">
                  <span className="cd-virtual-box-title">Virtual Practice Mode</span>
                  <p className="cd-virtual-box-desc">
                    {sessionStatus.active
                      ? 'You have an active virtual simulation running. Resume the contest to continue coding.'
                      : 'This contest has ended. Start a virtual simulation to solve problems under simulated exam conditions.'}
                  </p>
                </div>
                <button
                  className="cd-btn cd-btn--primary"
                  onClick={handleStartVirtual}
                  disabled={virtualLoading}
                >
                  {virtualLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trophy size={16} />
                  )}
                  <span>{sessionStatus.active ? 'Resume Contest' : 'Start Practice'}</span>
                </button>
              </div>
            )}

            {/* Sidebar Meta widget */}
            <div className="cd-sidebar-widget">
              <h2 className="cd-widget-title">Contest Information</h2>
              <div className="cd-widget-list">
                <div className="cd-widget-item">
                  <div className="cd-widget-item-left">
                    <Calendar size={15} />
                    <span className="cd-widget-label">Start Time</span>
                  </div>
                  <span className="cd-widget-value">{formatDateTime(contest.start_time)}</span>
                </div>
                <div className="cd-widget-item">
                  <div className="cd-widget-item-left">
                    <Clock size={15} />
                    <span className="cd-widget-label">End Time</span>
                  </div>
                  <span className="cd-widget-value">{formatDateTime(contest.end_time)}</span>
                </div>
                <div className="cd-widget-item">
                  <div className="cd-widget-item-left">
                    <Users size={15} />
                    <span className="cd-widget-label">Registrants</span>
                  </div>
                  <span className="cd-widget-value">{contest.participant_count ?? 0} coders</span>
                </div>
                <div className="cd-widget-item">
                  <div className="cd-widget-item-left">
                    <Shield size={15} />
                    <span className="cd-widget-label">Rating Status</span>
                  </div>
                  <span className={`cd-widget-badge ${contest.is_rated ? 'cd-widget-badge--rated' : 'cd-widget-badge--unrated'}`}>
                    {contest.is_rated ? 'Rated' : 'Unrated'}
                  </span>
                </div>
                {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
                  <div className="cd-widget-item">
                    <div className="cd-widget-item-left">
                      <GraduationCap size={15} />
                      <span className="cd-widget-label">Eligibility</span>
                    </div>
                    <span className="cd-widget-badge cd-widget-badge--eligible">
                      {contest.eligible_class_tier.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Scoring Rules widget */}
            <div className="cd-sidebar-widget">
              <h2 className="cd-widget-title">Scoring Rules ({contest.scoring_mode || 'ICPC'})</h2>
              <p className="cd-widget-desc">
                {contest.scoring_mode === 'codeforces' ? (
                  <>
                    Time-based Penalty Engine (ACM-ICPC Style).
                    Penalty = (T_elapsed - T_start) + (Wrong attempts × 20 minutes) for accepted solutions.
                    Only fully correct submissions yield score points.
                  </>
                ) : (
                  <>
                    LeetCode score rules apply.
                    Speed and point allocation per problem.
                    Penalty of 5-10 minutes per wrong submission on eventually accepted problems.
                  </>
                )}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default ContestDetailsPage;