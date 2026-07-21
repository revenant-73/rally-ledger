import React, { useState } from 'react';
import type { Player, Lineup } from '../../../types';
import { CheckCircle2 } from 'lucide-react';

interface LineupSelectionProps {
  players: Player[];
  onComplete: (lineup: Lineup) => void;
  onCancel: () => void;
}

const POSITIONS = [
  { id: 1, label: 'Pos 1 (Server)', description: 'Right Back' },
  { id: 2, label: 'Pos 2', description: 'Right Front' },
  { id: 3, label: 'Pos 3', description: 'Middle Front' },
  { id: 4, label: 'Pos 4', description: 'Left Front' },
  { id: 5, label: 'Pos 5', description: 'Left Back' },
  { id: 6, label: 'Pos 6', description: 'Middle Back' },
  { id: 7, label: 'Libero 1', description: 'Defensive Specialist' },
  { id: 8, label: 'Libero 2', description: 'Defensive Specialist' },
];

const LineupSelection: React.FC<LineupSelectionProps> = ({ players, onComplete, onCancel }) => {
  const [lineup, setLineup] = useState<Partial<Record<number, string>>>({});
  const [activePosition, setActivePosition] = useState<number>(1);

  const handlePlayerSelect = (playerId: string) => {
    // Check if player is already in another position
    const existingPos = Object.entries(lineup).find(([, id]) => id === playerId);
    if (existingPos) {
      const [pos] = existingPos;
      setLineup(prev => ({ ...prev, [pos]: undefined, [activePosition]: playerId }));
    } else {
      setLineup(prev => ({ ...prev, [activePosition]: playerId }));
    }

    // Auto-advance to next position if not all filled
    if (activePosition < 8) {
      setActivePosition(activePosition + 1);
    }
  };

  const isComplete = Object.keys(lineup).filter(k => lineup[Number(k)] && Number(k) <= 6).length === 6;

  const handleFinish = () => {
    if (isComplete) {
      onComplete({
        position1: lineup[1]!,
        position2: lineup[2]!,
        position3: lineup[3]!,
        position4: lineup[4]!,
        position5: lineup[5]!,
        position6: lineup[6]!,
        libero1: lineup[7],
        libero2: lineup[8],
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-brand-bg">
      <div className="p-4 border-b border-brand-gray/10 flex items-center justify-between">
        <h2 className="text-xl font-bold">Set Starting Lineup</h2>
        <button onClick={onCancel} className="text-brand-text-secondary font-bold">Cancel</button>
      </div>

      <div className="p-4 space-y-4 bg-brand-gray/5">
        <div className="grid grid-cols-3 gap-2">
          {[4, 3, 2, 5, 6, 1].map(posId => {
            const pos = POSITIONS.find(p => p.id === posId)!;
            return (
              <button
                key={pos.id}
                onClick={() => setActivePosition(pos.id)}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                  activePosition === pos.id 
                    ? 'border-brand-teal bg-brand-teal/10' 
                    : lineup[pos.id] 
                      ? 'border-brand-green/30 bg-brand-green/5' 
                      : 'border-brand-gray/20 bg-brand-bg'
                }`}
              >
                <span className="text-[10px] font-black uppercase opacity-60">Pos {pos.id}</span>
                <span className="text-lg font-black text-brand-teal">
                  {lineup[pos.id] ? players.find(p => p.id === lineup[pos.id])?.jerseyNumber : '?'}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {[7, 8].map(posId => {
            const pos = POSITIONS.find(p => p.id === posId)!;
            return (
              <button
                key={pos.id}
                onClick={() => setActivePosition(pos.id)}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center border-dashed ${
                  activePosition === pos.id 
                    ? 'border-brand-amber bg-brand-amber/10' 
                    : lineup[pos.id] 
                      ? 'border-brand-amber/30 bg-brand-amber/5' 
                      : 'border-brand-gray/20 bg-brand-bg'
                }`}
              >
                <span className="text-[10px] font-black uppercase opacity-60">{pos.label}</span>
                <span className="text-lg font-black text-brand-amber">
                  {lineup[pos.id] ? players.find(p => p.id === lineup[pos.id])?.jerseyNumber : 'NONE'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-4 gap-2">
          {players.sort((a,b) => Number(a.jerseyNumber) - Number(b.jerseyNumber)).map(player => {
            const currentPos = Object.entries(lineup).find(([, id]) => id === player.id)?.[0];
            return (
              <button
                key={player.id}
                onClick={() => handlePlayerSelect(player.id)}
                className={`py-4 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  currentPos 
                    ? 'bg-brand-teal text-brand-bg shadow-inner' 
                    : 'bg-brand-gray/10 text-brand-text'
                }`}
              >
                {currentPos && (
                  <span className="absolute top-1 right-1 bg-brand-bg text-brand-teal text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {currentPos}
                  </span>
                )}
                <span className="text-xl font-black">#{player.jerseyNumber}</span>
                <span className="text-[10px] font-bold uppercase truncate w-full px-1 text-center">{player.firstName}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 bg-brand-bg border-t border-brand-gray/10">
        <button
          onClick={handleFinish}
          disabled={!isComplete}
          className={`w-full py-5 rounded-2xl text-xl font-black flex items-center justify-center gap-3 transition-all ${
            isComplete 
              ? 'bg-brand-green text-brand-bg shadow-xl' 
              : 'bg-brand-gray/20 text-brand-text-secondary cursor-not-allowed'
          }`}
        >
          {isComplete ? <CheckCircle2 /> : null}
          {isComplete ? 'READY TO START' : 'ASSIGN ALL 6 POSITIONS'}
        </button>
      </div>
    </div>
  );
};

export default LineupSelection;
