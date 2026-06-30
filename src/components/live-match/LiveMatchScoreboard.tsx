import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface LiveMatchScoreboardProps {
  ourScore: number;
  opponentScore: number;
  ourName: string;
  opponentName: string;
  onManualScoreChange: (team: 'Us' | 'Opponent', delta: number) => void;
  servingTeam: 'Us' | 'Opponent';
  onToggleServingTeam: () => void;
}

const LiveMatchScoreboard: React.FC<LiveMatchScoreboardProps> = ({
  ourScore,
  opponentScore,
  ourName,
  opponentName,
  onManualScoreChange,
  servingTeam,
  onToggleServingTeam,
}) => {
  return (
    <div className="px-4 py-2 space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {/* Us Score */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-teal/20 h-20 relative">
            <span className="text-[10px] text-brand-text-secondary font-bold uppercase">Us</span>
            <span className="text-4xl font-black text-brand-teal leading-none">{ourScore}</span>
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => onManualScoreChange('Us', -1)}
              className="flex-1 bg-brand-gray/10 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-red/20 active:text-brand-red transition-all"
            >
              <Minus size={20} />
            </button>
            <button 
              onClick={() => onManualScoreChange('Us', 1)}
              className="flex-1 bg-brand-gray/10 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-teal/20 active:text-brand-teal transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Them Score */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-red/20 h-20 relative">
            <span className="text-[10px] text-brand-text-secondary font-bold uppercase">Them</span>
            <span className="text-4xl font-black text-brand-red leading-none">{opponentScore}</span>
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => onManualScoreChange('Opponent', -1)}
              className="flex-1 bg-brand-gray/10 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-red/20 active:text-brand-red transition-all"
            >
              <Minus size={20} />
            </button>
            <button 
              onClick={() => onManualScoreChange('Opponent', 1)}
              className="flex-1 bg-brand-gray/10 h-10 rounded-xl flex items-center justify-center text-brand-text-secondary active:bg-brand-teal/20 active:text-brand-teal transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Server Status */}
      <div className="flex gap-2">
        <button 
          onClick={onToggleServingTeam}
          className={`flex-1 border rounded-2xl p-3 flex flex-col items-center justify-center active:scale-[0.98] transition-all ${
            servingTeam === 'Us' ? 'bg-brand-teal/20 border-brand-teal text-brand-teal' : 'bg-brand-red/20 border-brand-red text-brand-red'
          }`}
        >
          <span className="text-[9px] font-bold uppercase opacity-60">Currently Serving</span>
          <span className="text-xl font-black uppercase tracking-tight leading-none">
            {servingTeam === 'Us' ? ourName : opponentName}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LiveMatchScoreboard;
