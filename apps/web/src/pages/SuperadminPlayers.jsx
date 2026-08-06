// src/pages/SuperadminPlayers.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  getAdminPlayersList,
  updateAdminPlayerRole,
  toggleAdminPlayerBan,
  toggleAdminPlayerFlag,
  adjustAdminPlayerRating,
} from '../lib/auth';
import { SuperadminNavbar } from '../components/layout/SuperadminNavbar';
import { Button }           from '../components/ui/Button';
import { Badge }            from '../components/ui/Badge';
import { Skeleton }         from '../components/ui/Skeleton';
import { Avatar }           from '../components/ui/Avatar';
import './SuperadminPlayers.css';

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
const IconSearch  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconShield  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconCrown   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/></svg>;
const IconFlag    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IconBan     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const IconEdit    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconUser    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconAlert   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

/* ─── Helper ─────────────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function SuperadminPlayers() {
  const { user: currentUser } = useAuth();

  const [players, setPlayers]   = useState([]);
  const [summary, setSummary]   = useState({ total: 0, competitors: 0, moderators: 0, superadmins: 0, banned: 0, flagged: 0 });
  const [loading, setLoading]   = useState(true);

  // Filters
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Drawers
  const [roleModalUser, setRoleModalUser]   = useState(null); // player obj
  const [selectedRole, setSelectedRole]   = useState('competitor');
  const [banModalUser, setBanModalUser]     = useState(null);
  const [flagModalUser, setFlagModalUser]   = useState(null);
  const [flagReason, setFlagReason]       = useState('');
  const [inspectUser, setInspectUser]       = useState(null);
  const [ratingModalUser, setRatingModalUser] = useState(null);
  const [ratingType, setRatingType]       = useState('contest');
  const [newRating, setNewRating]         = useState(1200);

  const [actioning, setActioning] = useState(false);
  const searchTimer = useRef(null);

  /* ── Fetch Players ───────────────────────────────────────────────────────────── */
  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPlayersList({
        search,
        role: roleFilter,
        status: statusFilter,
        page,
        pageSize: 15,
      });
      if (res) {
        setPlayers(res.results || []);
        setSummary(res.summary || summary);
        setTotalPages(res.total_pages || 1);
        setTotalCount(res.count || 0);
      }
    } catch {
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(searchTimer.current);
  }, [fetchPlayers]);

  /* ── Role Update ────────────────────────────────────────────────────────────── */
  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleModalUser || actioning) return;
    setActioning(true);
    try {
      const res = await updateAdminPlayerRole(roleModalUser.id, selectedRole);
      setRoleModalUser(null);
      if (inspectUser && inspectUser.id === roleModalUser.id) {
        setInspectUser((prev) => ({ ...prev, role: res.role || selectedRole }));
      }
      fetchPlayers();
    } catch (err) {
      alert(err?.message || err?.detail || 'Failed to update role.');
    } finally {
      setActioning(false);
    }
  };

  /* ── Ban / Unban Toggle ──────────────────────────────────────────────────────── */
  const handleBanToggle = async () => {
    if (!banModalUser || actioning) return;
    setActioning(true);
    try {
      const res = await toggleAdminPlayerBan(banModalUser.id);
      setBanModalUser(null);
      if (inspectUser && inspectUser.id === banModalUser.id) {
        setInspectUser((prev) => ({ ...prev, is_active: res.is_active }));
      }
      fetchPlayers();
    } catch (err) {
      alert(err?.message || err?.detail || 'Failed to update user status.');
    } finally {
      setActioning(false);
    }
  };

  /* ── Anti-Cheat Flag Toggle ─────────────────────────────────────────────────── */
  const handleFlagToggle = async (e) => {
    e.preventDefault();
    if (!flagModalUser || actioning) return;
    setActioning(true);
    try {
      const res = await toggleAdminPlayerFlag(flagModalUser.id, flagReason);
      setFlagModalUser(null);
      setFlagReason('');
      if (inspectUser && inspectUser.id === flagModalUser.id) {
        setInspectUser((prev) => ({
          ...prev,
          is_flagged: res.is_flagged,
          flag_reason: res.flag_reason,
        }));
      }
      fetchPlayers();
    } catch (err) {
      alert(err?.message || err?.detail || 'Failed to update Anti-Cheat flag.');
    } finally {
      setActioning(false);
    }
  };

  /* ── ELO Rating Adjust ──────────────────────────────────────────────────────── */
  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (!ratingModalUser || actioning) return;
    setActioning(true);
    try {
      const res = await adjustAdminPlayerRating(ratingModalUser.id, ratingType, newRating);
      setRatingModalUser(null);
      if (inspectUser && inspectUser.id === ratingModalUser.id) {
        setInspectUser((prev) => ({
          ...prev,
          contest_rating: res.contest_rating ?? prev.contest_rating,
          duel_rating: res.duel_rating ?? prev.duel_rating,
        }));
      }
      fetchPlayers();
    } catch (err) {
      alert(err?.message || err?.detail || 'Failed to adjust rating.');
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className="sap">
      {/* Top Navbar */}
      <SuperadminNavbar />

      <div className="sap__body">
        {/* Back link */}
        <Link to="/admin/dashboard" className="sap__back-link">← Back to Command Center</Link>

        {/* Page Header */}
        <div className="sap__header">
          <div>
            <h1 className="sap__title">Player Governance & Accounts</h1>
            <p className="sap__subtitle">
              Monitor competitors, manage staff permissions, enforce anti-cheat flags, and govern platform accounts.
            </p>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="sap__summary-grid">
          <div className="sap__sum-card">
            <span className="sap__sum-icon" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}><IconUser /></span>
            <div>
              <div className="sap__sum-val">{summary.total}</div>
              <div className="sap__sum-label">Total Accounts</div>
            </div>
          </div>
          <div className="sap__sum-card">
            <span className="sap__sum-icon" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}><IconShield /></span>
            <div>
              <div className="sap__sum-val">{summary.moderators + summary.superadmins}</div>
              <div className="sap__sum-label">Staff (Mods & Admins)</div>
            </div>
          </div>
          <div className="sap__sum-card">
            <span className="sap__sum-icon" style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}><IconBan /></span>
            <div>
              <div className="sap__sum-val" style={{ color: summary.banned > 0 ? 'var(--danger)' : 'inherit' }}>{summary.banned}</div>
              <div className="sap__sum-label">Banned Accounts</div>
            </div>
          </div>
          <div className="sap__sum-card">
            <span className="sap__sum-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}><IconFlag /></span>
            <div>
              <div className="sap__sum-val" style={{ color: summary.flagged > 0 ? '#eab308' : 'inherit' }}>{summary.flagged}</div>
              <div className="sap__sum-label">Anti-Cheat Flagged</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="sap__toolbar">
          <div className="sap__search-wrap">
            <span className="sap__search-icon"><IconSearch /></span>
            <input
              className="sap__search"
              type="text"
              placeholder="Search by username or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="sap__filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="competitor">Competitors</option>
            <option value="moderator">Moderators</option>
            <option value="superadmin">Superadmins</option>
          </select>
          <select className="sap__filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="banned">Banned Only</option>
            <option value="flagged">Flagged for Anti-Cheat</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="sap__table-wrap">
          <table className="sap__table">
            <thead>
              <tr>
                <th>Player Account</th>
                <th>Role Tier</th>
                <th>Status</th>
                <th>Contest ELO</th>
                <th>Duel ELO</th>
                <th>Stats (W/L/D)</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width="180px" /></td>
                  <td><Skeleton width="90px" /></td>
                  <td><Skeleton width="70px" /></td>
                  <td><Skeleton width="60px" /></td>
                  <td><Skeleton width="60px" /></td>
                  <td><Skeleton width="100px" /></td>
                  <td><Skeleton width="90px" /></td>
                  <td><Skeleton width="120px" /></td>
                </tr>
              ))}

              {!loading && players.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="sap__empty">
                      <div className="sap__empty-icon">👥</div>
                      <p className="sap__empty-title">No matching players found</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        Try clearing search terms or status filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && players.map((p) => {
                const isSelf = p.id === currentUser?.id;
                const totalGames = (p.total_wins || 0) + (p.total_losses || 0) + (p.total_draws || 0);
                const winRate = totalGames > 0 ? Math.round(((p.total_wins || 0) / totalGames) * 100) : 0;

                return (
                  <tr key={p.id} className={!p.is_active ? 'sap__row--banned' : p.is_flagged ? 'sap__row--flagged' : ''}>
                    <td>
                      <div className="sap__player-cell">
                        <Avatar name={p.username || 'User'} size="md" />
                        <div>
                          <div className="sap__player-name">
                            @{p.username} {isSelf && <span className="sap__self-badge">YOU</span>}
                          </div>
                          <div className="sap__player-email">{p.email || 'No email attached'}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      {p.role === 'superadmin' && (
                        <span className="sap__role-badge sap__role-badge--superadmin">
                          <IconCrown /> Superadmin
                        </span>
                      )}
                      {p.role === 'moderator' && (
                        <span className="sap__role-badge sap__role-badge--moderator">
                          <IconShield /> Moderator
                        </span>
                      )}
                      {p.role === 'competitor' && (
                        <span className="sap__role-badge sap__role-badge--competitor">
                          Competitor
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {p.is_active ? (
                          <span className="sap__status-badge sap__status-badge--active">✓ Active</span>
                        ) : (
                          <span className="sap__status-badge sap__status-badge--banned">🚫 Banned</span>
                        )}
                        {p.is_flagged && (
                          <span className="sap__status-badge sap__status-badge--flagged" title={p.flag_reason || 'Flagged for investigation'}>
                            🚩 Anti-Cheat
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{p.contest_rating}</strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--accent)' }}>{p.duel_rating}</strong>
                    </td>

                    <td>
                      <div style={{ fontSize: 'var(--text-xs)' }}>
                        <span style={{ color: 'var(--success)' }}>{p.total_wins}W</span> /{' '}
                        <span style={{ color: 'var(--danger)' }}>{p.total_losses}L</span> /{' '}
                        <span style={{ color: 'var(--text-muted)' }}>{p.total_draws}D</span>
                        <div style={{ fontSize: 'var(--text-nano)', color: 'var(--text-muted)' }}>
                          {winRate}% Win Rate ({p.streak > 0 ? `🔥${p.streak}` : '0'})
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {fmtDate(p.date_joined)}
                      </span>
                    </td>

                    <td>
                      <div className="sap__actions-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedRole(p.role); setRoleModalUser(p); }}
                          disabled={isSelf}
                          title="Change user role tier"
                          style={{ height: 26, fontSize: 'var(--text-nano)' }}
                        >
                          Role
                        </Button>
                        <Button
                          variant={p.is_active ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => setBanModalUser(p)}
                          disabled={isSelf}
                          style={{ height: 26, fontSize: 'var(--text-nano)' }}
                        >
                          {p.is_active ? 'Ban' : 'Unban'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setFlagReason(p.flag_reason || ''); setFlagModalUser(p); }}
                          style={{ height: 26, fontSize: 'var(--text-nano)', color: p.is_flagged ? '#eab308' : 'var(--text-muted)' }}
                          title="Toggle anti-cheat status"
                        >
                          <IconFlag />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectUser(p)}
                          style={{ height: 26, fontSize: 'var(--text-nano)' }}
                        >
                          Inspect
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="sap__pagination">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >← Prev</Button>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} &nbsp;·&nbsp; {totalCount} total players
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >Next →</Button>
          </div>
        )}

      </div>

      {/* ── MODAL: Change Role ────────────────────────────────────────────────── */}
      {roleModalUser && (
        <div className="sap-overlay" onClick={(e) => e.target === e.currentTarget && setRoleModalUser(null)}>
          <div className="sap-modal">
            <h3 className="sap-modal__title">Update Role for @{roleModalUser.username}</h3>
            <p className="sap-modal__sub">
              Changing permissions will update the user's staff level and platform access immediately.
            </p>
            <form onSubmit={handleRoleSubmit}>
              <div className="sap-modal__field">
                <label className="sap-modal__label">Select New Role Tier</label>
                <select className="sap-modal__select" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  <option value="competitor">Competitor (Standard player account)</option>
                  <option value="moderator">Moderator (Access to problem bank & contest creation)</option>
                  <option value="superadmin">Superadmin (Full platform control & change approval queue)</option>
                </select>
              </div>

              <div className="sap-modal__footer">
                <Button type="button" variant="secondary" size="sm" onClick={() => setRoleModalUser(null)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actioning}>Save New Role</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Ban / Unban ───────────────────────────────────────────────── */}
      {banModalUser && (
        <div className="sap-overlay" onClick={(e) => e.target === e.currentTarget && setBanModalUser(null)}>
          <div className="sap-modal">
            <div style={{ color: banModalUser.is_active ? 'var(--danger)' : 'var(--success)', marginBottom: 8 }}><IconAlert /></div>
            <h3 className="sap-modal__title">
              {banModalUser.is_active ? `Ban @${banModalUser.username}?` : `Unban @${banModalUser.username}?`}
            </h3>
            <p className="sap-modal__sub">
              {banModalUser.is_active
                ? `Banning @${banModalUser.username} will instantly revoke access to login, competitive duels, and scheduled contests.`
                : `Unbanning @${banModalUser.username} will restore normal access to login and competitive matches.`}
            </p>
            <div className="sap-modal__footer">
              <Button variant="secondary" size="sm" onClick={() => setBanModalUser(null)}>Cancel</Button>
              <Button
                variant={banModalUser.is_active ? 'danger' : 'primary'}
                size="sm"
                loading={actioning}
                onClick={handleBanToggle}
              >
                {banModalUser.is_active ? 'Confirm Ban' : 'Restore Account'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Anti-Cheat Flag ───────────────────────────────────────────── */}
      {flagModalUser && (
        <div className="sap-overlay" onClick={(e) => e.target === e.currentTarget && setFlagModalUser(null)}>
          <div className="sap-modal">
            <h3 className="sap-modal__title">
              {flagModalUser.is_flagged ? `Clear Anti-Cheat Flag for @${flagModalUser.username}` : `Flag @${flagModalUser.username} for Anti-Cheat Investigation`}
            </h3>
            <p className="sap-modal__sub">
              {flagModalUser.is_flagged
                ? `This will remove the suspicious flag tag from @${flagModalUser.username}'s account.`
                : `Flagging marks this player with a red investigation tag across staff dashboards.`}
            </p>
            {!flagModalUser.is_flagged && (
              <div className="sap-modal__field">
                <label className="sap-modal__label">Reason for Flagging (Optional)</label>
                <input
                  className="sap-modal__input"
                  placeholder="e.g., Abnormal 98% win rate or duplicate IP suspicion"
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                />
              </div>
            )}
            <div className="sap-modal__footer">
              <Button variant="secondary" size="sm" onClick={() => setFlagModalUser(null)}>Cancel</Button>
              <Button
                variant={flagModalUser.is_flagged ? 'secondary' : 'danger'}
                size="sm"
                loading={actioning}
                onClick={handleFlagToggle}
              >
                {flagModalUser.is_flagged ? 'Clear Flag' : 'Flag Account'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ELO Rating Adjust ─────────────────────────────────────────── */}
      {ratingModalUser && (
        <div className="sap-overlay" onClick={(e) => e.target === e.currentTarget && setRatingModalUser(null)}>
          <div className="sap-modal">
            <h3 className="sap-modal__title">Adjust ELO Rating for @{ratingModalUser.username}</h3>
            <form onSubmit={handleRatingSubmit}>
              <div className="sap-modal__field">
                <label className="sap-modal__label">Rating Category</label>
                <select className="sap-modal__select" value={ratingType} onChange={(e) => setRatingType(e.target.value)}>
                  <option value="contest">Contest Rating (Current: {ratingModalUser.contest_rating})</option>
                  <option value="duel">1v1 Duel Rating (Current: {ratingModalUser.duel_rating})</option>
                </select>
              </div>
              <div className="sap-modal__field">
                <label className="sap-modal__label">New Target Rating (100–3500)</label>
                <input
                  type="number"
                  className="sap-modal__input"
                  min={100}
                  max={3500}
                  value={newRating}
                  onChange={(e) => setNewRating(e.target.value)}
                />
              </div>
              <div className="sap-modal__footer">
                <Button type="button" variant="secondary" size="sm" onClick={() => setRatingModalUser(null)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actioning}>Update Rating</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DRAWER: Player Profile Deep-Dive Inspection ───────────────────────── */}
      {inspectUser && (
        <div className="sap-drawer-overlay" onClick={(e) => e.target === e.currentTarget && setInspectUser(null)}>
          <div className="sap-drawer">
            <div className="sap-drawer__header">
              <div>
                <h2 className="sap-drawer__title">Player Inspection</h2>
                <p className="sap-drawer__sub">Detailed performance profile for @{inspectUser.username}</p>
              </div>
              <button className="sap-drawer__close" onClick={() => setInspectUser(null)}>✕</button>
            </div>

            <div className="sap-drawer__body">
              <div className="sap-drawer__user-banner">
                <Avatar name={inspectUser.username} size="lg" />
                <div>
                  <h3 className="sap-drawer__user-name">@{inspectUser.username}</h3>
                  <p className="sap-drawer__user-email">{inspectUser.email || 'No email provided'}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span className={`sap-role-badge sap-role-badge--${inspectUser.role}`}>{inspectUser.role}</span>
                    <span className={`sap-status-badge sap-status-badge--${inspectUser.is_active ? 'active' : 'banned'}`}>
                      {inspectUser.is_active ? 'Active Account' : 'Banned'}
                    </span>
                  </div>
                </div>
              </div>

              {inspectUser.is_flagged && (
                <div className="sap-drawer__alert-box">
                  <strong>🚩 Anti-Cheat Flagged Account</strong>
                  <p style={{ marginTop: 4 }}>Reason: {inspectUser.flag_reason || 'Suspicious match activity'}</p>
                </div>
              )}

              <div className="sap-drawer__stats-grid">
                <div className="sap-drawer__stat-item">
                  <div className="sap-drawer__stat-val" style={{ color: 'var(--text-primary)' }}>{inspectUser.contest_rating}</div>
                  <div className="sap-drawer__stat-lbl">Contest ELO</div>
                </div>
                <div className="sap-drawer__stat-item">
                  <div className="sap-drawer__stat-val" style={{ color: 'var(--accent)' }}>{inspectUser.duel_rating}</div>
                  <div className="sap-drawer__stat-lbl">Duel ELO</div>
                </div>
                <div className="sap-drawer__stat-item">
                  <div className="sap-drawer__stat-val" style={{ color: 'var(--success)' }}>{inspectUser.total_wins}</div>
                  <div className="sap-drawer__stat-lbl">Total Wins</div>
                </div>
                <div className="sap-drawer__stat-item">
                  <div className="sap-drawer__stat-val" style={{ color: 'var(--danger)' }}>{inspectUser.total_losses}</div>
                  <div className="sap-drawer__stat-lbl">Total Losses</div>
                </div>
              </div>

              <div className="sap-drawer__section">
                <h4 className="sap-drawer__sec-title">Administrative Shortcut Controls</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setRatingType('contest'); setNewRating(inspectUser.contest_rating); setRatingModalUser(inspectUser); }}
                  >
                    ✏️ Override ELO Rating
                  </Button>
                  <Button
                    variant={inspectUser.is_flagged ? 'secondary' : 'danger'}
                    size="sm"
                    onClick={() => { setFlagReason(inspectUser.flag_reason || ''); setFlagModalUser(inspectUser); }}
                  >
                    🚩 {inspectUser.is_flagged ? 'Clear Anti-Cheat Flag' : 'Flag for Anti-Cheat'}
                  </Button>
                </div>
              </div>

              <div className="sap-drawer__section">
                <h4 className="sap-drawer__sec-title">Account Registration Info</h4>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  <div>Joined Platform: <strong>{fmtDate(inspectUser.date_joined)}</strong></div>
                  <div>Last Active Login: <strong>{fmtDate(inspectUser.last_login)}</strong></div>
                  <div>Staff Privileges: <strong>{inspectUser.is_staff ? 'Granted (is_staff=True)' : 'None (Regular)'}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
