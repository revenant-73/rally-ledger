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
}

const LiveMatchHeader: React.FC<LiveMatchHeaderProps> = ({
  onBack,
  setNumber,
  opponentName,
  onShowTimeout,
  onShowStats,
  onShowMore,
  compact = false,
}) => {
  const actionLabelClass = compact ? 'sr-only' : 'text-[8px] font-black uppercase mt-0.5';

  return (
    <header className={`flex items-center justify-between border-b border-brand-gray/30 bg-[#0f1117] ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
      <button onClick={onBack} aria-label="Back" className="rounded-lg p-1 text-brand-text">
        <ArrowLeft size={compact ? 20 : 22} />
      </button>
      <div className="text-center">
        <h2 className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Set {setNumber}</h2>
        <p className={`${compact ? 'max-w-44 text-xs' : 'max-w-32 text-sm'} truncate font-black text-brand-text`}>vs {opponentName}</p>
      </div>
      <div className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
        <button 
          onClick={onShowTimeout} 
          className="flex flex-col items-center rounded-lg p-1 text-brand-text active:text-brand-teal"
          aria-label="Timeout"
        >
          <RotateCcw size={compact ? 17 : 18} className="rotate-90" />
          <span className={actionLabelClass}>Timeout</span>
        </button>
        <button onClick={onShowStats} className="flex flex-col items-center rounded-lg p-1 text-brand-text active:text-brand-teal" aria-label="Stats">
          <BarChart2 size={compact ? 19 : 22} />
          <span className={actionLabelClass}>Stats</span>
        </button>
        <button onClick={onShowMore} className="flex flex-col items-center rounded-lg p-1 text-brand-text active:text-brand-teal" aria-label="More match actions">
          <MoreVertical size={compact ? 19 : 22} />
          <span className={actionLabelClass}>More</span>
        </button>
      </div>
    </header>
  );
};

export default LiveMatchHeader;
