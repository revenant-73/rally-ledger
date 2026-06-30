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
    <header className="p-4 flex items-center justify-between border-b border-brand-gray/10">
      <button onClick={onBack} className="text-brand-text-secondary">
        <ArrowLeft size={24} />
      </button>
      <div className="text-center">
        <h2 className="text-sm font-medium text-brand-text-secondary uppercase tracking-wider">Set {setNumber}</h2>
        <p className="font-bold">vs {opponentName}</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={onShowTimeout} 
          className="text-brand-text-secondary active:text-brand-teal p-1 flex flex-col items-center"
        >
          <RotateCcw size={20} className="rotate-90" />
          <span className="text-[8px] font-black uppercase mt-0.5">Timeout</span>
        </button>
        <button onClick={onShowStats} className="text-brand-text-secondary active:text-brand-teal p-1 flex flex-col items-center">
          <BarChart2 size={24} />
          <span className="text-[8px] font-black uppercase mt-0.5">Stats</span>
        </button>
        <button onClick={onShowMore} className="text-brand-text-secondary active:text-brand-teal p-1 flex flex-col items-center">
          <MoreVertical size={24} />
          <span className="text-[8px] font-black uppercase mt-0.5">More</span>
        </button>
      </div>
    </header>
  );
};

export default LiveMatchHeader;
