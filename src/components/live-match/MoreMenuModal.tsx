import React, { useState } from 'react';
import { X, Trophy, AlertCircle, Eye, Sun, Crosshair, RotateCcw, BarChart2, MessageSquare, Minus, Plus } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  setNumber: number;
  ourScore: number;
  opponentScore: number;
  onShowTimeout: () => void;
  onShowStats: () => void;
  onShowNote: () => void;
  onManualScoreChange: (team: 'Us' | 'Opponent', delta: number) => void;
  onEndSet: (winner: 'Win' | 'Loss') => Promise<void>;
  onEndMatch: (winner: 'Win' | 'Loss') => Promise<void>;
  onAbandonMatch: () => void;
  tableMode: boolean;
  onToggleTableMode: () => void;
  brightGymMode: boolean;
  onToggleBrightGymMode: () => void;
  scorerFocusMode: boolean;
  onToggleScorerFocusMode: () => void;
}

const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  setNumber,
  ourScore,
  opponentScore,
  onShowTimeout,
  onShowStats,
  onShowNote,
  onManualScoreChange,
  onEndSet,
  onEndMatch,
  onAbandonMatch,
  tableMode,
  onToggleTableMode,
  brightGymMode,
  onToggleBrightGymMode,
  scorerFocusMode,
  onToggleScorerFocusMode,
}) => {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const [showFinishMatchOptions, setShowFinishMatchOptions] = useState(false);

  if (!isOpen) return null;

  const handleMenuAction = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="fixed inset-0 z-[110] bg-brand-bg/90 backdrop-blur-sm p-6 flex flex-col justify-end animate-in fade-in duration-300">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-menu-modal-title"
        tabIndex={-1}
        className="max-h-[88dvh] w-full max-w-sm space-y-4 overflow-y-auto rounded-3xl border border-brand-gray/20 bg-brand-gray/5 p-6"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 id="more-menu-modal-title" className="text-xl font-bold">Match Actions</h3>
          <button onClick={onClose} className="text-brand-text-secondary" aria-label="Close"><X size={24} /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleMenuAction(onShowTimeout)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-brand-gray/20 bg-brand-gray/10 p-2 text-brand-text"
          >
            <RotateCcw size={18} className="rotate-90 text-brand-teal" />
            <span className="text-[9px] font-black uppercase">Timeout</span>
          </button>
          <button
            onClick={() => handleMenuAction(onShowStats)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-brand-gray/20 bg-brand-gray/10 p-2 text-brand-text"
          >
            <BarChart2 size={19} className="text-brand-teal" />
            <span className="text-[9px] font-black uppercase">Stats</span>
          </button>
          <button
            onClick={() => handleMenuAction(onShowNote)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-brand-gray/20 bg-brand-gray/10 p-2 text-brand-text"
          >
            <MessageSquare size={18} className="text-brand-teal" />
            <span className="text-[9px] font-black uppercase">Note</span>
          </button>
        </div>

        <button
          onClick={onToggleScorerFocusMode}
          className="flex w-full items-center justify-between rounded-2xl border border-brand-gray/20 bg-brand-gray/10 p-4 text-brand-text"
        >
          <div className="flex items-center gap-3">
            <Crosshair size={20} className="text-brand-green" />
            <div className="text-left">
              <span className="block font-bold">Scorer Focus Mode</span>
              <span className="text-xs font-semibold text-brand-text-secondary">Prioritize court and rally entry</span>
            </div>
          </div>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scorerFocusMode ? 'bg-brand-green' : 'bg-brand-gray/40'}`}
            aria-hidden="true"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scorerFocusMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </button>

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

        <div className="rounded-2xl border border-brand-gray/20 bg-brand-gray/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Score Corrections</span>
            <span className="text-xs font-black text-brand-text">{ourScore} - {opponentScore}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['Us', ourScore],
              ['Opponent', opponentScore],
            ] as const).map(([team, score]) => (
              <div key={team} className="rounded-xl border border-brand-gray/20 bg-brand-bg/60 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-brand-text-secondary">{team}</span>
                  <span className="text-lg font-black text-brand-text">{score}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onManualScoreChange(team, -1)}
                    className="flex h-8 items-center justify-center rounded-lg border border-brand-gray/30 text-brand-text active:border-brand-teal active:text-brand-teal"
                    aria-label={`Decrease ${team === 'Us' ? 'our' : 'their'} score`}
                  >
                    <Minus size={15} />
                  </button>
                  <button
                    onClick={() => onManualScoreChange(team, 1)}
                    className="flex h-8 items-center justify-center rounded-lg border border-brand-gray/30 text-brand-text active:border-brand-teal active:text-brand-teal"
                    aria-label={`Increase ${team === 'Us' ? 'our' : 'their'} score`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
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

        <div className="rounded-2xl border border-brand-green/20 bg-brand-green/10 p-3">
          <button
            onClick={() => setShowFinishMatchOptions((current) => !current)}
            className="flex w-full items-center justify-between text-brand-green"
            aria-expanded={showFinishMatchOptions}
          >
            <div className="flex items-center gap-3 font-bold">
              <Trophy size={20} />
              <span>Finish Match Now</span>
            </div>
            <span className="text-xs font-black uppercase opacity-70">{ourScore} - {opponentScore}</span>
          </button>

          {showFinishMatchOptions && (
            <div className="mt-3 space-y-3 border-t border-brand-green/20 pt-3">
              <div className="flex items-center justify-between rounded-xl bg-brand-bg/60 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Current set {setNumber}</span>
                <span className="text-sm font-black text-brand-text">{ourScore} - {opponentScore}</span>
              </div>
              <p className="text-xs font-semibold text-brand-text-secondary">
                Closes this set and marks the match completed. Rally stats stay in reports.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onEndMatch('Win')}
                  className="rounded-xl bg-brand-green px-3 py-3 text-sm font-black uppercase text-brand-bg active:scale-95"
                >
                  Finish Win
                </button>
                <button
                  onClick={() => onEndMatch('Loss')}
                  className="rounded-xl border border-brand-red/40 bg-brand-red/10 px-3 py-3 text-sm font-black uppercase text-brand-red active:scale-95"
                >
                  Finish Loss
                </button>
              </div>
            </div>
          )}
        </div>

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
