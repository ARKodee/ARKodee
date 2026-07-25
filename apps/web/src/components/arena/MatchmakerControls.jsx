import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users, Swords } from 'lucide-react';

export function MatchmakerControls({ onOpenCustomModal }) {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [searchElapsed, setSearchElapsed] = useState(0);

  // Queue elapsed timer — owned locally since search state is component-scoped
  useEffect(() => {
    let timer;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setSearchElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isSearching]);

  const formatSearchTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartPublicMatch = () => {
    navigate('/arena/ranked-1v1');
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg">
      {/* Mode Configuration Lock Tag */}
      <div className="pb-5 border-b border-zinc-800/60 mb-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          // 1v1 Arena Defusal Mode
        </h2>
        <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed max-w-lg">
          Deploy to competitive matchmaking arenas to rank up, or launch a
          secure private custom room to challenge code contenders directly in
          real-time.
        </p>
      </div>

      {/* Action Sections */}
      <div className="flex flex-col gap-5">
        {/* Section 1: Public Matchmaking */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap
              size={14}
              className={
                isSearching
                  ? 'text-red-400 animate-pulse'
                  : 'text-indigo-400'
              }
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Public Queue
            </span>
          </div>

          {isSearching ? (
            <div className="bg-red-950/10 border border-red-900/30 rounded-md p-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative block w-1.5 h-1.5 rounded-full bg-red-500"></span>
                </span>
                <span className="text-[9px] font-mono uppercase font-black text-red-400 tracking-wider">
                  Searching for opponent...
                </span>
              </div>
              <span className="text-sm font-mono text-zinc-300 tabular-nums">
                [{formatSearchTime(searchElapsed)}]
              </span>
              <div className="flex items-center gap-2 w-full mt-1">
                <button
                  onClick={handleStartPublicMatch}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-[10px] rounded-md transition-colors uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Swords size={12} />
                  <span>Enter Match Arena</span>
                </button>
                <button
                  onClick={() => setIsSearching(false)}
                  className="text-[10px] font-mono text-red-400 border border-red-900/30 hover:border-red-800/50 bg-red-950/20 hover:bg-red-950/40 px-3 py-2 rounded-md transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartPublicMatch}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 font-semibold tracking-wide text-white rounded-md transition-all duration-200 active:scale-[0.99] cursor-pointer text-xs uppercase flex items-center justify-center gap-2"
            >
              <Zap size={14} />
              <span>Find & Start 1v1 Match</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800/60"></div>

        {/* Section 2: Custom Private Lobby */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-purple-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Private Lobby
            </span>
          </div>

          <button
            onClick={onOpenCustomModal}
            className="w-full py-3 px-6 bg-zinc-950 hover:bg-zinc-900 text-white border border-zinc-800 rounded-md text-xs font-semibold tracking-wide uppercase transition-all duration-200 active:scale-[0.99] cursor-pointer"
          >
            Configure Private Custom Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
