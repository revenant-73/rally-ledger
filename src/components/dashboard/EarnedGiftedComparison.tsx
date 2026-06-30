import React from 'react';

interface EarnedGiftedComparisonProps {
  ourEarned: number;
  ourGifted: number;
  oppEarned: number;
  oppGifted: number;
}

const EarnedGiftedComparison: React.FC<EarnedGiftedComparisonProps> = ({
  ourEarned,
  ourGifted,
  oppEarned,
  oppGifted,
}) => {
  return (
    <div className="space-y-4">
      {/* Our Execution */}
      <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Our Execution</h3>
            <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Earned vs Leaks</p>
          </div>
          <div className="text-right">
            <span className={`text-xl font-black ${ourEarned >= ourGifted ? 'text-brand-green' : 'text-brand-amber'}`}>
              {ourEarned - ourGifted > 0 ? '+' : ''}{ourEarned - ourGifted}
            </span>
          </div>
        </div>
        <div className="relative h-6 bg-brand-gray/10 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-brand-green transition-all duration-700 ease-out flex items-center justify-end px-3" 
            style={{ width: `${(ourEarned / ((ourEarned + ourGifted) || 1)) * 100}%` }}
          >
            {ourEarned > 0 && <span className="text-[10px] font-black text-brand-bg">+{ourEarned}</span>}
          </div>
          <div 
            className="h-full bg-brand-amber transition-all duration-700 ease-out flex items-center justify-start px-3" 
            style={{ width: `${(ourGifted / ((ourEarned + ourGifted) || 1)) * 100}%` }}
          >
            {ourGifted > 0 && <span className="text-[10px] font-black text-brand-bg">-{ourGifted}</span>}
          </div>
        </div>
      </div>

      {/* Their Execution */}
      <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Their Execution</h3>
            <p className="text-[10px] text-brand-text-secondary font-bold uppercase mt-1">Earned vs Given</p>
          </div>
          <div className="text-right">
            <span className={`text-xl font-black ${oppEarned >= oppGifted ? 'text-brand-text' : 'text-brand-gray'}`}>
              {oppEarned - oppGifted > 0 ? '+' : ''}{oppEarned - oppGifted}
            </span>
          </div>
        </div>
        <div className="relative h-6 bg-brand-gray/10 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-brand-text transition-all duration-700 ease-out flex items-center justify-end px-3" 
            style={{ width: `${(oppEarned / ((oppEarned + oppGifted) || 1)) * 100}%` }}
          >
            {oppEarned > 0 && <span className="text-[10px] font-black text-brand-bg">+{oppEarned}</span>}
          </div>
          <div 
            className="h-full bg-brand-gray transition-all duration-700 ease-out flex items-center justify-start px-3" 
            style={{ width: `${(oppGifted / ((oppEarned + oppGifted) || 1)) * 100}%` }}
          >
            {oppGifted > 0 && <span className="text-[10px] font-black text-brand-bg">-{oppGifted}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarnedGiftedComparison;
