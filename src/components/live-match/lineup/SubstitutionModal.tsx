import React from 'react';
import { X, ArrowLeftRight, ShieldCheck, Zap } from 'lucide-react';
import type { Player, Lineup } from '../../../types';

interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  lineup: Lineup;
  positionIdx: number; // 1-6
  onSubstitute: (newPlayerId: string) => void;
  onLiberoSwap: (liberoId: string | null) => void;
  onSetLiberoServing: (isServing: boolean) => void;
  liberoServingPosition?: number;
}

const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  onClose,
  players,
  lineup,
  positionIdx,
  onSubstitute,
  onLiberoSwap,
  onSetLiberoServing,
  liberoServingPosition
}) => {
  if (!isOpen) return null;

  const currentPlayerId = lineup[`position${positionIdx}` as keyof Lineup] as string;
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const designatedLiberos = [lineup.libero1, lineup.libero2].filter(Boolean).map(id => players.find(p => p.id === id));
  
  const isOnCourt = (playerId: string) => {
    return [lineup.position1, lineup.position2, lineup.position3, lineup.position4, lineup.position5, lineup.position6].includes(playerId);
  };

  const availablePlayers = players.filter(p => !isOnCourt(p.id) && p.id !== lineup.libero1 && p.id !== lineup.libero2);
  const isLiberoOnCourt = currentPlayer?.position === 'L' || currentPlayer?.position === 'DS';
  const canLiberoServe = !liberoServingPosition || liberoServingPosition === positionIdx;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-brand-bg border-t sm:border border-brand-gray/20 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-brand-gray/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={20} className="text-brand-teal" />
            <h2 className="text-lg font-black uppercase tracking-tight">Position {positionIdx} Management</h2>
          </div>
          <button onClick={onClose} className="p-2 text-brand-text-secondary">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 bg-brand-gray/5 border-b border-brand-gray/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${isLiberoOnCourt ? 'bg-brand-amber text-brand-bg' : 'bg-brand-teal text-brand-bg'}`}>
              #{currentPlayer?.jerseyNumber}
            </div>
            <div>
              <p className="font-bold">{currentPlayer?.firstName} {currentPlayer?.lastName}</p>
              <p className="text-xs font-bold text-brand-text-secondary uppercase">{currentPlayer?.position} • Position {positionIdx}</p>
            </div>
          </div>
          {isLiberoOnCourt && (
             <button 
                onClick={() => onLiberoSwap(null)}
                className="bg-brand-gray/10 text-brand-text px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
             >
                Exit Libero
             </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Libero Serving Toggle */}
          {isLiberoOnCourt && (
            <section className="bg-brand-amber/5 border border-brand-amber/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand-amber">
                  <Zap size={18} />
                  <span className="font-bold text-sm uppercase">Libero Serving</span>
                </div>
                <button 
                  onClick={() => onSetLiberoServing(liberoServingPosition !== positionIdx)}
                  disabled={!canLiberoServe}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${liberoServingPosition === positionIdx ? 'bg-brand-amber' : 'bg-brand-gray/20'} ${!canLiberoServe ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${liberoServingPosition === positionIdx ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {!canLiberoServe && (
                <p className="text-[10px] text-brand-amber/60 mt-2 italic">A libero can only serve for one position per set.</p>
              )}
            </section>
          )}

          {/* Quick Libero Swap */}
          {designatedLiberos.length > 0 && !isLiberoOnCourt && (
            <section>
              <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-3 ml-1">Libero Swap</h3>
              <div className="grid grid-cols-2 gap-2">
                {designatedLiberos.map(libero => libero && (
                  <button
                    key={libero.id}
                    onClick={() => onLiberoSwap(libero.id)}
                    className="flex items-center gap-3 p-3 bg-brand-amber/10 border border-brand-amber/20 rounded-xl hover:bg-brand-amber/20 transition-all active:scale-95"
                  >
                    <div className="w-8 h-8 bg-brand-amber text-brand-bg rounded-lg flex items-center justify-center font-black">
                      #{libero.jerseyNumber}
                    </div>
                    <span className="font-bold text-sm">Swap Libero</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Regular Substitutions */}
          <section>
            <h3 className="text-[10px] font-black text-brand-text-secondary uppercase tracking-widest mb-3 ml-1">Substitute Player</h3>
            <div className="grid grid-cols-3 gap-2">
              {availablePlayers.sort((a,b) => Number(a.jerseyNumber) - Number(b.jerseyNumber)).map(player => (
                <button
                  key={player.id}
                  onClick={() => onSubstitute(player.id)}
                  className="flex flex-col items-center justify-center p-3 bg-brand-gray/5 border border-brand-gray/10 rounded-xl hover:border-brand-teal/50 active:scale-95 transition-all"
                >
                  <span className="text-xl font-black text-brand-teal">#{player.jerseyNumber}</span>
                  <span className="text-[9px] font-bold uppercase truncate w-full text-center">{player.firstName}</span>
                </button>
              ))}
              {availablePlayers.length === 0 && (
                <p className="col-span-3 text-center py-4 text-xs text-brand-text-secondary italic">No bench players available.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionModal;
