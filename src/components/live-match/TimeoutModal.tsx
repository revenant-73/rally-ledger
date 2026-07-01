import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import type { RallyEvent } from '../../types';
import { calculateAdvancedStats } from '../../utils/stats';

interface TimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  ourScore: number;
  opponentScore: number;
  ourEarned: number;
  ourGifted: number;
  rallies: RallyEvent[];
}

const TimeoutModal: React.FC<TimeoutModalProps> = ({
  isOpen,
  onClose,
  ourScore,
  opponentScore,
  ourEarned,
  ourGifted,
  rallies,
}) => {
  if (!isOpen) return null;

  const stats = calculateAdvancedStats(rallies);

  return (
    <div className="fixed inset-0 z-[120] bg-brand-bg/95 backdrop-blur-md p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      <div className="w-full max-sm space-y-8">
        <header className="text-center">
          <h2 className="text-4xl font-black text-brand-teal mb-2">TIMEOUT</h2>
          <p className="text-brand-text-secondary uppercase tracking-widest font-bold">Match Weather Update</p>
        </header>

        <div className="bg-brand-gray/5 border border-brand-teal/20 rounded-3xl p-8 space-y-8">
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <p className="text-5xl font-black text-brand-teal">{ourScore}</p>
              <p className="text-xs font-bold text-brand-text-secondary uppercase mt-2">Us</p>
            </div>
            <div className="text-center">
              <p className="text-5xl font-black text-brand-red">{opponentScore}</p>
              <p className="text-xs font-bold text-brand-text-secondary uppercase mt-2">Them</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-gray/10">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-brand-green" />
                <span className="text-sm font-bold">Points Earned</span>
              </div>
              <span className="font-black text-brand-green">
                {ourEarned}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-brand-bg rounded-2xl border border-brand-gray/10">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-brand-red" />
                <span className="text-sm font-bold">Points Gifted</span>
              </div>
              <span className="font-black text-brand-red">
                {ourGifted}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-brand-teal/10 border border-brand-teal/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-brand-teal">{stats.sideOutPercentage.toFixed(0)}%</p>
              <p className="text-[10px] font-bold text-brand-text-secondary uppercase">SO%</p>
            </div>
            <div className="bg-brand-amber/10 border border-brand-amber/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-brand-amber">{stats.pointScoringPercentage.toFixed(0)}%</p>
              <p className="text-[10px] font-bold text-brand-text-secondary uppercase">PS%</p>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-brand-teal text-brand-bg font-black py-6 rounded-2xl text-xl shadow-2xl active:scale-[0.98] transition-all"
        >
          RESUME TRACKING
        </button>
      </div>
    </div>
  );
};

export default TimeoutModal;
