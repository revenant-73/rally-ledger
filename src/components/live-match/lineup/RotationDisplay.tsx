import React from 'react';
import type { Player, Lineup } from '../../../types';
import { RotateCw } from 'lucide-react';

interface RotationDisplayProps {
  lineup: Lineup;
  startingLineup?: Lineup | null;
  players: Player[];
  currentRotation: number;
  servingTeam: 'Us' | 'Opponent';
  onManualRotate?: () => void;
  onPlayerClick?: (playerIdx: number) => void;
  liberoServingPosition?: number;
  brightGymMode?: boolean;
}

const RotationDisplay: React.FC<RotationDisplayProps> = ({ 
  lineup, 
  startingLineup,
  players, 
  currentRotation,
  servingTeam,
  onManualRotate,
  onPlayerClick,
  liberoServingPosition,
  brightGymMode = false
}) => {
  // Map positions to their current location based on rotation
  // Rotation 1: Pos 1 is back right, Pos 2 is front right, etc.
  // We want to show the current physical positions on the court.
  
  const getPlayerInfoByPos = (physicalZone: number) => {
    // physicalZone 1 is Bottom Right
    // physicalZone 2 is Top Right
    // physicalZone 3 is Top Middle
    // physicalZone 4 is Top Left
    // physicalZone 5 is Bottom Left
    // physicalZone 6 is Bottom Middle

    // Logic: In Rotation 1, Player 1 is in Zone 1.
    // In Rotation 2 (one rotation), Player 1 moves to Zone 6.
    // Formula for player index (1-6) that is currently in physicalZone (1-6):
    let playerIdx = (physicalZone + currentRotation - 1);
    if (playerIdx > 6) playerIdx -= 6;
    
    const playerId = lineup[`position${playerIdx}` as keyof Lineup] as string;
    const player = players.find(p => p.id === playerId);
    
    return { player, playerIdx };
  };

  // Physical Layout from User Perspective (Fixed Zones):
  // [ Pos 4 (Top Left) ] [ Pos 3 (Top Mid) ] [ Pos 2 (Top Right) ]
  // [ Pos 5 (Bot Left) ] [ Pos 6 (Bot Mid) ] [ Pos 1 (Bot Right) ]
  const positions = [4, 3, 2, 5, 6, 1];

  return (
    <div className={`rounded-xl border p-2 ${brightGymMode ? 'border-slate-300 bg-white shadow-sm' : 'border-brand-gray/40 bg-[#0f1117]'}`}>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[10px] font-black uppercase text-brand-teal tracking-widest">Rotation {currentRotation}</h4>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(r => (
              <div 
                key={r} 
                className={`h-1.5 w-1.5 rounded-full ${r === currentRotation ? 'bg-brand-teal' : brightGymMode ? 'bg-slate-400' : 'bg-brand-gray/40'}`}
              />
            ))}
          </div>
          {onManualRotate && (
            <button
              onClick={onManualRotate}
              className={`${brightGymMode ? 'text-slate-700' : 'text-brand-text-secondary'} active:text-brand-teal transition-colors`}
              title="Manual Rotate"
              aria-label="Manually advance rotation"
            >
              <RotateCw size={12} />
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-1 aspect-[5/2] relative">
        {/* Net Indicator */}
        <div className="absolute -top-1 left-0 right-0 flex justify-center z-10">
          <div className={`${brightGymMode ? 'bg-slate-400' : 'bg-brand-gray/40'} h-[2px] w-full rounded-full flex items-center justify-center`}>
            <span className={`${brightGymMode ? 'bg-white text-slate-700' : 'bg-brand-gray/20 text-brand-text-secondary'} px-2 py-0.5 rounded-full text-[4px] font-black uppercase tracking-[0.2em]`}>The Net</span>
          </div>
        </div>

        {positions.map(pos => {
          const { player, playerIdx } = getPlayerInfoByPos(pos);
          // The server is ALWAYS the player physically in Position 1
          const isServer = servingTeam === 'Us' && pos === 1;
          const isLibero = player?.position === 'L' || player?.position === 'DS'; // Simplification for UI
          const isLiberoServing = isServer && playerIdx === liberoServingPosition;
          const startingPlayerId = startingLineup?.[`position${playerIdx}` as keyof Lineup] as string | undefined;
          const starter = players.find(p => p.id === startingPlayerId);
          const isSubstitution = Boolean(player && startingPlayerId && player.id !== startingPlayerId && !isLibero);
          
          const playerLabel = player ? `#${player.jerseyNumber} ${player.firstName} ${player.lastName}` : 'empty';
          const starterLabel = starter ? ` for #${starter.jerseyNumber} ${starter.firstName} ${starter.lastName}` : '';

          return (
            <button
              key={pos}
              onClick={() => onPlayerClick?.(playerIdx)}
              disabled={!onPlayerClick}
              aria-label={`Position ${pos}: ${playerLabel}${isSubstitution ? `, substituted${starterLabel}` : ''}${isServer ? ', serving' : ''}${isLiberoServing ? ', libero serving' : ''}`}
              className={`relative rounded-md flex flex-col items-center justify-center border transition-all ${
                isServer 
                  ? 'bg-brand-teal/25 border-brand-teal shadow-inner'
                  : isSubstitution
                    ? 'bg-brand-green/15 border-brand-green/60'
                  : brightGymMode
                    ? 'bg-slate-50 border-slate-300'
                    : 'bg-brand-bg border-brand-gray/40'
              } ${onPlayerClick ? 'active:scale-95' : ''}`}
            >
              <div className={`absolute top-0.5 right-0.5 rounded-[2px] px-0.5 ${brightGymMode ? 'bg-slate-200' : 'bg-brand-gray/30'}`}>
                <span className={`text-[6px] font-black ${brightGymMode ? 'text-slate-950' : 'text-brand-text'}`}>{pos}</span>
              </div>
              
              {isLibero && (
                <div className="absolute top-0.5 left-0.5">
                  <div className="w-1.5 h-1.5 bg-brand-amber rounded-full" />
                </div>
              )}

              {isSubstitution && (
                <div className="absolute top-0.5 left-0.5 rounded-[2px] bg-brand-green px-1 py-0.5 text-[5px] font-black uppercase leading-none text-brand-bg">
                  Sub
                </div>
              )}

              <span className={`text-xl font-black leading-none ${isServer ? 'text-brand-teal' : brightGymMode ? 'text-slate-950' : 'text-brand-text'} ${isLibero ? 'text-brand-amber' : ''}`}>
                {player?.jerseyNumber || '?'}
              </span>

              {isSubstitution && starter && (
                <span className="mt-0.5 text-[5px] font-black uppercase leading-none text-brand-green">
                  for #{starter.jerseyNumber}
                </span>
              )}
              
              {isLiberoServing && (
                <div className="absolute -bottom-0.5 bg-brand-amber text-brand-bg text-[4px] font-black px-0.5 rounded uppercase">Libero</div>
              )}

              {isServer && !isLiberoServing && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-teal rounded-full flex items-center justify-center">
                  <div className="w-0.5 h-0.5 bg-brand-bg rounded-full animate-ping" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RotationDisplay;
