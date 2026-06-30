import React from 'react';
import { Trophy, X, Sun, CloudRain, Cloud } from 'lucide-react';
import type { Player, OutcomeType, Classification } from '../../types';

interface RallyEntryAreaProps {
  servingTeam: 'Us' | 'Opponent';
  serverPlayerId: string | null;
  serveResult: string | null;
  receiveResult: string | null;
  showReceivePlayerSelection: boolean;
  pointWinner: 'Us' | 'Opponent' | null;
  showPlayerSelection: boolean;
  showClassification: boolean;
  players: Player[];
  outcome: OutcomeType | null;
  positiveOutcomes: OutcomeType[];
  errorOutcomes: OutcomeType[];
  onServerClick: (id: string | 'none') => void;
  onServeQualityClick: (quality: 'Ace' | 'Error' | 'In-System' | 'Out-of-System') => void;
  onReceiveQualityClick: (quality: 'Error' | 'Overpass' | 'In-System' | 'Out-of-System') => void;
  onReceivePlayerClick: (id: string | 'none') => void;
  onPointClick: (winner: 'Us' | 'Opponent') => void;
  onPlayerClick: (id: string | 'none') => void;
  onClassificationClick: (classification: Classification) => void;
  onOutcomeClick: (type: OutcomeType) => void;
  onResetEntry: () => void;
  onCompleteRally: (classification: Classification, winnerOverride?: 'Us' | 'Opponent', outcomeOverride?: OutcomeType, playerOverride?: string | null) => Promise<void>;
  onSetServeResult: (result: string | null) => void;
  onSetShowReceivePlayerSelection: (show: boolean) => void;
  onSetReceiveResult: (result: string | null) => void;
  onSetPointWinner: (winner: 'Us' | 'Opponent' | null) => void;
  onSetShowPlayerSelection: (show: boolean) => void;
  onSetOutcome: (outcome: OutcomeType | null) => void;
  onSetServerPlayerId: (id: string | null) => void;
  currentLineup?: any;
  currentRotation?: number;
}

