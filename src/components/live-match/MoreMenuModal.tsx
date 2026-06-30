import React from 'react';
import { X, Trophy, AlertCircle } from 'lucide-react';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  setNumber: number;
  ourScore: number;
  opponentScore: number;
  onEndSet: (winner: 'Win' | 'Loss') => Promise<void>;
  onAbandonMatch: () => void;
}

const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  setNumber,
  ourScore,
  opponentScore,
  onEndSet,
  onAbandonMatch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-brand-bg/90 backdrop-blur-sm p-6 flex flex-col justify-end animate-in fade-in duration-300">
      <div className="bg-brand-gray/5 border border-brand-gray/20 rounded-3xl p-6 space-y-4 max-w-sm mx-auto w-full mb-20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold">Match Actions</h3>
          <button onClick={onClose} className="text-brand-text-secondary"><X size={24} /></button>
        </div>
        
        <button 
          onClick={() => {
            const winner = ourScore > opponentScore ? 'Win' : 'Loss';
            if (window.confirm(`End Set ${setNumber} as a ${winner}?`)) {
              onEndSet(winner);
            }
          }}
          className="w-full flex items-center justify-between p-4 bg-brand-teal/10 text-brand-teal rounded-2xl font-bold"
        >
          <div className="flex items-center gap-3">
            <Trophy size={20} />
            <span>End Set {setNumber}</span>
          </div>
          <span className="text-xs uppercase opacity-60">{ourScore} - {opponentScore}</span>
        </button>

        <button 
          onClick={() => {
            if (window.confirm("Abandon match? Current set data will be lost.")) {
              onAbandonMatch();
            }
          }}
          className="w-full flex items-center gap-3 p-4 bg-brand-red/10 text-brand-red rounded-2xl font-bold"
        >
          <AlertCircle size={20} />
          <span>Abandon Match</span>
        </button>
      </div>
    </div>
  );
};

export default MoreMenuModal;
