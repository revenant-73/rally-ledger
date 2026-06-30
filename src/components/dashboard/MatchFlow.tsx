import React from 'react';

interface MatchFlowProps {
  ourScore: number;
  opponentScore: number;
  setNumber: number;
  winProb: number;
  flow: number[];
}

const MatchFlow: React.FC<MatchFlowProps> = ({
  ourScore,
  opponentScore,
  setNumber,
  winProb,
  flow,
}) => {
  return (
    <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
      <div className="flex justify-between items-center mb-6 pb-6 border-b border-brand-gray/10">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-1">Us</span>
          <span className="text-4xl font-black text-brand-teal">{ourScore}</span>
        </div>
        <div className="flex flex-col items-center opacity-20">
          <span className="text-lg font-black text-brand-text-secondary uppercase">SET {setNumber}</span>
          <div className="h-0.5 w-12 bg-brand-text-secondary mt-1 rounded-full" />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-1">Them</span>
          <span className="text-4xl font-black text-brand-red">{opponentScore}</span>
        </div>
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Match Flow</h3>
          <p className="text-[8px] text-brand-text-secondary font-bold uppercase mt-1">Live Trend</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-brand-teal">{winProb}%</span>
          <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Win Prob</p>
        </div>
      </div>
      <div className="h-24 flex items-end gap-1 relative">
        {/* Visual background grid */}
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-full w-px bg-brand-text" />
          ))}
        </div>
        
        {flow.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-brand-text-secondary italic">No data yet</div>
        ) : flow.map((diff, i) => {
          const height = Math.min(Math.abs(diff) * 10, 100);
          const isPositive = diff >= 0;
          return (
            <div key={i} className="flex-1 flex flex-col justify-center h-full relative group">
              <div 
                className={`w-full rounded-full transition-all duration-500 shadow-sm ${
                  isPositive ? 'bg-brand-teal shadow-brand-teal/20' : 'bg-brand-red opacity-60 shadow-brand-red/20'
                }`}
                style={{ 
                  height: `${height}%`,
                  transform: `translateY(${isPositive ? '-50%' : '50%'})`
                }}
              />
              {/* Vertical separator every 5 points for glancability */}
              {(i + 1) % 5 === 0 && (
                <div className="absolute inset-y-0 -right-0.5 w-px bg-brand-gray/10" />
              )}
            </div>
          );
        })}
        <div className="absolute top-1/2 left-0 right-0 border-t border-brand-gray/20 pointer-events-none" />
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-bold text-brand-text-secondary uppercase">
        <span>Start</span>
        <span>Current: {flow[flow.length - 1] > 0 ? '+' : ''}{flow[flow.length - 1] || 0}</span>
      </div>
    </div>
  );
};

export default MatchFlow;
