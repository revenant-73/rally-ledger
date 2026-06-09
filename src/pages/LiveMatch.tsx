import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, BarChart2, MessageSquare } from 'lucide-react';
import { useMatch } from '../context/MatchContext';
import type { OutcomeType, Classification, RallyEvent, Set } from '../types';
import { v4 as uuidv4 } from 'uuid';

const LiveMatch: React.FC = () => {
  const navigate = useNavigate();
  const { activeMatch, activeSet, rallies, addRally, undoLastRally, startSet, players } = useMatch();
  
  const [pointWinner, setPointWinner] = useState<'Us' | 'Opponent' | null>(null);
  const [outcome, setOutcome] = useState<OutcomeType | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showClassification, setShowClassification] = useState(false);

  useEffect(() => {
    if (!activeMatch) {
      navigate('/');
    }
  }, [activeMatch, navigate]);

  if (!activeMatch) return null;

  // Initialize first set if none exists
  if (!activeSet) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold mb-4">Start Set 1</h2>
        <p className="text-brand-text-secondary mb-8">Ready to begin tracking?</p>
        <button
          onClick={() => {
            const newSet: Set = {
              id: uuidv4(),
              matchId: activeMatch.id,
              setNumber: 1,
              ourScore: 0,
              opponentScore: 0,
              startingServerTeam: 'Us', // Should be configurable later
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            startSet(newSet);
          }}
          className="bg-brand-teal text-brand-bg font-bold py-4 px-8 rounded-xl text-xl"
        >
          Start Set
        </button>
      </div>
    );
  }

  const handlePointClick = (winner: 'Us' | 'Opponent') => {
    setPointWinner(winner);
  };

  const handleOutcomeClick = (type: OutcomeType) => {
    setOutcome(type);
    if (players.length > 0) {
      setShowPlayerSelection(true);
    } else {
      setShowClassification(true);
    }
  };

  const handlePlayerClick = (playerId: string | 'none') => {
    setSelectedPlayerId(playerId === 'none' ? null : playerId);
    setShowPlayerSelection(false);
    setShowClassification(true);
  };

  const handleClassificationClick = (classification: Classification) => {
    if (!pointWinner || !outcome || !activeSet) return;

    const newRally: RallyEvent = {
      id: uuidv4(),
      matchId: activeMatch.id,
      setId: activeSet.id,
      rallyNumber: rallies.length + 1,
      scoreBeforeUs: activeSet.ourScore,
      scoreBeforeOpponent: activeSet.opponentScore,
      scoreAfterUs: pointWinner === 'Us' ? activeSet.ourScore + 1 : activeSet.ourScore,
      scoreAfterOpponent: pointWinner === 'Opponent' ? activeSet.opponentScore + 1 : activeSet.opponentScore,
      pointWinner,
      servingTeam: 'Us', // Should be tracked properly later
      outcomeType: outcome,
      classification,
      playerId: selectedPlayerId || undefined,
      createdAt: new Date().toISOString(),
    };

    addRally(newRally);
    resetEntry();
  };

  const resetEntry = () => {
    setPointWinner(null);
    setOutcome(null);
    setSelectedPlayerId(null);
    setShowPlayerSelection(false);
    setShowClassification(false);
  };

  const outcomes: OutcomeType[] = [
    'Ace', 'Kill', 'Block', 'Forced Error',
    'Serve Error', 'Attack Error', 'Ball Handling Error',
    'Net / Line Violation', 'Free Ball Error', 'Other'
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-brand-gray/10">
        <button onClick={() => navigate('/')} className="text-brand-text-secondary">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-medium text-brand-text-secondary uppercase tracking-wider">Set {activeSet.setNumber}</h2>
          <p className="font-bold">vs {activeMatch.opponentName}</p>
        </div>
        <button onClick={() => navigate('/match/dashboard')} className="text-brand-text-secondary active:text-brand-teal">
          <BarChart2 size={24} />
        </button>
      </header>

      {/* Score Display */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 h-32">
          <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-teal/20">
            <span className="text-xs text-brand-text-secondary font-bold uppercase">Us</span>
            <span className="text-5xl font-black text-brand-teal">{activeSet.ourScore}</span>
          </div>
          <div className="bg-brand-gray/5 rounded-2xl flex flex-col items-center justify-center border border-brand-red/20">
            <span className="text-xs text-brand-text-secondary font-bold uppercase">Them</span>
            <span className="text-5xl font-black text-brand-red">{activeSet.opponentScore}</span>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-1 bg-brand-gray/5 rounded-3xl p-4 flex flex-col">
          {!pointWinner ? (
            <div className="flex-1 grid grid-cols-1 gap-4">
              <button
                onClick={() => handlePointClick('Us')}
                className="bg-brand-teal text-brand-bg text-3xl font-black rounded-2xl active:scale-[0.98] transition-all"
              >
                WE WON POINT
              </button>
              <button
                onClick={() => handlePointClick('Opponent')}
                className="bg-brand-red text-brand-bg text-3xl font-black rounded-2xl active:scale-[0.98] transition-all"
              >
                THEY WON POINT
              </button>
            </div>
          ) : showPlayerSelection ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Who was involved?</h3>
                <div className="flex gap-4">
                  <button onClick={() => handlePlayerClick('none')} className="text-brand-teal text-sm font-bold">Skip</button>
                  <button onClick={() => { setShowPlayerSelection(false); setOutcome(null); }} className="text-brand-text-secondary text-sm">Back</button>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto pb-4">
                {players.sort((a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber)).map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    className="bg-brand-gray/10 border border-brand-gray/20 py-4 rounded-xl flex flex-col items-center justify-center active:scale-[0.95] transition-all"
                  >
                    <span className="text-xl font-black text-brand-teal leading-none">{player.jerseyNumber}</span>
                    <span className="text-[10px] font-bold uppercase mt-1 truncate w-full px-1">{player.lastName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : showClassification ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Classification</h3>
                <button onClick={() => { setShowClassification(false); if(players.length > 0) setShowPlayerSelection(true); else setOutcome(null); }} className="text-brand-text-secondary text-sm">Back</button>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => handleClassificationClick('Earned')}
                  className="w-full bg-brand-green/20 border-2 border-brand-green text-brand-green py-6 rounded-2xl text-2xl font-black active:scale-[0.98] transition-all"
                >
                  EARNED
                </button>
                <button
                  onClick={() => handleClassificationClick('Gifted')}
                  className="w-full bg-brand-amber/20 border-2 border-brand-amber text-brand-amber py-6 rounded-2xl text-2xl font-black active:scale-[0.98] transition-all"
                >
                  GIFTED
                </button>
                <button
                  onClick={() => handleClassificationClick('Neutral')}
                  className="w-full bg-brand-gray/20 border-2 border-brand-gray text-brand-gray py-6 rounded-2xl text-2xl font-black active:scale-[0.98] transition-all"
                >
                  NEUTRAL
                </button>
              </div>
              <div className="mt-8 p-4 bg-brand-gray/10 rounded-xl text-center">
                <p className="text-sm text-brand-text-secondary">Point won by <span className="text-brand-text font-bold uppercase">{pointWinner}</span> via <span className="text-brand-text font-bold uppercase">{outcome}</span></p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">How did it end?</h3>
                <button onClick={resetEntry} className="text-brand-text-secondary text-sm">Cancel</button>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto">
                {outcomes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleOutcomeClick(type)}
                    className="bg-brand-gray/10 border border-brand-gray/20 py-4 rounded-xl font-bold active:scale-[0.95] transition-all"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <button
            onClick={undoLastRally}
            className="flex flex-col items-center gap-1 p-3 bg-brand-gray/5 rounded-xl text-brand-text-secondary active:text-brand-teal"
          >
            <RotateCcw size={20} />
            <span className="text-[10px] font-bold uppercase">Undo</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-3 bg-brand-gray/5 rounded-xl text-brand-text-secondary">
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold uppercase">Note</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-3 bg-brand-gray/5 rounded-xl text-brand-text-secondary">
            <RotateCcw size={20} className="rotate-180" />
            <span className="text-[10px] font-bold uppercase">Sub</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMatch;