const RallyEntryArea: React.FC<RallyEntryAreaProps> = ({
  servingTeam,
  serverPlayerId,
  serveResult,
  receiveResult,
  showReceivePlayerSelection,
  pointWinner,
  showPlayerSelection,
  showClassification,
  players,
  outcome,
  positiveOutcomes,
  errorOutcomes,
  onServerClick,
  onServeQualityClick,
  onReceiveQualityClick,
  onReceivePlayerClick,
  onPointClick,
  onPlayerClick,
  onClassificationClick,
  onOutcomeClick,
  onResetEntry,
  onCompleteRally,
  onSetServeResult,
  onSetShowReceivePlayerSelection,
  onSetReceiveResult,
  onSetPointWinner,
  onSetShowPlayerSelection,
  onSetOutcome,
  currentLineup,
  currentRotation,
}) => {
  console.log('RallyEntryArea render:', { servingTeam, serveResult, receiveResult, pointWinner });
  const sortedPlayers = [...players].sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber));

  const getPredictedServerId = () => {
    if (!currentLineup || !currentRotation) return null;
    let playerIdx = (1 + currentRotation - 1);
    if (playerIdx > 6) playerIdx -= 6;
    return currentLineup[`position${playerIdx}`] as string;
  };

  const predictedServerId = getPredictedServerId();

  return (
    <div className="flex-1 bg-brand-gray/5 rounded-3xl p-3 flex flex-col min-h-0 overflow-hidden">
      {servingTeam === 'Us' && !serverPlayerId ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold uppercase tracking-tight">Confirm Server</h3>
            <button onClick={() => onServerClick('none')} className="text-brand-teal text-xs font-bold uppercase">Skip</button>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto pb-2 pt-2 content-start">
            {sortedPlayers.map((player) => {
              const isPredicted = player.id === predictedServerId;
              return (
                <button
                  key={player.id}
                  onClick={() => onServerClick(player.id)}
                  className={`relative border py-3 rounded-xl flex flex-col items-center justify-center active:scale-[0.95] transition-all ${
                    isPredicted 
                      ? 'bg-brand-teal/20 border-brand-teal ring-2 ring-brand-teal/30 shadow-lg z-10' 
                      : 'bg-brand-gray/10 border-brand-gray/20'
                  }`}
                >
                  {isPredicted && (
                    <div className="absolute -top-2 bg-brand-teal text-brand-bg text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Server</div>
                  )}
                  <span className={`text-lg font-black leading-none ${isPredicted ? 'text-brand-teal' : 'text-brand-teal'}`}>#{player.jerseyNumber}</span>
                  <span className="text-[9px] font-bold uppercase mt-0.5 truncate w-full px-1 text-center">{player.firstName}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (!serveResult && !receiveResult) ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold">
              {servingTeam === 'Us' ? 'How was the serve?' : 'How was the receive?'}
            </h3>
            <button onClick={onResetEntry} className="text-brand-text-secondary text-xs">Reset</button>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-2">
            {servingTeam === 'Us' ? (
              <>
                <button onClick={() => onServeQualityClick('Ace')} className="bg-brand-green/20 border border-brand-green/50 py-3 rounded-xl font-black text-brand-green text-lg shadow-sm active:scale-95 transition-all">ACE</button>
                <button onClick={() => onServeQualityClick('In-System')} className="bg-brand-teal/10 border border-brand-teal/30 py-3 rounded-xl font-bold text-lg active:scale-95 transition-all">InSys</button>
                <button onClick={() => onServeQualityClick('Out-of-System')} className="bg-brand-amber/10 border border-brand-amber/30 py-3 rounded-xl font-bold text-lg active:scale-95 transition-all">KO</button>
                <button onClick={() => onServeQualityClick('Error')} className="bg-brand-red/20 border border-brand-red/50 py-3 rounded-xl font-black text-brand-red text-lg shadow-sm active:scale-95 transition-all">ERR</button>
              </>
            ) : (
              <>
                <button onClick={() => onReceiveQualityClick('In-System')} className="bg-brand-teal/10 border border-brand-teal/30 py-3 rounded-xl font-bold text-lg active:scale-95 transition-all">InSys</button>
                <button onClick={() => onReceiveQualityClick('Out-of-System')} className="bg-brand-amber/10 border border-brand-amber/30 py-3 rounded-xl font-bold text-lg active:scale-95 transition-all">KO</button>
                <button onClick={() => onReceiveQualityClick('Overpass')} className="bg-brand-orange/10 border border-brand-orange/30 py-3 rounded-xl font-bold text-lg active:scale-95 transition-all">OVER</button>
                <button onClick={() => onReceiveQualityClick('Error')} className="bg-brand-red/20 border border-brand-red/50 py-3 rounded-xl font-black text-brand-red text-lg shadow-sm active:scale-95 transition-all">ACE</button>
                <button 
                  onClick={() => onCompleteRally('Gifted', 'Us', 'Serve Error', null)} 
                  className="mt-1 bg-brand-gray/10 border border-brand-gray/30 py-3 rounded-xl font-black text-brand-text-secondary text-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  OPP SERVE ERR
                </button>
              </>
            )}
          </div>
        </div>
      ) : showReceivePlayerSelection ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold">Who received?</h3>
            <div className="flex gap-4">
              <button onClick={() => onReceivePlayerClick('none')} className="text-brand-teal text-xs font-bold">Skip</button>
              <button onClick={() => { onSetShowReceivePlayerSelection(false); onSetReceiveResult(null); }} className="text-brand-text-secondary text-xs">Back</button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto pb-2 content-start">
            {sortedPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => onReceivePlayerClick(player.id)}
                className="bg-brand-gray/10 border border-brand-gray/20 py-3 rounded-xl flex flex-col items-center justify-center active:scale-[0.95] transition-all"
              >
                <span className="text-lg font-black text-brand-teal leading-none">#{player.jerseyNumber}</span>
                <span className="text-[9px] font-bold uppercase mt-0.5 truncate w-full px-1 text-center">{player.firstName}</span>
              </button>
            ))}
          </div>
        </div>
      ) : !pointWinner ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold">Who won?</h3>
            <button onClick={() => {
              if (servingTeam === 'Us') onSetServeResult(null);
              else onSetShowReceivePlayerSelection(true);
            }} className="text-brand-text-secondary text-xs">Back</button>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-3">
            <button
              onClick={() => onPointClick('Us')}
              className="bg-brand-teal text-brand-bg text-2xl font-black rounded-3xl active:scale-[0.96] transition-all flex flex-col items-center justify-center gap-1 py-6 shadow-xl active:shadow-inner"
            >
              <Trophy size={24} />
              WE WON
            </button>
            <button
              onClick={() => onPointClick('Opponent')}
              className="bg-brand-red text-brand-bg text-2xl font-black rounded-3xl active:scale-[0.96] transition-all flex flex-col items-center justify-center gap-1 py-6 shadow-xl active:shadow-inner"
            >
              <X size={24} />
              THEY WON
            </button>
          </div>
        </div>
      ) : showPlayerSelection ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold">Who was involved?</h3>
            <div className="flex gap-4">
              <button onClick={() => onPlayerClick('none')} className="text-brand-teal text-xs font-bold">Skip</button>
              <button onClick={() => { onSetShowPlayerSelection(false); onSetOutcome(null); }} className="text-brand-text-secondary text-xs">Back</button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto pb-2 content-start">
            {sortedPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => onPlayerClick(player.id)}
                className="bg-brand-gray/10 border border-brand-gray/20 py-4 rounded-xl flex flex-col items-center justify-center active:scale-[0.95] transition-all"
              >
                <span className="text-lg font-black text-brand-teal leading-none">#{player.jerseyNumber}</span>
                <span className="text-[9px] font-bold uppercase mt-0.5 truncate w-full px-1 text-center">{player.firstName}</span>
              </button>
            ))}
          </div>
        </div>
      ) : showClassification ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold">Classification</h3>
            <button onClick={() => { onSetShowPlayerSelection(false); if(players.length > 0) onSetShowPlayerSelection(true); else onSetOutcome(null); }} className="text-brand-text-secondary text-xs">Back</button>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => onClassificationClick('Earned')}
              className="w-full bg-brand-green/20 border-2 border-brand-green text-brand-green py-5 rounded-3xl text-2xl font-black active:scale-[0.96] transition-all flex items-center justify-center gap-3 shadow-lg active:shadow-inner"
            >
              <Sun size={24} />
              EARNED
            </button>
            <button
              onClick={() => onClassificationClick('Gifted')}
              className="w-full bg-brand-amber/20 border-2 border-brand-amber text-brand-amber py-5 rounded-3xl text-2xl font-black active:scale-[0.96] transition-all flex items-center justify-center gap-3 shadow-lg active:shadow-inner"
            >
              <CloudRain size={24} />
              GIFTED
            </button>
            <button
              onClick={() => onClassificationClick('Neutral')}
              className="w-full bg-brand-gray/20 border-2 border-brand-gray text-brand-gray py-5 rounded-3xl text-2xl font-black active:scale-[0.96] transition-all flex items-center justify-center gap-3 shadow-lg active:shadow-inner"
            >
              <Cloud size={24} />
              NEUTRAL
            </button>
          </div>
          <div className="mt-4 p-2 bg-brand-gray/5 rounded-xl text-center">
            <p className="text-[10px] text-brand-text-secondary">Point won by <span className="text-brand-text font-bold uppercase">{pointWinner}</span> via <span className="text-brand-text font-bold uppercase">{outcome}</span></p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold">How did it end?</h3>
            <button onClick={() => onSetPointWinner(null)} className="text-brand-text-secondary text-xs">Back</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <p className="text-[9px] font-black text-brand-teal uppercase tracking-widest mb-2 px-1">Earned Points</p>
              <div className="grid grid-cols-2 gap-2">
                {positiveOutcomes.map((type) => (
                  <button
                    key={type}
                    onClick={() => onOutcomeClick(type)}
                    className="bg-brand-teal/10 border border-brand-teal/20 py-3 rounded-xl font-black text-brand-teal text-sm active:scale-[0.95] transition-all"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black text-brand-red uppercase tracking-widest mb-2 px-1">Errors</p>
              <div className="grid grid-cols-2 gap-2">
                {errorOutcomes.map((type) => (
                  <button
                    key={type}
                    onClick={() => onOutcomeClick(type)}
                    className="bg-brand-red/10 border border-brand-red/20 py-3 rounded-xl font-black text-brand-red text-sm active:scale-[0.95] transition-all"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default RallyEntryArea;
