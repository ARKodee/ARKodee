// src/pages/ModeratorProblems.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getModProblemsList,
  getModProblemDetail,
  createModProblem,
  updateModProblem,
  deleteModProblem,
} from '../lib/problems';
import { useAuth }          from '../store/AuthContext';
import { ModeratorNavbar }  from '../components/layout/ModeratorNavbar';
import { SuperadminNavbar } from '../components/layout/SuperadminNavbar';
import { Button }           from '../components/ui/Button';
import { Badge }            from '../components/ui/Badge';
import { Skeleton }         from '../components/ui/Skeleton';
import './ModeratorProblems.css';

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const MIN_TEST_CASES = 15;

const DIFFICULTY_OPTS = ['all', 'easy', 'medium', 'hard'];
const STATUS_OPTS     = ['all', 'approved', 'pending', 'rejected'];

const DIFF_VARIANT = { EASY: 'success', MEDIUM: 'warning', HARD: 'danger' };
const STATUS_VARIANT = { approved: 'success', pending: 'warning', rejected: 'danger' };

/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const IconSearch  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconEdit    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconTrash   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IconPlus    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconWarn    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconAlert   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>

/* ─── Blank form state ───────────────────────────────────────────────────────── */
function blankForm() {
  return {
    title: '', description: '', difficulty: 'easy', status: 'pending',
    constraints: '', input_format: '', output_format: '',
    sample_input: '', sample_output: '',
    time_limit_ms: 2000, memory_limit_mb: 256,
    tags: '',        // comma-separated string → converted to array on submit
    test_cases: [],  // [{ input, expected_output, is_sample }]
  };
}

