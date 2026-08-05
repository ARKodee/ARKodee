// src/pages/ModeratorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { getUserProfile } from '../lib/auth';
import { getAdminRequestsList, approveAdminRequest } from '../lib/problems';
import { ModeratorNavbar }      from '../components/layout/ModeratorNavbar';
import { SuperadminNavbar }     from '../components/layout/SuperadminNavbar';
import { Button }              from '../components/ui/Button';
import { Skeleton }            from '../components/ui/Skeleton';
import { ContestOverviewCard } from '../components/moderator/ContestOverviewCard';
import { PlayerOverviewCard }  from '../components/moderator/PlayerOverviewCard';
import { ModStatCard }         from '../components/moderator/ModStatCard';
import './ModeratorDashboard.css';
import './SuperadminRequests.css';

/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const IconBook      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IconTrophy    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v2a6 6 0 0 0 6 6"/><path d="M17 4h3a2 2 0 0 1 2 2v2a6 6 0 0 1-6 6"/><rect x="7" y="2" width="10" height="11" rx="1"/></svg>;
const IconUsers     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconPlus      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconArrow     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconClipboard = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
const IconClock     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCrown     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/></svg>;

/* ─── Pending Requests Preview Card (Superadmin only) ────────────────────────── */
function PendingRequestsCard() {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const loadPending = async () => {
    try {
      const data = await getAdminRequestsList({ status: 'PENDING' });
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPending(); }, []);

  const handleQuickApprove = async (id) => {
    if (actioningId) return;
    setActioningId(id);
    try {
      await approveAdminRequest(id);
      await loadPending();
    } catch (e) {
      alert(e.message || 'Approval failed.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="mod-card">
      <div className="mod-card__header">
        <div className="mod-card__title-group">
          <h2 className="mod-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--warning)' }}>⏳</span> Pending Approvals
          </h2>
          <p className="mod-card__subtitle">Changes requested by moderators awaiting review.</p>
        </div>
        <Button as={Link} to="/admin/requests" variant="ghost" size="sm">
          View All ({requests.length}) <IconArrow />
        </Button>
      </div>

      <div className="mod-card__body">
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height="36px" />
            <Skeleton height="36px" />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            ✓ No pending requests. All moderator changes are up to date!
          </div>
        )}

        {!loading && requests.slice(0, 3).map((req) => (
          <div key={req.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', gap: 12
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`sa-badge sa-badge--${req.action.toLowerCase()}`}>{req.action}</span>
                <span className="sa-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{req.entity_type}</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                {req.title_preview}
              </p>
              <p style={{ fontSize: 'var(--text-nano)', color: 'var(--text-muted)' }}>
                by @{req.requested_by}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={actioningId === req.id}
              disabled={!!actioningId}
              onClick={() => handleQuickApprove(req.id)}
              style={{ flexShrink: 0, height: 28, fontSize: 'var(--text-xs)' }}
            >
              Approve
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Unified Staff Dashboard (Moderator & Superadmin) ───────────────────────── */
export function StaffDashboard() {
  const { user: authUser, isSuperadmin } = useAuth();
  const [profile, setProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getUserProfile()
      .then((d) => alive && (setProfile(d), setLoading(false)))
      .catch(() => alive && setLoading(false));

    if (isSuperadmin) {
      getAdminRequestsList({ status: 'PENDING' })
        .then((d) => alive && setPendingCount(Array.isArray(d) ? d.length : 0))
        .catch(() => {});
    }

    return () => { alive = false; };
  }, [isSuperadmin]);

  /* ── Role-based Nav Tiles ─────────────────────────────────────────────────── */
  const navTiles = isSuperadmin ? [
    { to: '/admin/requests',    icon: IconClock,   iconVariant: 'danger',  name: 'Approval Queue',    desc: 'Review and approve pending moderator changes.' },
    { to: '/admin/problems',    icon: IconBook,    iconVariant: 'accent',  name: 'Problem Bank',       desc: 'Manage, review & publish DSA problems.' },
    { to: '/admin/contests',    icon: IconTrophy,  iconVariant: 'warning', name: 'Contest Manager',    desc: 'Schedule and monitor coding contests.'  },
  ] : [
    { to: '/moderator/problems', icon: IconBook,    iconVariant: 'accent',  name: 'Problem Bank',       desc: 'Manage, review & publish DSA problems.' },
    { to: '/moderator/contests', icon: IconTrophy,  iconVariant: 'warning', name: 'Contest Manager',    desc: 'Schedule and monitor coding contests.'  },
    { to: '/moderator/players',  icon: IconUsers,   iconVariant: 'success', name: 'Player Management',  desc: 'View, flag, and monitor competitor accounts.' },
  ];

  /* ── Role-based Stats ─────────────────────────────────────────────────────── */
  const username = profile?.username ?? authUser?.username ?? authUser?.fullName ?? (isSuperadmin ? 'Superadmin' : 'Moderator');
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const stats = isSuperadmin ? [
    {
      label: 'Pending approvals',
      value: pendingCount,
      icon: <IconClock />,
      variant: 'danger',
      trend: 'Requires review',
      trendDir: pendingCount > 0 ? 'up' : 'flat',
    },
    {
      label: 'Problems managed',
      value: profile?.problems_managed ?? '—',
      icon: <IconBook />,
      variant: 'accent',
      trend: 'Total in bank',
      trendDir: 'flat',
    },
    {
      label: 'Contests hosted',
      value: profile?.contests_hosted ?? '—',
      icon: <IconTrophy />,
      variant: 'warning',
      trend: 'All time',
      trendDir: 'flat',
    },
    {
      label: 'Players monitored',
      value: profile?.total_players ?? '—',
      icon: <IconUsers />,
      variant: 'info',
      trend: 'Active community',
      trendDir: 'up',
    },
  ] : [
    {
      label: 'Problems managed',
      value: profile?.problems_managed ?? '—',
      icon: <IconBook />,
      variant: 'accent',
      trend: 'Total in bank',
      trendDir: 'flat',
    },
    {
      label: 'Contests hosted',
      value: profile?.contests_hosted ?? '—',
      icon: <IconTrophy />,
      variant: 'warning',
      trend: 'All time',
      trendDir: 'flat',
    },
    {
      label: 'Players monitored',
      value: profile?.total_players ?? '—',
      icon: <IconUsers />,
      variant: 'info',
      trend: 'Active community',
      trendDir: 'up',
    },
    {
      label: 'Submissions reviewed',
      value: profile?.submissions_reviewed ?? '—',
      icon: <IconClipboard />,
      variant: 'success',
      trend: 'Problem sets',
      trendDir: 'flat',
    },
  ];

  return (
    <div className="mod-dash">
      {/* Dynamic Navbar based on Role */}
      {isSuperadmin ? <SuperadminNavbar /> : <ModeratorNavbar />}

      <div className="mod-dash__body">

        {/* Dynamic Hero Banner */}
        <div
          className="mod-dash__hero"
          style={isSuperadmin ? { borderColor: 'var(--danger-border)', background: 'var(--bg-surface)' } : {}}
        >
          <div>
            <span className="mod-dash__greeting-label">{greeting}</span>
            {loading
              ? <Skeleton width="220px" height="var(--text-xl)" />
              : <h1 className="mod-dash__greeting-name">{username}</h1>
            }
            <p className="mod-dash__greeting-sub">
              {isSuperadmin
                ? 'Superadmin Command Center — Full platform control & approval queue.'
                : 'Your moderator command center.'
              }
            </p>
            <span
              className="mod-dash__role-badge"
              style={isSuperadmin ? { background: 'var(--danger-subtle)', color: 'var(--danger)', borderColor: 'var(--danger-border)' } : {}}
            >
              {isSuperadmin ? <><IconCrown /> Superadmin Tier</> : <><IconClipboard /> Moderator</>}
            </span>
          </div>

          <div className="mod-dash__hero-actions">
            {isSuperadmin && (
              <Button as={Link} to="/admin/requests" variant="danger" size="sm">
                <IconClock /> Review Requests ({pendingCount})
              </Button>
            )}
            <Button as={Link} to={isSuperadmin ? '/admin/problems' : '/moderator/problems'} variant="secondary" size="sm">
              <IconBook /> Problem Bank
            </Button>
            <Button as={Link} to={isSuperadmin ? '/admin/contests' : '/moderator/contests'} variant="primary" size="sm">
              <IconPlus /> New Contest
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mod-dash__stats">
          {stats.map(({ label, value, icon, variant, trend, trendDir }) => (
            <ModStatCard
              key={label}
              label={label}
              value={value}
              icon={icon}
              variant={variant}
              trend={trend}
              trendDir={trendDir}
              loading={loading}
            />
          ))}
        </div>

        {/* Quick Nav Tiles */}
        <div className="mod-dash__nav">
          {navTiles.map(({ to, icon: Icon, iconVariant, name, desc }) => (
            <Link key={to + name} to={to} className="mod-nav-tile">
              <span className={`mod-nav-tile__icon mod-nav-tile__icon--${iconVariant}`}>
                <Icon />
              </span>
              <div className="mod-nav-tile__text">
                <p className="mod-nav-tile__name">{name}</p>
                <p className="mod-nav-tile__desc">{desc}</p>
              </div>
              <span className="mod-nav-tile__arrow"><IconArrow /></span>
            </Link>
          ))}
        </div>

        {/* Content Cards Grid — 3 cols for Superadmin (adds Pending Requests Card), 2 cols for Moderator */}
        <div className={`mod-dash__grid${isSuperadmin ? '' : ' mod-dash__grid--2col'}`}>
          {isSuperadmin && <PendingRequestsCard />}
          <ContestOverviewCard />
          <PlayerOverviewCard />
        </div>

      </div>
    </div>
  );
}

/* ─── Backwards-compatible exports ───────────────────────────────────────────── */
export const ModeratorDashboard  = StaffDashboard;
export const SuperadminDashboard = StaffDashboard;
