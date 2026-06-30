import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';

interface LeaderboardItem {
  name: string;
  count: number;
  jersey: string;
}

interface PlayerLeaderboardProps {
  topEarners: LeaderboardItem[];
  topGifters: LeaderboardItem[];
}

const PlayerLeaderboard: React.FC<PlayerLeaderboardProps> = ({
  topEarners,
  topGifters,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-brand-green" />
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Earners</h3>
        </div>
        <div className="space-y-4">
          {topEarners.length === 0 ? (
            <p className="text-xs text-brand-text-secondary italic">None yet</p>
          ) : topEarners.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-teal w-5">#{p.jersey}</span>
                <span className="text-sm font-bold">{p.name}</span>
              </div>
              <span className="text-lg font-black text-brand-green">{p.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-brand-amber" />
          <h3 className="text-sm font-bold text-brand-text-secondary uppercase tracking-widest">Gifters</h3>
        </div>
        <div className="space-y-4">
          {topGifters.length === 0 ? (
            <p className="text-xs text-brand-text-secondary italic">None yet</p>
          ) : topGifters.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-red w-5">#{p.jersey}</span>
                <span className="text-sm font-bold">{p.name}</span>
              </div>
              <span className="text-lg font-black text-brand-amber">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerLeaderboard;
