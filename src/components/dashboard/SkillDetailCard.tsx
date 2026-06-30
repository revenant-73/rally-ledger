import React, { useState } from 'react';

interface ServingPlayer {
  name: string;
  jersey: string;
  koPct: number;
  servePct: number;
}

interface PassingPlayer {
  name: string;
  jersey: string;
  score: number;
  ace: number;
  overpass: number;
  oos: number;
  is: number;
}

interface SkillDetailCardProps {
  servingByPlayer: ServingPlayer[];
  passingByPlayer: PassingPlayer[];
}

const SkillDetailCard: React.FC<SkillDetailCardProps> = ({
  servingByPlayer,
  passingByPlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'serving' | 'passing'>('serving');

  return (
    <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl overflow-hidden">
      <div className="flex border-b border-brand-gray/10">
        <button 
          onClick={() => setActiveTab('serving')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'serving' ? 'bg-brand-teal/10 text-brand-teal' : 'text-brand-text-secondary'
          }`}
        >
          Serving
        </button>
        <button 
          onClick={() => setActiveTab('passing')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'passing' ? 'bg-brand-teal/10 text-brand-teal' : 'text-brand-text-secondary'
          }`}
        >
          Passing
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'serving' ? (
          <div className="space-y-4">
            <div className="flex justify-between text-[8px] font-black text-brand-text-secondary uppercase tracking-tighter px-1">
              <span>Player</span>
              <div className="flex gap-8">
                <span className="w-8 text-right">KO%</span>
                <span className="w-8 text-right">IN%</span>
              </div>
            </div>
            {servingByPlayer.length === 0 ? (
              <p className="text-xs text-brand-text-secondary italic text-center py-4">No serve data yet</p>
            ) : servingByPlayer.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-brand-teal w-5">#{p.jersey}</span>
                  <span className="text-sm font-bold">{p.name}</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-sm font-black text-brand-teal w-8 text-right">{p.koPct}%</span>
                  <span className="text-sm font-bold text-brand-text-secondary w-8 text-right">{p.servePct}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-[8px] font-black text-brand-text-secondary uppercase tracking-tighter px-1">
              <span>Player</span>
              <div className="flex gap-8">
                <span className="w-8 text-right">3/2/1/0</span>
                <span className="w-8 text-right">Score</span>
              </div>
            </div>
            {passingByPlayer.length === 0 ? (
              <p className="text-xs text-brand-text-secondary italic text-center py-4">No passing data yet</p>
            ) : passingByPlayer.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-brand-teal w-5">#{p.jersey}</span>
                  <span className="text-sm font-bold">{p.name}</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-[10px] font-bold text-brand-text-secondary w-8 text-right">
                    {p.is}/{p.oos}/{p.overpass}/{p.ace}
                  </span>
                  <span className={`text-sm font-black w-8 text-right ${
                    p.score >= 2.2 ? 'text-brand-green' : p.score >= 1.8 ? 'text-brand-teal' : 'text-brand-amber'
                  }`}>{p.score}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillDetailCard;
