// src/pages/ModeratorContests.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getModContestsList,
  getModContestDetail,
  createModContest,
  updateModContest,
  deleteModContest,
  getModContestProblemsPool,
} from '../lib/contests';
import { createModProblem } from '../lib/problems';
import { useAuth }          from '../store/AuthContext';
import { ModeratorNavbar }  from '../components/layout/ModeratorNavbar';
import { SuperadminNavbar } from '../components/layout/SuperadminNavbar';
import { Button }           from '../components/ui/Button';
import { Skeleton }         from '../components/ui/Skeleton';
import './ModeratorContests.css';

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const LABEL = { A:0, B:1, C:2, D:3, E:4, F:5, G:6, H:7, I:8 };
const problemLabel = (idx) => String.fromCharCode(65 + idx); // A, B, C …

const TYPE_OPTS    = ['public', 'private', 'classroom'];
const SCORING_OPTS = ['leetcode', 'codeforces'];
const TIER_OPTS    = ['all', 'class_1', 'class_2', 'class_3'];
const STATUS_FILTER = ['all', 'live', 'upcoming', 'ended'];
const DIFF_OPTS    = ['easy', 'medium', 'hard'];
const MIN_TC       = 15; // minimum test cases for new problems

/* ─── Icons ──────────────────────────────────────────────────────────────────── */
const IconSearch = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconPlus   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconAlert  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function localToIso(localStr) {
  if (!localStr) return '';
  if (localStr.includes('Z') || localStr.includes('+')) return localStr;
  const d = new Date(localStr);
  return isNaN(d.getTime()) ? localStr : d.toISOString();
}

