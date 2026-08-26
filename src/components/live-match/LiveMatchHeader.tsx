import React from 'react';
import { ArrowLeft, RotateCcw, BarChart2, MoreVertical } from 'lucide-react';

interface LiveMatchHeaderProps {
  onBack: () => void;
  setNumber: number;
  opponentName: string;
  onShowTimeout: () => void;
  onShowStats: () => void;
  onShowMore: () => void;
}

const LiveMatchHeader: React.FC<LiveMatchHeaderProps> = ({
  onBack,
  setNumber,
  opponentName,
  onShowTimeout,
  onShowStats,
  onShowMore,
}) => {
  return (
    <header className="flex items-center justify-between border-b border-brand-gray/30 bg-[#0f1117] px-3 py-2">
      <button onClick={onBack} aria-label="Back" className="rounded-lg p-1 text-brand-text">
        <ArrowLeft size={22} />
      </button>
      <div className="text-center">
        <h2 className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Set {setNumber}</h2>
        <p className="max-w-32 truncate text-sm font-black text-brand-text">vs {opponentName}</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={onShowTimeout} 
          className="flex flex-col items-center rounded-lg p-1 text-brand-text active:text-brand-teal"
        >
          <RotateCcw size={18} className="rotate-90" />
          <span className="text-[8px] font-black uppercase mt-0.5">Timeout</span>
        </button>
        <button onClick={onShowStats} className="flex flex-col items-center rounded-lg p-1 text-brand-text active:text-brand-teal">
          <BarChart2 size={22} />
          <span className="text-[8px] font-black uppercase mt-0.5">Stats</span>
        </button>
        <button onClick={onShowMore} className="flex flex-col items-center rounded-lg p-1 text-brand-text active:text-brand-teal">
          <MoreVertical size={22} />
          <span className="text-[8px] font-black uppercase mt-0.5">More</span>
        </button>
      </div>
    </header>
  );
};

export default LiveMatchHeader;
