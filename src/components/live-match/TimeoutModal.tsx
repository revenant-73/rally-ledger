import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';

interface TimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  ourScore: number;
  opponentScore: number;
  ourEarned: number;
  ourGifted: number;
}

const TimeoutModal: React.FC<TimeoutModalProps> = ({
  isOpen,
  onClose,
  ourScore,
  opponentScore,
  ourEarned,
  ourGifted,
}) => {
  if (!isOpen) return null;

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
