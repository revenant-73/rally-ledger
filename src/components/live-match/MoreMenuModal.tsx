import React from 'react';
import { X, Trophy, AlertCircle, Eye, Sun } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  setNumber: number;
  ourScore: number;
  opponentScore: number;
  onEndSet: (winner: 'Win' | 'Loss') => Promise<void>;
  onEndMatch: (winner: 'Win' | 'Loss') => Promise<void>;
  onAbandonMatch: () => void;
  tableMode: boolean;
  onToggleTableMode: () => void;
  brightGymMode: boolean;
  onToggleBrightGymMode: () => void;
}

const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  setNumber,
  ourScore,
  opponentScore,
  onEndSet,
  onEndMatch,
  onAbandonMatch,
  tableMode,
  onToggleTableMode,
  brightGymMode,
  onToggleBrightGymMode,
}) => {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-brand-bg/90 backdrop-blur-sm p-6 flex flex-col justify-end animate-in fade-in duration-300">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-menu-modal-title"
        tabIndex={-1}
        className="bg-brand-gray/5 border border-brand-gray/20 rounded-3xl p-6 space-y-4 max-w-sm mx-auto w-full mb-20"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 id="more-menu-modal-title" className="text-xl font-bold">Match Actions</h3>
          <button onClick={onClose} className="text-brand-text-secondary" aria-label="Close"><X size={24} /></button>
        </div>

        <button
          onClick={onToggleTableMode}
          className="flex w-full items-center justify-between rounded-2xl border border-brand-gray/20 bg-brand-gray/10 p-4 text-brand-text"
        >
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-brand-teal" />
            <div className="text-left">
              <span className="block font-bold">Table Mode</span>
              <span className="text-xs font-semibold text-brand-text-secondary">Compact header and bottom controls</span>
            </div>
          </div>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${tableMode ? 'bg-brand-teal' : 'bg-brand-gray/40'}`}
            aria-hidden="true"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${tableMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </button>

        <button
          onClick={onToggleBrightGymMode}
          className="flex w-full items-center justify-between rounded-2xl border border-brand-gray/20 bg-brand-gray/10 p-4 text-brand-text"
        >
          <div className="flex items-center gap-3">
            <Sun size={20} className="text-brand-amber" />
            <div className="text-left">
              <span className="block font-bold">Bright Gym Mode</span>
              <span className="text-xs font-semibold text-brand-text-secondary">Higher contrast for bright courts</span>
            </div>
          </div>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${brightGymMode ? 'bg-brand-amber' : 'bg-brand-gray/40'}`}
            aria-hidden="true"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${brightGymMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </button>
        
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
            const winner = ourScore > opponentScore ? 'Win' : 'Loss';
            if (window.confirm(`End Set ${setNumber} as a ${winner} and finish the match?`)) {
              onEndMatch(winner);
            }
          }}
          className="w-full flex items-center justify-between p-4 bg-brand-green/10 text-brand-green rounded-2xl font-bold"
        >
          <div className="flex items-center gap-3">
            <Trophy size={20} />
            <span>End Match</span>
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
