// src/components/dashboard/LiveActivityLog.jsx
import React, { useState, useEffect, useRef } from 'react';
import './dashboard-widgets.css';

const SEED_LOGS = [
  { ts: '21:14', msg: 'Nihar_X solved Two Sum in 4m 12s',              type: 'solve'   },
  { ts: '21:13', msg: 'Match #108 started — 1v1 Ranked',               type: 'match'   },
  { ts: '21:12', msg: 'Dharmil_07 reached Expert tier',                 type: 'rank'    },
  { ts: '21:11', msg: 'Contest GRAPH_BRAWL — registration open',        type: 'contest' },
  { ts: '21:10', msg: 'Match #107 ended — Attackers win 13–9',          type: 'result'  },
  { ts: '21:09', msg: 'AlgoKing_99 solved Longest Substring',           type: 'solve'   },
  { ts: '21:08', msg: '342 players online globally',                    type: 'system'  },
];

const LIVE_TEMPLATES = [
  { type: 'solve',   msg: 'RecurseKing solved Binary Search in 2m 44s' },
  { type: 'match',   msg: 'Match #109 started — 1v1 Ranked'             },
  { type: 'rank',    msg: 'Ptr_Syntax promoted to Specialist'            },
  { type: 'contest', msg: 'Contest TREE_ELITE — 42 participants queued'  },
  { type: 'result',  msg: 'Match #108 ended — Dharmil_07 MVP'           },
  { type: 'system',  msg: 'Matchmaking pool: 342 players queued'         },
];

const TYPE_COLOR = {
  solve:   'var(--success)',
  match:   'var(--accent)',
  rank:    'var(--warning)',
  contest: 'var(--info)',
  result:  'var(--text-secondary)',
  system:  'var(--text-muted)',
};

function pad(n) { return String(n).padStart(2, '0'); }

export function LiveActivityLog() {
  const [logs, setLogs] = useState(SEED_LOGS);
  const ref = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const ts  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const tpl = LIVE_TEMPLATES[Math.floor(Math.random() * LIVE_TEMPLATES.length)];
      setLogs((prev) => [{ ts, ...tpl }, ...prev].slice(0, 24));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [logs]);

  return (
    <div className="widget">
      <div className="widget__header">
        <span className="widget__title">Activity</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-nano)', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
          Live
        </span>
      </div>

      <div ref={ref} className="activity__list" style={{ padding: 'var(--space-2) var(--space-4)' }}>
        {logs.map((log, i) => (
          <div key={i} className="activity__row" style={{ opacity: Math.max(0.3, 1 - i * 0.04) }}>
            <span className="activity__time">{log.ts}</span>
            <span className="activity__dot" style={{ background: TYPE_COLOR[log.type] ?? 'var(--text-muted)' }} />
            <span className="activity__msg">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
