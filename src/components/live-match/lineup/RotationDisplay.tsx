import React from 'react';
import type { Player, Lineup } from '../../../types';
import { RotateCw } from 'lucide-react';

interface RotationDisplayProps {
  lineup: Lineup;
  players: Player[];
  currentRotation: number;
  servingTeam: 'Us' | 'Opponent';
  onManualRotate?: () => void;
  onPlayerClick?: (playerIdx: number) => void;
  liberoServingPosition?: number;
}

const RotationDisplay: React.FC<RotationDisplayProps> = ({ 
  lineup, 
  players, 
  currentRotation,
  servingTeam,
  onManualRotate,
  onPlayerClick,
  liberoServingPosition
}) => {
  console.log('RotationDisplay render:', { currentRotation, servingTeam, hasLineup: !!lineup });
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
    <div className="bg-brand-gray/5 rounded-xl p-2 border border-brand-gray/10">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[10px] font-black uppercase text-brand-teal tracking-widest">Rotation {currentRotation}</h4>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(r => (
              <div 
                key={r} 
                className={`w-1 h-1 rounded-full ${r === currentRotation ? 'bg-brand-teal' : 'bg-brand-gray/20'}`} 
              />
            ))}
          </div>
          {onManualRotate && (
            <button 
              onClick={onManualRotate}
              className="text-brand-text-secondary active:text-brand-teal transition-colors"
              title="Manual Rotate"
            >
              <RotateCw size={12} />
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-1 aspect-[5/2] relative">
        {/* Net Indicator */}
        <div className="absolute -top-1 left-0 right-0 flex justify-center z-10">
          <div className="bg-brand-gray/40 h-[2px] w-full rounded-full flex items-center justify-center">
            <span className="bg-brand-gray/20 px-2 py-0.5 rounded-full text-[4px] font-black uppercase text-brand-text-secondary tracking-[0.2em]">The Net</span>
          </div>
        </div>

        {positions.map(pos => {
          const { player, playerIdx } = getPlayerInfoByPos(pos);
          // The server is ALWAYS the player physically in Position 1
          const isServer = servingTeam === 'Us' && pos === 1;
          const isLibero = player?.position === 'L' || player?.position === 'DS'; // Simplification for UI
          const isLiberoServing = isServer && playerIdx === liberoServingPosition;
          
          return (
            <button 
              key={pos} 
              onClick={() => onPlayerClick?.(playerIdx)}
              disabled={!onPlayerClick}
              className={`relative rounded flex flex-col items-center justify-center border transition-all ${
                isServer 
                  ? 'bg-brand-teal/20 border-brand-teal shadow-inner' 
                  : 'bg-brand-bg border-brand-gray/10'
              } ${onPlayerClick ? 'active:scale-95' : ''}`}
            >
              <div className="absolute top-0.5 right-0.5 px-0.5 bg-brand-gray/10 rounded-[2px]">
                <span className="text-[5px] font-black text-brand-text-secondary opacity-60">{pos}</span>
              </div>
              
              {isLibero && (
                <div className="absolute top-0.5 left-0.5">
                  <div className="w-1.5 h-1.5 bg-brand-amber rounded-full" />
                </div>
              )}

              <span className={`text-lg font-black leading-none ${isServer ? 'text-brand-teal' : 'text-brand-text'} ${isLibero ? 'text-brand-amber' : ''}`}>
                {player?.jerseyNumber || '?'}
              </span>
              
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