function isoToLocal(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Robust CSV parser */
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
        i++;
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
        if (char === '\r') i++;
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

  const firstRow = rows[0].map((c) => c.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const hasInputHeader = firstRow.includes('input');
  const hasOutputHeader = firstRow.some((c) => c.includes('output') || c.includes('expected'));

  let startIndex = 0;
  let inputIdx = 0;
  let outputIdx = 1;
  let sampleIdx = 2;

  if (hasInputHeader || hasOutputHeader) {
    startIndex = 1;
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

/** Download CSV template for contest problems */
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
  link.setAttribute('download', 'arkodee_contest_problem_15_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankForm() {
  return {
    title: '', description: '',
    type: 'public', scoring_mode: 'leetcode', status: 'approved',
    start_time: '', end_time: '',
    access_code: '',
    is_rated: true,
    eligible_class_tier: 'all',
    problems: [], // [{ id, title, slug, difficulty, points }]
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PROBLEM PICKER — two-tab: "From Bank" | "Create New"
   ═══════════════════════════════════════════════════════════════════════════════ */
function blankTC() { return { input: '', expected_output: '', is_sample: false }; }

function ProblemPicker({ selected, onChange }) {
  const [tab, setTab] = useState('bank'); // 'bank' | 'create'

  /* ── Bank tab state ─────────────────────────────────────────── */
  const [pool, setPool]               = useState([]);
  const [search, setSearch]           = useState('');
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError]     = useState('');
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);

  const poolTimer = useRef(null);

  /* ── Create-new tab state ────────────────────────────────────── */
  const [newProb, setNewProb] = useState({
    title: '', description: '', difficulty: 'medium',
    time_limit: 2, memory_limit: 256, test_cases: [],
  });
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const selectedIds = new Set(selected.map((p) => p.id));

  /* ── Fetch approved problem pool ─────────────────────────────── */
  const fetchPool = useCallback(async (q, targetPage = 1, append = false) => {
    if (append) setFetchingMore(true);
    else setPoolLoading(true);
    setPoolError('');

    try {
      const res = await getModContestProblemsPool(q, targetPage);
      const list = res?.results ?? (Array.isArray(res) ? res : []);
      const approved = list.filter((p) => (p.status || '').toLowerCase() === 'approved');

      if (append) {
        setPool((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = approved.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setPool(approved);
      }

      const currentPg = res?.page ?? targetPage;
      const totalPgs  = res?.total_pages ?? 1;
      setPage(currentPg);
      setHasMore(currentPg < totalPgs);
    } catch {
      if (!append) setPoolError('Failed to load problems. Check your connection.');
    } finally {
      setPoolLoading(false);
      setFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'bank') return;
    clearTimeout(poolTimer.current);
    poolTimer.current = setTimeout(() => fetchPool(search, 1, false), 350);
    return () => clearTimeout(poolTimer.current);
  }, [search, tab, fetchPool]);

  /* ── Scroll handler for infinite pagination ──────────────────── */
  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) {
      if (hasMore && !fetchingMore && !poolLoading) {
        fetchPool(search, page + 1, true);
      }
    }
  };

  /* ── Bank tab actions ────────────────────────────────────────── */
  const addFromBank = (p) => {
    if (selectedIds.has(p.id)) return;
    onChange([...selected, { id: p.id, title: p.title, slug: p.slug, difficulty: p.difficulty, points: 100 }]);
  };

  const fileInputRef = useRef(null);
  const [csvNotice, setCsvNotice] = useState('');

  const handleFileUpload = (e, mode = 'append') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateError('');
    setCsvNotice('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setCreateError('CSV file is empty or invalid.');
          return;
        }

        setNewProb((prev) => {
          const newCases = mode === 'replace' ? parsed : [...prev.test_cases, ...parsed];
          return { ...prev, test_cases: newCases };
        });
        setCsvNotice(`Successfully imported ${parsed.length} test cases from CSV.`);
      } catch (err) {
        setCreateError('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ── Create new problem ──────────────────────────────────────── */
  const setNewField = (f) => (e) => setNewProb((prev) => ({ ...prev, [f]: e.target.value }));

  const addTC = () => setNewProb((prev) => ({ ...prev, test_cases: [...prev.test_cases, blankTC()] }));

  const setTC = (idx, field, val) =>
    setNewProb((prev) => {
      const tcs = [...prev.test_cases];
      tcs[idx] = { ...tcs[idx], [field]: val };
      return { ...prev, test_cases: tcs };
    });

  const removeTC = (idx) =>
    setNewProb((prev) => ({ ...prev, test_cases: prev.test_cases.filter((_, i) => i !== idx) }));

  const handleCreateProblem = async () => {
    setCreateError('');
    setCreateSuccess('');

    if (!newProb.title.trim())       return setCreateError('Title is required.');
    if (!newProb.description.trim()) return setCreateError('Problem statement is required.');
    if (newProb.test_cases.length < MIN_TC)
      return setCreateError(`Minimum ${MIN_TC} test cases required (${newProb.test_cases.length} added).`);

    const incompleteTC = newProb.test_cases.some((tc) => !tc.input.trim() || !tc.expected_output.trim());
    if (incompleteTC) return setCreateError('All test cases must have both input and expected output.');

    setCreating(true);
    try {
      const payload = {
        title: newProb.title.trim(),
        description: newProb.description.trim(),
        difficulty: newProb.difficulty,
        time_limit_ms: (Number(newProb.time_limit) || 2) * 1000,
        memory_limit_mb: Number(newProb.memory_limit) || 256,
        status: 'approved', // Contest-specific problems are approved immediately
        tags: [],
        test_cases: newProb.test_cases.map((tc, i) => ({
          input: tc.input, expected_output: tc.expected_output,
          is_sample: tc.is_sample || i < 2,
        })),
      };
      const created = await createModProblem(payload);
      // Add it directly to selected list
      onChange([...selected, {
        id: created.id, title: created.title, slug: created.slug || '',
        difficulty: created.difficulty || newProb.difficulty.toUpperCase(),
        points: 100,
      }]);
      setCreateSuccess(`"${created.title}" created and added!`);
      setNewProb({ title: '', description: '', difficulty: 'medium', time_limit: 2, memory_limit: 256, test_cases: [] });
    } catch (err) {
      setCreateError(err?.message || err?.detail || 'Problem creation failed.');
    } finally {
      setCreating(false);
    }
  };

  /* ── Shared: remove / points ─────────────────────────────────── */
  const removeProblem = (id) => onChange(selected.filter((p) => p.id !== id));
  const updatePoints  = (id, pts) =>
    onChange(selected.map((p) => p.id === id ? { ...p, points: Number(pts) || 0 } : p));

  return (
    <div className="mcc-picker">

      {/* ── Tab switcher ─────────────────────────────────────────── */}
      <div className="mcc-picker__tabs">
        <button
          type="button"
          className={`mcc-picker__tab${tab === 'bank' ? ' mcc-picker__tab--active' : ''}`}
          onClick={() => setTab('bank')}
        >
          📚 From Problem Bank
        </button>
        <button
          type="button"
          className={`mcc-picker__tab${tab === 'create' ? ' mcc-picker__tab--active' : ''}`}
          onClick={() => setTab('create')}
        >
          ✏️ Create New Problem
        </button>
      </div>

      {/* ═══════════════════ TAB: FROM BANK ═══════════════════════ */}
      {tab === 'bank' && (
        <div>
          <div className="mcc-picker__search-wrap">
            <span className="mcc-picker__search-icon"><IconSearch /></span>
            <input
              className="mcc-picker__search"
              placeholder="Search approved problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mcc-picker__pool" onScroll={handleScroll}>
            {poolLoading && (
              <div className="mcc-picker__state">Loading problems…</div>
            )}
            {!poolLoading && poolError && (
              <div className="mcc-picker__state mcc-picker__state--error">{poolError}</div>
            )}
            {!poolLoading && !poolError && pool.length === 0 && (
              <div className="mcc-picker__state">
                No approved problems found.{' '}
                {search && <span>Try clearing the search, or </span>}
                <button type="button" className="mcc-picker__link" onClick={() => setTab('create')}>
                  create one →
                </button>
              </div>
            )}
            {!poolLoading && pool.map((p) => {
              const added = selectedIds.has(p.id);
              return (
                <div key={p.id} className={`mcc-picker__item${added ? ' mcc-picker__item--added' : ''}`}>
                  <div className="mcc-picker__item-info">
                    <span className="mcc-picker__item-title">{p.title}</span>
                    <span className="mcc-picker__item-meta">
                      <span className={`mcc-diff mcc-diff--${(p.difficulty || '').toLowerCase()}`}>{p.difficulty}</span>
                      {p.tags?.length > 0 && <span>{p.tags.slice(0, 2).join(', ')}</span>}
                      <span>{p.test_case_count} test cases</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`mcc-picker__add-btn${added ? ' mcc-picker__add-btn--added' : ''}`}
                    onClick={() => addFromBank(p)}
                  >
                    {added ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              );
            })}
            {fetchingMore && (
              <div className="mcc-picker__state" style={{ padding: '8px 0', fontSize: 'var(--text-nano)', color: 'var(--accent)' }}>
                Loading more problems…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: CREATE NEW PROBLEM ════════════════ */}
      {tab === 'create' && (
        <div className="mcc-create-prob">
          <div className="mcc-form__row">
            <div className="mcc-form__field mcc-form__field--full">
              <label className="mcc-form__label">Title <span className="mcc-form__required">*</span></label>
              <input className="mcc-form__input" placeholder="Problem title…" value={newProb.title} onChange={setNewField('title')} />
            </div>
            <div className="mcc-form__field mcc-form__field--full">
              <label className="mcc-form__label">Problem Statement <span className="mcc-form__required">*</span></label>
              <textarea className="mcc-form__textarea" style={{ minHeight: 100 }} placeholder="Describe the problem clearly…" value={newProb.description} onChange={setNewField('description')} />
            </div>
          </div>
          <div className="mcc-form__row mcc-form__row--3">
            <div className="mcc-form__field">
              <label className="mcc-form__label">Difficulty</label>
              <select className="mcc-form__select" value={newProb.difficulty} onChange={setNewField('difficulty')}>
                {DIFF_OPTS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div className="mcc-form__field">
              <label className="mcc-form__label">Time Limit (s)</label>
              <input className="mcc-form__input" type="number" min="1" max="10" value={newProb.time_limit} onChange={setNewField('time_limit')} />
            </div>
            <div className="mcc-form__field">
              <label className="mcc-form__label">Memory (MB)</label>
              <input className="mcc-form__input" type="number" min="32" max="1024" value={newProb.memory_limit} onChange={setNewField('memory_limit')} />
            </div>
          </div>

          {/* Test cases */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
            <div className="mcc-form__section-title">
              Test Cases
              <span className={`mcc-form__section-badge${newProb.test_cases.length < MIN_TC ? ' mcc-form__section-badge--warn' : ''}`}>
                {newProb.test_cases.length} / {MIN_TC} min
              </span>
            </div>
            <button type="button" className="mcc-tc__add-btn" onClick={addTC}>+ Add Case</button>
          </div>

          {/* CSV Import & Template Toolbar */}
          <div className="mod-tc__csv-toolbar" style={{ margin: '8px 0' }}>
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
                ⬇️ Download CSV Template
              </button>
            </div>
          </div>

          {csvNotice && <div className="mod-tc__notice">{csvNotice}</div>}

          {newProb.test_cases.length === 0 && (
            <div className="mcc-selected__empty" style={{ marginTop: 8 }}>
              No test cases yet. Click "+ Add Case" or "Import CSV" to start.<br />
              <span style={{ fontSize: 'var(--text-nano)', color: 'var(--warning)', fontWeight: 600 }}>⚠ Minimum {MIN_TC} required.</span>
            </div>
          )}

          <div className="mcc-tc__list">
            {newProb.test_cases.map((tc, idx) => (
              <div key={idx} className="mcc-tc__item">
                <span className="mcc-tc__num">#{idx + 1}</span>
                <div className="mcc-form__field" style={{ flex: 1 }}>
                  <label className="mcc-form__label">Input</label>
                  <textarea className="mcc-tc__textarea" rows={2} placeholder="stdin…" value={tc.input} onChange={(e) => setTC(idx, 'input', e.target.value)} />
                </div>
                <div className="mcc-form__field" style={{ flex: 1 }}>
                  <label className="mcc-form__label">Expected Output</label>
                  <textarea className="mcc-tc__textarea" rows={2} placeholder="stdout…" value={tc.expected_output} onChange={(e) => setTC(idx, 'expected_output', e.target.value)} />
                </div>
                <div className="mcc-form__field" style={{ width: 70 }}>
                  <label className="mcc-form__label">Sample?</label>
                  <input type="checkbox" checked={tc.is_sample} onChange={(e) => setTC(idx, 'is_sample', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16, marginTop: 6 }} />
                </div>
                <button type="button" className="mcc-selected__remove" style={{ marginTop: 20 }} onClick={() => removeTC(idx)} title="Remove">×</button>
              </div>
            ))}
          </div>

          {createError  && <div className="mcc-picker__state mcc-picker__state--error">{createError}</div>}
          {createSuccess && <div className="mcc-picker__state mcc-picker__state--success">{createSuccess}</div>}

          <button
            type="button"
            className="mcc-create-prob__submit"
            disabled={creating}
            onClick={handleCreateProblem}
          >
            {creating ? 'Creating…' : `✓ Create & Add to Contest`}
          </button>
        </div>
      )}

      {/* ═════════════ SELECTED PROBLEMS (always visible) ════════ */}
      <div className="mcc-picker__selected-section">
        <div className="mcc-form__section-title">
          Selected Problems
          <span className="mcc-form__section-badge">{selected.length} added</span>
        </div>
        {selected.length === 0 ? (
          <div className="mcc-selected__empty">No problems added yet. Use the tabs above to add problems.</div>
        ) : (
          <div className="mcc-selected__list">
            {selected.map((p, idx) => (
              <div key={p.id} className="mcc-selected__item">
                <span className="mcc-selected__order">{problemLabel(idx)}</span>
                <div>
                  <div className="mcc-selected__title">{p.title}</div>
                  <div className="mcc-selected__diff">{p.difficulty}</div>
                </div>
                <div className="mcc-selected__points-wrap">
                  <span className="mcc-selected__points-label">Pts</span>
                  <input
                    className="mcc-selected__points-input"
                    type="number" min="0" max="10000"
                    value={p.points}
                    onChange={(e) => updatePoints(p.id, e.target.value)}
                  />
                </div>
                <button type="button" className="mcc-selected__remove" onClick={() => removeProblem(p.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CONTEST FORM MODAL
   ═══════════════════════════════════════════════════════════════════════════════ */
function ContestModal({ mode, initialData, onClose, onSuccess }) {
  const [form, setForm]   = useState(initialData || blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim())       return setError('Title is required.');
    if (!form.start_time)          return setError('Start time is required.');
    if (!form.end_time)            return setError('End time is required.');
    if (new Date(form.end_time) <= new Date(form.start_time))
      return setError('End time must be after start time.');
    if (form.type === 'private' && !form.access_code.trim())
      return setError('Access PIN is required for private contests.');
    if (form.problems.length === 0)
      return setError('At least one problem must be added.');

    const payload = {
      ...form,
      start_time: localToIso(form.start_time),
      end_time: localToIso(form.end_time),
      problems: form.problems.map((p, idx) => ({
        id: p.id,
        points: p.points,
        order_index: idx,
      })),
    };

    setSaving(true);
    try {
      if (mode === 'create') {
        await createModContest(payload);
      } else {
        await updateModContest(initialData.id, payload);
      }
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mcc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mcc-modal">
        <div className="mcc-modal__header">
          <span className="mcc-modal__title">
            {mode === 'create' ? '+ Schedule Contest' : `Edit — ${initialData?.title}`}
          </span>
          <button className="mcc-modal__close" type="button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mcc-modal__body">

            {/* ── Basic info ─────────────────────────────────────────────────── */}
            <div className="mcc-form__row">
              <div className="mcc-form__field mcc-form__field--full">
                <label className="mcc-form__label">Title <span className="mcc-form__required">*</span></label>
                <input className="mcc-form__input" placeholder="e.g. ARKodee Monthly Round #1" value={form.title} onChange={set('title')} required />
              </div>

              <div className="mcc-form__field mcc-form__field--full">
                <label className="mcc-form__label">Description</label>
                <textarea className="mcc-form__textarea" placeholder="Contest description, rules, prizes…" value={form.description} onChange={set('description')} />
              </div>
            </div>

            <hr className="mcc-form__divider" />

            {/* ── Schedule ───────────────────────────────────────────────────── */}
            <div className="mcc-form__row">
              <div className="mcc-form__field">
                <label className="mcc-form__label">Start Time <span className="mcc-form__required">*</span></label>
                <input className="mcc-form__input" type="datetime-local" value={toLocalInput(form.start_time) || form.start_time} onChange={set('start_time')} required />
              </div>
              <div className="mcc-form__field">
                <label className="mcc-form__label">End Time <span className="mcc-form__required">*</span></label>
                <input className="mcc-form__input" type="datetime-local" value={toLocalInput(form.end_time) || form.end_time} onChange={set('end_time')} required />
              </div>
            </div>

            <hr className="mcc-form__divider" />

            {/* ── Configuration ──────────────────────────────────────────────── */}
            <div className="mcc-form__row mcc-form__row--3">
              <div className="mcc-form__field">
                <label className="mcc-form__label">Contest Type</label>
                <select className="mcc-form__select" value={form.type} onChange={set('type')}>
                  {TYPE_OPTS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="mcc-form__field">
                <label className="mcc-form__label">Scoring Mode</label>
                <select className="mcc-form__select" value={form.scoring_mode} onChange={set('scoring_mode')}>
                  <option value="leetcode">LeetCode (Virtual Score)</option>
                  <option value="codeforces">Codeforces (Time Penalty)</option>
                </select>
              </div>
              <div className="mcc-form__field">
                <label className="mcc-form__label">Eligible Tier</label>
                <select className="mcc-form__select" value={form.eligible_class_tier} onChange={set('eligible_class_tier')}>
                  <option value="all">All Tiers (Open)</option>
                  <option value="class_1">Class 1 — Advanced (ELO 1800+)</option>
                  <option value="class_2">Class 2 — Intermediate (ELO 1400–1799)</option>
                  <option value="class_3">Class 3 — Beginner (ELO &lt;1400)</option>
                </select>
              </div>
            </div>

            <div className="mcc-form__row">
              <div className="mcc-form__field">
                <label className="mcc-form__label">Approval Status</label>
                <select className="mcc-form__select" value={form.status} onChange={set('status')}>
                  <option value="approved">Approved / Published</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="mcc-form__field" style={{ justifyContent: 'flex-end' }}>
                <div className="mcc-form__toggle-row" style={{ marginTop: 'auto', paddingBottom: 4 }}>
                  <label className="mcc-toggle-label">
                    <input type="checkbox" checked={form.is_rated} onChange={set('is_rated')} />
                    Rated Contest (ELO impact)
                  </label>
                </div>
              </div>
            </div>

            {/* Access PIN — only shown for private/classroom */}
            {(form.type === 'private' || form.type === 'classroom') && (
              <div className="mcc-form__field">
                <label className="mcc-form__label">
                  Access PIN <span className="mcc-form__required">*</span>
                </label>
                <input
                  className="mcc-form__input"
                  placeholder="4–20 character PIN"
                  maxLength={20}
                  value={form.access_code}
                  onChange={set('access_code')}
                />
                <span className="mcc-form__hint">Players must enter this PIN to register.</span>
              </div>
            )}

            <hr className="mcc-form__divider" />

            {/* ── Problem picker ─────────────────────────────────────────────── */}
            <div className="mcc-form__section-title">
              Problems
              <span className="mcc-form__section-badge">Custom points per problem</span>
            </div>
            <ProblemPicker
              selected={form.problems}
              onChange={(probs) => setForm((prev) => ({ ...prev, problems: probs }))}
            />

          </div>

          {/* Footer */}
          <div className="mcc-modal__footer">
            <span className="mcc-modal__error">{error}</span>
            <div className="mcc-modal__footer-right">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {mode === 'create' ? 'Create Contest' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DELETE CONFIRM
   ═══════════════════════════════════════════════════════════════════════════════ */
function DeleteConfirm({ contest, onCancel, onConfirm, deleting }) {
  return (
    <div className="mcc-confirm-overlay">
      <div className="mcc-confirm">
        <div className="mcc-confirm__icon"><IconAlert /></div>
        <p className="mcc-confirm__title">Delete Contest?</p>
        <p className="mcc-confirm__desc">
          This will permanently delete the contest, all registrations, and submission records.
          This cannot be undone.
          <span className="mcc-confirm__name">{contest.title}</span>
        </p>
        <div className="mcc-confirm__actions">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={onConfirm}>Yes, Delete</Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPUTED STATUS BADGE
   ═══════════════════════════════════════════════════════════════════════════════ */
function ComputedStatus({ s }) {
  if (s === 'live')     return <span className="mc__cstatus mc__cstatus--live"><span className="mc__live-dot" />Live</span>;
  if (s === 'upcoming') return <span className="mc__cstatus mc__cstatus--upcoming">Upcoming</span>;
  return <span className="mc__cstatus mc__cstatus--ended">Ended</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export function ModeratorContests() {
  const { isSuperadmin } = useAuth();
  const [contests, setContests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modal,    setModal]    = useState(null); // { mode, data }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const searchTimer = useRef(null);

  /* ── Fetch ──────────────────────────────────────────────────────────────────── */
  const fetchContests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getModContestsList({ search, status: statusFilter });
      setContests(Array.isArray(data) ? data : []);
    } catch { setContests([]); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchContests, 300);
    return () => clearTimeout(searchTimer.current);
  }, [fetchContests]);

  /* ── Edit ───────────────────────────────────────────────────────────────────── */
  const handleEdit = async (c) => {
    try {
      const full = await getModContestDetail(c.id);
      setModal({
        mode: 'edit',
        data: {
          ...full,
          problems: (full.problems || []).map((p) => ({
            id: p.id, title: p.title, slug: p.slug,
            difficulty: p.difficulty, points: p.points,
          })),
        },
      });
    } catch { alert('Failed to load contest data.'); }
  };

  /* ── Delete ─────────────────────────────────────────────────────────────────── */
  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteModContest(toDelete.id);
      setToDelete(null);
      fetchContests();
    } catch { alert('Delete failed.'); }
    finally { setDeleting(false); }
  };

  /* ── Summary counts ─────────────────────────────────────────────────────────── */
  const live     = contests.filter((c) => c.computed_status === 'live').length;
  const upcoming = contests.filter((c) => c.computed_status === 'upcoming').length;

  return (
    <div className="mod-contests">
      {isSuperadmin ? <SuperadminNavbar /> : <ModeratorNavbar />}

      <div className="mod-contests__body">

        {/* Back link */}
        <Link to={isSuperadmin ? '/admin/dashboard' : '/moderator/dashboard'} className="mod-contests__back">← Back to Dashboard</Link>

        {/* Header */}
        <div className="mod-contests__header">
          <div>
            <h1 className="mod-contests__title">Contest Management</h1>
            <p className="mod-contests__subtitle">Schedule, configure and manage all competitive programming contests.</p>
          </div>
          <Button variant="primary" onClick={() => setModal({ mode: 'create', data: null })}>
            <IconPlus /> Schedule Contest
          </Button>
        </div>

        {/* Summary bar */}
        <div className="mod-contests__summary">
          <div className="mod-contests__sum-item"><strong>{contests.length}</strong> Total</div>
          <div className="mod-contests__sum-div" />
          <div className="mod-contests__sum-item"><strong style={{ color: 'var(--success)' }}>{live}</strong> Live</div>
          <div className="mod-contests__sum-div" />
          <div className="mod-contests__sum-item"><strong style={{ color: 'var(--accent)' }}>{upcoming}</strong> Upcoming</div>
          <div className="mod-contests__sum-div" />
          <div className="mod-contests__sum-item"><strong>{contests.length - live - upcoming}</strong> Ended</div>
        </div>

        {/* Toolbar */}
        <div className="mod-contests__toolbar">
          <div className="mod-contests__search-wrap">
            <span className="mod-contests__search-icon"><IconSearch /></span>
            <input
              className="mod-contests__search"
              placeholder="Search contests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="mod-contests__filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_FILTER.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="mod-contests__table-wrap">
          <table className="mod-contests__table">
            <thead>
              <tr>
                <th>Contest</th>
                <th>State</th>
                <th>Approval</th>
                <th>Schedule</th>
                <th>Type</th>
                <th>Scoring</th>
                <th>Problems</th>
                <th>Participants</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <td key={j}><Skeleton variant="text" width={j === 0 ? '180px' : '70px'} /></td>
                  ))}
                </tr>
              ))}

              {!loading && contests.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="mod-contests__empty">
                      <div className="mod-contests__empty-icon">📅</div>
                      <p className="mod-contests__empty-title">No contests found</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                        Try adjusting your filters or schedule a new contest.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && contests.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="mc__title">{c.title}</div>
                    <div className="mc__slug">{c.slug}</div>
                  </td>
                  <td><ComputedStatus s={c.computed_status} /></td>
                  <td>
                    <span className={`mc__status mc__status--${c.status}`}>{c.status}</span>
                  </td>
                  <td>
                    <div className="mc__time">{fmtDate(c.start_time)}</div>
                    <div className="mc__time mc__time-end">→ {fmtDate(c.end_time)}</div>
                  </td>
                  <td>
                    <div className="mc__meta">
                      <span className="mc__tag">{c.type}</span>
                      {c.access_code && <span className="mc__tag">🔒 PIN</span>}
                    </div>
                  </td>
                  <td>
                    <span className="mc__tag">{c.scoring_mode}</span>
                  </td>
                  <td><span className="mc__count">{c.problem_count}</span></td>
                  <td><span className="mc__count">{c.participant_count}</span></td>
                  <td>
                    <div className="mc__actions">
                      <button className="mc__action-btn mc__action-btn--edit" onClick={() => handleEdit(c)}>
                        <IconEdit /> Edit
                      </button>
                      <button className="mc__action-btn mc__action-btn--delete" onClick={() => setToDelete(c)}>
                        <IconTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Contest form modal */}
      {modal && (
        <ContestModal
          mode={modal.mode}
          initialData={modal.data}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); fetchContests(); }}
        />
      )}

      {/* Delete confirm */}
      {toDelete && (
        <DeleteConfirm
          contest={toDelete}
          onCancel={() => setToDelete(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}