/* ─── Blank test case ────────────────────────────────────────────────────────── */
function blankTC() {
  return { input: '', expected_output: '', is_sample: false };
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ══════════════════════════════════════════════════════════════════════════════
   CSV UTILITIES
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Robust CSV parser that handles quoted values, newlines, and header detection.
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        if (char === '\r') i++; // skip \r
        currentRow.push(currentVal.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal.trim() || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  // Detect header row
  const firstRow = rows[0].map((c) => c.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const hasInputHeader = firstRow.includes('input');
  const hasOutputHeader = firstRow.some((c) => c.includes('output') || c.includes('expected'));

  let startIndex = 0;
  let inputIdx = 0;
  let outputIdx = 1;
  let sampleIdx = 2;

  if (hasInputHeader || hasOutputHeader) {
    startIndex = 1; // Skip header row
    inputIdx = firstRow.findIndex((c) => c === 'input');
    outputIdx = firstRow.findIndex((c) => c.includes('output') || c.includes('expected'));
    sampleIdx = firstRow.findIndex((c) => c.includes('sample'));
    if (inputIdx === -1) inputIdx = 0;
    if (outputIdx === -1) outputIdx = 1;
  }

  const parsedTestCases = [];
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const input = row[inputIdx] !== undefined ? row[inputIdx] : (row[0] || '');
    const expected = row[outputIdx] !== undefined ? row[outputIdx] : (row[1] || '');
    const sampleRaw = sampleIdx !== -1 && row[sampleIdx] !== undefined ? row[sampleIdx].toLowerCase() : 'false';
    const isSample = sampleRaw === 'true' || sampleRaw === '1' || sampleRaw === 'yes';

    if (input.length > 0 || expected.length > 0) {
      parsedTestCases.push({
        input,
        expected_output: expected,
        is_sample: isSample,
      });
    }
  }

  return parsedTestCases;
}

/** Downloads a ready-to-use 15-case CSV template */
function downloadCSVTemplate() {
  let csvContent = 'input,expected_output,is_sample\n';
  for (let i = 1; i <= 15; i++) {
    const isSample = i <= 2 ? 'true' : 'false';
    csvContent += `"2 7 11 15\\n9","0 1",${isSample}\n`;
  }
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'arkodee_testcases_15_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ══════════════════════════════════════════════════════════════════════════════
   TEST CASE BUILDER — reusable inner component
   ══════════════════════════════════════════════════════════════════════════════ */
function TestCaseBuilder({ testCases, onChange }) {
  const count = testCases.length;
  const progress = Math.min(count / MIN_TEST_CASES, 1);
  const done     = count >= MIN_TEST_CASES;

  const fileInputRef = useRef(null);
  const [csvNotice, setCsvNotice] = useState('');
  const [csvError, setCsvError]   = useState('');

  const addCase = () => onChange([...testCases, blankTC()]);
  const removeCase = (idx) => onChange(testCases.filter((_, i) => i !== idx));
  const updateCase = (idx, field, value) => {
    const updated = testCases.map((tc, i) =>
      i === idx ? { ...tc, [field]: value } : tc
    );
    onChange(updated);
  };

  const handleFileUpload = (e, mode = 'append') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvNotice('');
    setCsvError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseCSV(text);

        if (parsed.length === 0) {
          setCsvError('CSV file is empty or could not be parsed.');
          return;
        }

        let newCases;
        if (mode === 'replace') {
          newCases = parsed;
        } else {
          newCases = [...testCases, ...parsed];
        }

        onChange(newCases);
        setCsvNotice(`Successfully imported ${parsed.length} test cases from CSV. Total: ${newCases.length}`);
      } catch (err) {
        setCsvError('Failed to parse CSV file. Ensure valid formatting.');
      }
    };
    reader.readAsText(file);

    e.target.value = '';
  };

  return (
    <div>
      {/* Header with progress */}
      <div className="mod-tc__header">
        <span className="mod-form__section-title">
          Test Cases
          <span className="mod-form__section-badge">{count} / {MIN_TEST_CASES} min</span>
        </span>
        <div className="mod-tc__progress">
          <div className="mod-tc__progress-bar">
            <div
              className={`mod-tc__progress-fill${done ? ' mod-tc__progress-fill--done' : ''}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span>{count < MIN_TEST_CASES ? `${MIN_TEST_CASES - count} more needed` : '✓ Minimum met'}</span>
        </div>
      </div>

      {/* CSV Import & Template Toolbar */}
      <div className="mod-tc__csv-toolbar">
        <div className="mod-tc__csv-buttons">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFileUpload(e, 'append')}
          />
          <button
            type="button"
            className="mod-tc__csv-btn mod-tc__csv-btn--import"
            onClick={() => fileInputRef.current?.click()}
          >
            📄 Import CSV (Append)
          </button>
          <button
            type="button"
            className="mod-tc__csv-btn mod-tc__csv-btn--replace"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.onchange = (e) => handleFileUpload(e, 'replace');
                fileInputRef.current.click();
              }
            }}
          >
            🔄 Import CSV (Replace All)
          </button>
          <button
            type="button"
            className="mod-tc__csv-btn mod-tc__csv-btn--template"
            onClick={downloadCSVTemplate}
          >
            ⬇️ Download CSV Template (15 cases)
          </button>
        </div>
      </div>

      {csvNotice && <div className="mod-tc__notice">{csvNotice}</div>}
      {csvError  && <div className="mod-tc__error-banner"><IconWarn /> {csvError}</div>}

      {/* Warning if below minimum */}
      {!done && (
        <div className="mod-tc__warning">
          <IconWarn /> You need at least {MIN_TEST_CASES} test cases. Add {MIN_TEST_CASES - count} more to submit.
        </div>
      )}

      {/* Test case list */}
      <div className="mod-tc__list">
        {testCases.map((tc, idx) => (
          <div key={idx} className="mod-tc__item">
            <div className="mod-tc__item-num">
              <span>Case #{idx + 1}</span>
              <label className={`mod-tc__sample-toggle${tc.is_sample ? ' mod-tc__sample-toggle--active' : ''}`}>
                <input
                  type="checkbox"
                  checked={tc.is_sample}
                  onChange={(e) => updateCase(idx, 'is_sample', e.target.checked)}
                />
                Sample (visible to players)
              </label>
            </div>
            <textarea
              className="mod-tc__textarea"
              placeholder="Input"
              value={tc.input}
              onChange={(e) => updateCase(idx, 'input', e.target.value)}
            />
            <textarea
              className="mod-tc__textarea"
              placeholder="Expected Output"
              value={tc.expected_output}
              onChange={(e) => updateCase(idx, 'expected_output', e.target.value)}
            />
            <button
              type="button"
              className="mod-tc__remove"
              onClick={() => removeCase(idx)}
              title="Remove test case"
            >×</button>
          </div>
        ))}
      </div>

      <button type="button" className="mod-tc__add-btn" onClick={addCase}>
        <IconPlus /> Add test case
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROBLEM FORM MODAL — create & edit
   ══════════════════════════════════════════════════════════════════════════════ */
function ProblemModal({ mode, initialData, onClose, onSuccess }) {
  const [form, setForm] = useState(initialData || blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleTestCasesChange = (tcs) => {
    setForm((prev) => ({ ...prev, test_cases: tcs }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.test_cases.length < MIN_TEST_CASES) {
      setError(`Minimum ${MIN_TEST_CASES} test cases required (currently ${form.test_cases.length}).`);
      return;
    }

    const payload = {
      ...form,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      time_limit_ms: Number(form.time_limit_ms),
      memory_limit_mb: Number(form.memory_limit_mb),
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await createModProblem(payload);
      } else {
        await updateModProblem(initialData.id, payload);
      }
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mod-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mod-modal">
        <div className="mod-modal__header">
          <span className="mod-modal__title">
            {mode === 'create' ? '+ New Problem' : `Edit — ${initialData?.title}`}
          </span>
          <button className="mod-modal__close" onClick={onClose} type="button">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mod-modal__body">

            {/* ── Basic info ─────────────────────────────────────────────── */}
            <div className="mod-form__row">
              <div className="mod-form__field mod-form__field--full">
                <label className="mod-form__label">
                  Title <span className="mod-form__label-required">*</span>
                </label>
                <input
                  className="mod-form__input"
                  placeholder="e.g. Two Sum"
                  value={form.title}
                  onChange={set('title')}
                  required
                />
              </div>

              <div className="mod-form__field">
                <label className="mod-form__label">Difficulty <span className="mod-form__label-required">*</span></label>
                <select className="mod-form__select" value={form.difficulty} onChange={set('difficulty')}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="mod-form__field">
                <label className="mod-form__label">Status</label>
                <select className="mod-form__select" value={form.status} onChange={set('status')}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved / Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="mod-form__field">
                <label className="mod-form__label">Time Limit (ms)</label>
                <input className="mod-form__input" type="number" min="100" value={form.time_limit_ms} onChange={set('time_limit_ms')} />
              </div>

              <div className="mod-form__field">
                <label className="mod-form__label">Memory Limit (MB)</label>
                <input className="mod-form__input" type="number" min="32" value={form.memory_limit_mb} onChange={set('memory_limit_mb')} />
              </div>

              <div className="mod-form__field mod-form__field--full">
                <label className="mod-form__label">Tags (comma-separated)</label>
                <input
                  className="mod-form__input"
                  placeholder="e.g. Array, Hash Map, Two Pointers"
                  value={form.tags}
                  onChange={set('tags')}
                />
              </div>
            </div>

            <hr className="mod-form__divider" />

            {/* ── Description ────────────────────────────────────────────── */}
            <div className="mod-form__field">
              <label className="mod-form__label">
                Problem Statement <span className="mod-form__label-required">*</span>
              </label>
              <textarea
                className="mod-form__textarea mod-form__textarea--lg"
                placeholder="Full problem description. Markdown is supported."
                value={form.description}
                onChange={set('description')}
                required
              />
            </div>

            <div className="mod-form__row">
              <div className="mod-form__field">
                <label className="mod-form__label">Constraints</label>
                <textarea className="mod-form__textarea" placeholder="e.g. 1 ≤ n ≤ 10^5" value={form.constraints} onChange={set('constraints')} />
              </div>
              <div className="mod-form__field">
                <label className="mod-form__label">Input Format</label>
                <textarea className="mod-form__textarea" placeholder="Describe the input format" value={form.input_format} onChange={set('input_format')} />
              </div>
              <div className="mod-form__field">
                <label className="mod-form__label">Output Format</label>
                <textarea className="mod-form__textarea" placeholder="Describe the output format" value={form.output_format} onChange={set('output_format')} />
              </div>
              <div className="mod-form__field">
                <label className="mod-form__label">Sample Input</label>
                <textarea className="mod-form__textarea mod-form__textarea--md" placeholder="Sample input shown to players" value={form.sample_input} onChange={set('sample_input')} />
              </div>
            </div>

            <hr className="mod-form__divider" />

            {/* ── Test case builder ──────────────────────────────────────── */}
            <TestCaseBuilder
              testCases={form.test_cases}
              onChange={handleTestCasesChange}
            />

          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="mod-modal__footer">
            <span className="mod-modal__error">{error}</span>
            <div className="mod-modal__footer-right">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {mode === 'create' ? 'Create Problem' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   DELETE CONFIRM DIALOG
   ══════════════════════════════════════════════════════════════════════════════ */
function DeleteConfirm({ problem, onCancel, onConfirm, deleting }) {
  return (
    <div className="mod-confirm-overlay">
      <div className="mod-confirm">
        <div className="mod-confirm__icon"><IconAlert /></div>
        <p className="mod-confirm__title">Delete Problem?</p>
        <p className="mod-confirm__desc">
          This will permanently delete the problem, all its test cases, and submission history.
          This action cannot be undone.
          <span className="mod-confirm__problem-name">{problem.title}</span>
        </p>
        <div className="mod-confirm__actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={onConfirm}>
            Yes, Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
export function ModeratorProblems() {
  const { isSuperadmin } = useAuth();
  const [problems, setProblems]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [page, setPage]             = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [modal, setModal]           = useState(null); // { mode, data }
  const [toDelete, setToDelete]     = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const searchTimer = useRef(null);

  /* ── Fetch ──────────────────────────────────────────────────────────────────── */
  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getModProblemsList({ search, difficulty, status: statusFilter, page });
      if (data && Array.isArray(data.results)) {
        setProblems(data.results);
        setTotalCount(data.count || 0);
        setTotalPages(data.total_pages || 1);
      } else {
        const list = Array.isArray(data) ? data : [];
        setProblems(list);
        setTotalCount(list.length);
        setTotalPages(1);
      }
    } catch {
      setProblems([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, difficulty, statusFilter, page]);

  // Reset to page 1 when filters/search change
  useEffect(() => { setPage(1); }, [search, difficulty, statusFilter]);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchProblems, 300);
    return () => clearTimeout(searchTimer.current);
  }, [fetchProblems]);

  /* ── Open edit modal — fetch full data first ───────────────────────────────── */
  const handleEdit = async (problem) => {
    try {
      const full = await getModProblemDetail(problem.id);
      // Normalise form state
      setModal({
        mode: 'edit',
        data: {
          ...full,
          tags: (full.tags || []).join(', '),
          difficulty: full.difficulty?.toLowerCase() || 'easy',
        },
      });
    } catch {
      alert('Failed to load problem data for editing.');
    }
  };

  /* ── Delete ─────────────────────────────────────────────────────────────────── */
  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteModProblem(toDelete.id);
      setToDelete(null);
      fetchProblems();
    } catch {
      alert('Failed to delete problem.');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Summary counts ─────────────────────────────────────────────────────────── */
  const total    = totalCount;
  const approved = problems.filter((p) => (p.status || '').toLowerCase() === 'approved').length;
  const pending  = problems.filter((p) => (p.status || '').toLowerCase() === 'pending').length;

  return (
    <div className="mod-problems">
      {isSuperadmin ? <SuperadminNavbar /> : <ModeratorNavbar />}

      <div className="mod-problems__body">

        <Link to={isSuperadmin ? '/admin/dashboard' : '/moderator/dashboard'} className="mod-problems__back-link">
          ← Back to Dashboard
        </Link>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mod-problems__header">
          <div className="mod-problems__title-group">
            <h1 className="mod-problems__title">Problem Bank</h1>
            <p className="mod-problems__subtitle">Create, review and manage all DSA problems on the platform.</p>
          </div>
          <Button variant="primary" onClick={() => setModal({ mode: 'create', data: null })}>
            <IconPlus /> New Problem
          </Button>
        </div>

        {/* ── Summary bar ──────────────────────────────────────────────────── */}
        <div className="mod-problems__summary">
          <div className="mod-problems__summary-item"><strong>{total}</strong> Total</div>
          <div className="mod-problems__summary-divider" />
          <div className="mod-problems__summary-item"><strong style={{ color: 'var(--success)' }}>{approved}</strong> Published</div>
          <div className="mod-problems__summary-divider" />
          <div className="mod-problems__summary-item"><strong style={{ color: 'var(--warning)' }}>{pending}</strong> Pending</div>
          <div className="mod-problems__summary-divider" />
          <div className="mod-problems__summary-item"><strong>{total - approved - pending}</strong> Rejected</div>
        </div>

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="mod-problems__toolbar">
          <div className="mod-problems__search-wrap">
            <span className="mod-problems__search-icon"><IconSearch /></span>
            <input
              className="mod-problems__search"
              type="text"
              placeholder="Search problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="mod-problems__filter"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {DIFFICULTY_OPTS.map((d) => (
              <option key={d} value={d}>{d === 'all' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <select
            className="mod-problems__filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="mod-problems__table-wrap">
          <table className="mod-problems__table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Tags</th>
                <th>Test Cases</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td><Skeleton variant="text" width="200px" /></td>
                  <td><Skeleton variant="text" width="60px" /></td>
                  <td><Skeleton variant="text" width="70px" /></td>
                  <td><Skeleton variant="text" width="100px" /></td>
                  <td><Skeleton variant="text" width="40px" /></td>
                  <td><Skeleton variant="text" width="80px" /></td>
                  <td><Skeleton variant="text" width="100px" /></td>
                </tr>
              ))}

              {!loading && problems.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="mod-problems__empty">
                      <div className="mod-problems__empty-icon">📭</div>
                      <p className="mod-problems__empty-title">No problems found</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                        Try adjusting your filters or create a new problem.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && problems.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="mod-prob__title">{p.title}</div>
                    <div className="mod-prob__slug">{p.slug}</div>
                  </td>
                  <td>
                    <span className={`mod-prob__diff mod-prob__diff--${p.difficulty}`}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td>
                    <span className={`mod-prob__status mod-prob__status--${p.status}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="mod-prob__tags">
                      {(p.tags || []).slice(0, 3).map((t) => (
                        <span key={t} className="mod-prob__tag">{t}</span>
                      ))}
                      {p.tags?.length > 3 && (
                        <span className="mod-prob__tag">+{p.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`mod-prob__tc-count${p.test_case_count < MIN_TEST_CASES ? ' mod-prob__tc-count--warn' : ''}`}>
                      {p.test_case_count}
                      {p.test_case_count < MIN_TEST_CASES && ' ⚠'}
                    </span>
                  </td>
                  <td>
                    <span className="mod-prob__date">{formatDate(p.created_at)}</span>
                  </td>
                  <td>
                    <div className="mod-prob__actions">
                      <button
                        className="mod-prob__action-btn mod-prob__action-btn--edit"
                        onClick={() => handleEdit(p)}
                        title="Edit problem"
                      >
                        <IconEdit /> Edit
                      </button>
                      <button
                        className="mod-prob__action-btn mod-prob__action-btn--delete"
                        onClick={() => setToDelete(p)}
                        title="Delete problem"
                      >
                        <IconTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mod-problems__pagination">
            <button
              className="mod-prob__page-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              type="button"
            >← Prev</button>
            <span className="mod-prob__page-info">
              Page {page} of {totalPages} &nbsp;·&nbsp; {totalCount} total
            </span>
            <button
              className="mod-prob__page-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              type="button"
            >Next →</button>
          </div>
        )}

      </div>

      {/* ── Problem form modal ─────────────────────────────────────────────── */}
      {modal && (
        <ProblemModal
          mode={modal.mode}
          initialData={modal.data}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); fetchProblems(); }}
        />
      )}

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      {toDelete && (
        <DeleteConfirm
          problem={toDelete}
          onCancel={() => setToDelete(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}
