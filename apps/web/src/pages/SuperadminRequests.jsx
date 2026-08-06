// src/pages/SuperadminRequests.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getAdminRequestsList,
  approveAdminRequest,
  rejectAdminRequest,
} from '../lib/problems';
import { SuperadminNavbar } from '../components/layout/SuperadminNavbar';
import { Button }           from '../components/ui/Button';
import { Skeleton }         from '../components/ui/Skeleton';
import './SuperadminRequests.css';

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function SuperadminRequests() {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'

  const [rejecting, setRejecting]     = useState(null); // request obj
  const [reason, setReason]           = useState('');
  const [actioningId, setActioningId] = useState(null);

  /* ── Fetch ──────────────────────────────────────────────────────────────────── */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminRequestsList({ status: 'ALL' });
      setAllRequests(Array.isArray(data) ? data : []);
    } catch {
      setAllRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  /* ── Counts & Filtering ─────────────────────────────────────────────────────── */
  const counts = {
    PENDING:  allRequests.filter((r) => r.status === 'PENDING').length,
    APPROVED: allRequests.filter((r) => r.status === 'APPROVED').length,
    REJECTED: allRequests.filter((r) => r.status === 'REJECTED').length,
    ALL:      allRequests.length,
  };

  const displayedRequests = allRequests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  /* ── Approve ────────────────────────────────────────────────────────────────── */
  const handleApprove = async (id) => {
    if (actioningId) return;
    setActioningId(id);
    try {
      await approveAdminRequest(id);
      await fetchRequests();
    } catch (err) {
      alert(err.message || 'Approve failed.');
    } finally {
      setActioningId(null);
    }
  };

  /* ── Reject ─────────────────────────────────────────────────────────────────── */
  const handleRejectConfirm = async () => {
    if (!rejecting || actioningId) return;
    setActioningId(rejecting.id);
    try {
      await rejectAdminRequest(rejecting.id, reason);
      setRejecting(null);
      setReason('');
      await fetchRequests();
    } catch (err) {
      alert(err.message || 'Reject failed.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="sa-reqs">
      {/* Dynamic Superadmin Navbar */}
      <SuperadminNavbar />

      <div className="sa-reqs__body">

        {/* Header */}
        <div className="sa-reqs__header">
          <div>
            <h1 className="sa-reqs__title">Moderator Change Requests</h1>
            <p className="sa-reqs__subtitle">Review, approve, or reject proposed problem and contest modifications from moderators.</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="sa-reqs__tabs">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
            <button
              key={s}
              className={`sa-reqs__tab${statusFilter === s ? ' sa-reqs__tab--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'PENDING' ? '⏳ Pending Approval' : s.charAt(0) + s.slice(1).toLowerCase()}
              <span className="sa-reqs__count">
                {counts[s] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="sa-reqs__list">
          {loading && [...Array(3)].map((_, i) => (
            <div key={i} className="sa-card">
              <Skeleton variant="text" width="240px" height="24px" />
              <Skeleton variant="text" width="400px" />
            </div>
          ))}

          {!loading && displayedRequests.length === 0 && (
            <div className="mod-contests__empty" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No {statusFilter.toLowerCase()} requests found.</p>
            </div>
          )}

          {!loading && displayedRequests.map((req) => (
            <div key={req.id} className="sa-card">
              <div className="sa-card__header">
                <div className="sa-card__title-area">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`sa-badge sa-badge--${req.action.toLowerCase()}`}>{req.action}</span>
                    <span className="sa-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{req.entity_type}</span>
                    <span className={`sa-badge sa-badge--${req.status.toLowerCase()}`}>{req.status}</span>
                  </div>
                  <h3 className="sa-card__title" style={{ marginTop: 6 }}>{req.title_preview}</h3>
                </div>
              </div>

              <div className="sa-card__meta">
                <span>Requested by: <strong>@{req.requested_by}</strong></span>
                <span>Submitted: {fmtDate(req.created_at)}</span>
                {req.reviewed_by && (
                  <span>Reviewed by @{req.reviewed_by} on {fmtDate(req.reviewed_at)}</span>
                )}
              </div>

              {/* Payload preview */}
              {req.payload && Object.keys(req.payload).length > 0 && (
                <div className="sa-card__payload">
                  {JSON.stringify(req.payload, null, 2)}
                </div>
              )}

              {req.rejection_reason && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', fontWeight: 600 }}>
                  Rejection Reason: {req.rejection_reason}
                </div>
              )}

              {/* Actions for PENDING */}
              {req.status === 'PENDING' && (
                <div className="sa-card__actions">
                  <Button variant="secondary" size="sm" onClick={() => setRejecting(req)} disabled={!!actioningId}>
                    Reject Request
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleApprove(req.id)} loading={actioningId === req.id} disabled={!!actioningId}>
                    ✓ Approve & Apply to DB
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Reject Modal */}
      {rejecting && (
        <div className="sa-reject-modal">
          <div className="sa-reject-box">
            <h3 className="sa-reject-title">Reject Request — {rejecting.title_preview}</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Provide feedback for @{rejecting.requested_by} on why this request was rejected.
            </p>
            <textarea
              className="sa-reject-textarea"
              placeholder="e.g. Test cases incomplete or duplicate problem entry…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={actioning} onClick={handleRejectConfirm}>Reject Request</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
