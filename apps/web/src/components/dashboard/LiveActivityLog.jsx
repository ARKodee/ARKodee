// src/components/dashboard/LiveActivityLog.jsx
import React, { useState, useEffect, useRef } from 'react';

// THIS MIGHT BE OPTIONAL.

// DHARMIL :- Fetch SEED_LOGs and LIVE_TEMPLATES from API instead of hardcoding them in the component.
/* ── Seed data ── */
const SEED_LOGS = [
  { ts: '21:14', msg: 'Player_Nihar executed KEY_LOCKOUT against Dev_Ansh',           type: 'kill'    },
  { ts: '21:13', msg: 'Match #108: Spike planted by Attacker team — 0:45 remaining',  type: 'spike'   },
  { ts: '21:12', msg: 'Dharmil_07 defused spike — +180 ELO awarded',                  type: 'defuse'  },
  { ts: '21:11', msg: 'AlgoKing_99 reached DIAMOND tier — promotion confirmed',        type: 'rank'    },
  { ts: '21:10', msg: 'Match #107 concluded — Attackers win 13-9',                    type: 'result'  },
  { ts: '21:09', msg: 'Bug_Destroyer triggered SCREEN_BLUR on Ptr_Syntax',             type: 'kill'    },
  { ts: '21:08', msg: 'Contest: TREE_TRAVERSAL_ELITE — 42 participants queued',        type: 'contest' },
  { ts: '21:07', msg: 'Match #106: Sudden death — O(1) defusal required',             type: 'spike'   },
  { ts: '21:06', msg: 'Ansh_Code earned CLUTCH badge — 1v3 elimination',              type: 'rank'    },
  { ts: '21:05', msg: 'SERVER ROTATION: IN_WEST → IN_EAST handoff complete',          type: 'system'  },
  { ts: '21:04', msg: 'null_slayer executed RECURSION_TRAP on RecurseKing',            type: 'kill'    },
  { ts: '21:03', msg: 'Match #105: Dharmil_07 — 4 KILLs, 1 DEFUSAL, MVP',            type: 'result'  },
];

/* Live event templates — injected every ~4 s */
const LIVE_TEMPLATES = [
  { type: 'kill',    msg: 'RecurseKing executed STACK_OVERFLOW_TRAP on null_slayer'   },
  { type: 'spike',   msg: 'Match #109: Spike planted — defusal window 0:40'           },
  { type: 'defuse',  msg: 'Ansh_Code defused in 0:12 — Impossible Clutch'             },
  { type: 'contest', msg: 'Contest GRAPH_BRAWL open — registration 2 min'             },
  { type: 'system',  msg: 'Matchmaking pool: 342 players queued globally'              },
  { type: 'rank',    msg: 'Ptr_Syntax promoted to PLATINUM tier'                      },
  { type: 'result',  msg: 'Match #108 concluded — Dharmil_07 MVP, 5-kill round'       },
];

const TYPE_COLOR = {
  kill:    '#ef4444',
  spike:   '#f59e0b',
  defuse:  '#10b981',
  rank:    '#8b5cf6',
  result:  '#94a3b8',
  contest: '#60a5fa',
  system:  '#475569',
};

/* ── Component ── */
export function LiveActivityLog() {
  const [logs, setLogs] = useState(SEED_LOGS);
  const containerRef = useRef(null);

  /* Inject a new live event every 4 seconds */
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const ts  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const tpl = LIVE_TEMPLATES[Math.floor(Math.random() * LIVE_TEMPLATES.length)];
      setLogs((prev) => [{ ts, ...tpl }, ...prev].slice(0, 32));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  /* Auto-scroll to top whenever a new log arrives */
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [logs]);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'rgba(2,6,23,0.82)',
        border: '1px solid rgba(30,41,59,0.6)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(30,41,59,0.8)',
          background: 'rgba(15,23,42,0.5)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#ef4444', boxShadow: '0 0 5px #ef4444' }}
          />
          <span
            className="text-[9px] font-mono font-bold tracking-[0.22em] uppercase"
            style={{ color: '#475569' }}
          >
            LIVE COMBAT FEED
          </span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: '#1e293b' }}>
          FEED_v2.1
        </span>
      </div>

      {/* Log list — scrollbar hidden */}
      <div
        ref={containerRef}
        className="px-3 py-2 flex flex-col gap-[3px] overflow-y-auto"
        style={{
          maxHeight: 118,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {logs.map((log, i) => (
          <div
            key={i}
            className="flex items-baseline gap-2"
            style={{ opacity: Math.max(0.25, 1 - i * 0.028) }}
          >
            {/* Timestamp */}
            <span
              className="flex-shrink-0 text-[9px] font-mono"
              style={{ color: '#1e293b' }}
            >
              [{log.ts}]
            </span>

            {/* Type dot */}
            <span
              className="flex-shrink-0 w-[5px] h-[5px] rounded-full mt-[5px]"
              style={{ background: TYPE_COLOR[log.type] ?? '#475569' }}
            />

            {/* Message */}
            <span
              className="text-[10px] font-mono leading-snug"
              style={{ color: TYPE_COLOR[log.type] ?? '#475569', opacity: 0.82 }}
            >
              {log.msg}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function pad(n) {
  return String(n).padStart(2, '0');
}
