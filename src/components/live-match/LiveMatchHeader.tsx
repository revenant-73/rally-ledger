import React from 'react';
import { ArrowLeft, RotateCcw, BarChart2, MoreVertical } from 'lucide-react';

interface LiveMatchHeaderProps {
  onBack: () => void;
  setNumber: number;
  opponentName: string;
  onShowTimeout: () => void;
  onShowStats: () => void;
  onShowMore: () => void;
  compact?: boolean;
  brightGymMode?: boolean;
}

const LiveMatchHeader: React.FC<LiveMatchHeaderProps> = ({
  onBack,
  setNumber,
  opponentName,
  onShowTimeout,
  onShowStats,
  onShowMore,
  compact = false,
  brightGymMode = false,
}) => {
  const actionLabelClass = compact ? 'sr-only' : 'text-[8px] font-black uppercase mt-0.5';
  const surfaceClass = brightGymMode
    ? 'border-slate-300 bg-white text-slate-950 shadow-sm'
    : 'border-brand-gray/30 bg-[#0f1117] text-brand-text';
  const iconButtonClass = brightGymMode
    ? 'flex flex-col items-center rounded-lg p-1 text-slate-950 active:text-brand-teal'
    : 'flex flex-col items-center rounded-lg p-1 text-brand-text active:text-brand-teal';

  return (
    <header className={`flex items-center justify-between border-b ${surfaceClass} ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
      <button onClick={onBack} aria-label="Back" className={brightGymMode ? 'rounded-lg p-1 text-slate-950' : 'rounded-lg p-1 text-brand-text'}>
        <ArrowLeft size={compact ? 20 : 22} />
      </button>
      <div className="text-center">
        <h2 className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Set {setNumber}</h2>
        <p className={`${compact ? 'max-w-44 text-xs' : 'max-w-32 text-sm'} truncate font-black ${brightGymMode ? 'text-slate-950' : 'text-brand-text'}`}>vs {opponentName}</p>
      </div>
      <div className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
        <button 
          onClick={onShowTimeout} 
          className={iconButtonClass}
          aria-label="Timeout"
        >
          <RotateCcw size={compact ? 17 : 18} className="rotate-90" />
          <span className={actionLabelClass}>Timeout</span>
        </button>
        <button onClick={onShowStats} className={iconButtonClass} aria-label="Stats">
          <BarChart2 size={compact ? 19 : 22} />
          <span className={actionLabelClass}>Stats</span>
        </button>
        <button onClick={onShowMore} className={iconButtonClass} aria-label="More match actions">
          <MoreVertical size={compact ? 19 : 22} />
          <span className={actionLabelClass}>More</span>
        </button>
      </div>
    </header>
  );
};

export default LiveMatchHeader;
