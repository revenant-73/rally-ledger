import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, RotateCcw } from 'lucide-react';
import { useMatch } from '../hooks/useMatch';
import { useLiveMatchLogic } from '../hooks/useLiveMatchLogic';
import type { OutcomeType, Classification, Set } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Components
              
import LiveMatchHeader from '../components/live-match/LiveMatchHeader';
import LiveMatchScoreboard from '../components/live-match/LiveMatchScoreboard';
import RallyEntryArea from '../components/live-match/RallyEntryArea';
import NextSetScreen from '../components/live-match/NextSetScreen';
import NoteModal from '../components/live-match/NoteModal';
import TimeoutModal from '../components/live-match/TimeoutModal';
import MoreMenuModal from '../components/live-match/MoreMenuModal';
import RotationDisplay from '../components/live-match/lineup/RotationDisplay';
import LineupSelection from '../components/live-match/lineup/LineupSelection';
import SubstitutionModal from '../components/live-match/lineup/SubstitutionModal';

const LiveMatch: React.FC = () => {
  const navigate = useNavigate();
  const { 
    activeMatch, 
    activeSet, 
    activeTeam, 
    rallies, 
    addRally, 
    undoLastRally, 
    startSet, 
    players, 
    endSet, 
    updateMatch, 
    updateSet 
  } = useMatch();
  
  const {
    pointWinner, setPointWinner,
    outcome, setOutcome,
    setSelectedPlayerId,
    serverPlayerId, setServerPlayerId,
    serveResult, setServeResult,
    receiveResult, setReceiveResult,
    setReceivePlayerId,
    servingTeam, setServingTeam,
    currentRotation, setCurrentRotation,
    currentLineup,
    liberoServingPosition,
    handleSubstitution,
    handleLiberoSwap,
    handleSetLiberoServing,
    completeRally, undoLastRallyWithLogic, resetEntry
  } = useLiveMatchLogic(activeMatch, activeSet, rallies, addRally, undoLastRally, updateSet);

  const [showReceivePlayerSelection, setShowReceivePlayerSelection] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showClassification, setShowClassification] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLineupEditor, setShowLineupEditor] = useState(false);
  const [selectedPositionIdx, setSelectedPositionIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!activeMatch) {
      navigate('/');
    }
  }, [activeMatch, navigate]);

  useEffect(() => {
    console.log('LiveMatch State Change:', { servingTeam, serveResult, receiveResult, pointWinner, showReceivePlayerSelection, showPlayerSelection, showClassification });
  }, [servingTeam, serveResult, receiveResult, pointWinner, showReceivePlayerSelection, showPlayerSelection, showClassification]);

  if (!activeMatch) return null;

  if (showLineupEditor) {
    return (
      <LineupSelection 
        players={players}
        onCancel={() => setShowLineupEditor(false)}
        onComplete={async (lineup) => {
          await updateSet(activeSet!.id, {
            metadata: {
              ...activeSet!.metadata,
              startingLineup: lineup,
            }
          });
          setShowLineupEditor(false);
          setToast('Lineup updated!');
        }}
      />
    );
  }

  // Initialize next set if none exists
  if (!activeSet) {
    return (
      <NextSetScreen 
        rallies={rallies}
        players={players}
        onBackToHome={() => navigate('/')}
        onStartSet={async (setNumber, lineup) => {
          const newSet: Set = {
            id: uuidv4(),
            matchId: activeMatch.id,
            setNumber: setNumber,
            ourScore: 0,
            opponentScore: 0,
            status: 'active',
            startingServerTeam: 'Us',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
              startingLineup: lineup,
              currentRotation: 1,
            }
          };
          await startSet(newSet);
        }}
      />
    );
  }

  const handleServerClick = (playerId: string | 'none') => {
    setServerPlayerId(playerId === 'none' ? null : playerId);
  };

  const handleServeQualityClick = (quality: 'Ace' | 'Error' | 'In-System' | 'Out-of-System') => {
    if (quality === 'Ace') {
      setPointWinner('Us');
      setOutcome('Ace');
      if (serverPlayerId) {
        handleCompleteRally('Earned', 'Us', 'Ace', serverPlayerId);
      } else if (players.length > 0) {
        setShowPlayerSelection(true);
      } else {
        handleCompleteRally('Earned', 'Us', 'Ace');
      }
    } else if (quality === 'Error') {
      setPointWinner('Opponent');
      setOutcome('Serve Error');
      if (serverPlayerId) {
        handleCompleteRally('Gifted', 'Opponent', 'Serve Error', serverPlayerId);
      } else if (players.length > 0) {
        setShowPlayerSelection(true);
      } else {
        handleCompleteRally('Gifted', 'Opponent', 'Serve Error');
      }
    } else {
      setServeResult(quality);
      setPointWinner(null); 
    }
  };

  const handleReceiveQualityClick = (quality: 'Error' | 'Overpass' | 'In-System' | 'Out-of-System') => {
    setReceiveResult(quality);
    if (players.length > 0) {
      setShowReceivePlayerSelection(true);
    } else if (quality === 'Error') {
      setPointWinner('Opponent');
      setOutcome('Ace');
      setShowClassification(true);
    }
  };

  const handleReceivePlayerClick = (playerId: string | 'none') => {
    const pId = playerId === 'none' ? null : playerId;
    setReceivePlayerId(pId);
    setSelectedPlayerId(pId);
    setShowReceivePlayerSelection(false);
    if (receiveResult === 'Error') {
      setPointWinner('Opponent');
      setOutcome('Ace');
      setShowClassification(true);
    }
  };

  const handlePointClick = (winner: 'Us' | 'Opponent') => {
    setPointWinner(winner);
  };

  const positiveOutcomes: OutcomeType[] = ['Ace', 'Kill', 'Block', 'Forced Error'];
  const errorOutcomes: OutcomeType[] = [
    'Serve Error', 'Attack Error', 'Ball Handling Error',
    'Net / Line Violation', 'Free Ball Error', 'Other'
  ];

  const handleOutcomeClick = (type: OutcomeType) => {
    setOutcome(type);
    const isPositive = positiveOutcomes.includes(type);
    const classification = isPositive ? 'Earned' : 'Gifted';
    const shouldSelectPlayer = (pointWinner === 'Us' && isPositive) || (pointWinner === 'Opponent' && !isPositive);

    if (players.length > 0 && shouldSelectPlayer) {
      setShowPlayerSelection(true);
    } else {
      handleCompleteRally(classification, undefined, type, null);
    }
  };

  const handlePlayerClick = (playerId: string | 'none') => {
    const pId = playerId === 'none' ? null : playerId;
    setSelectedPlayerId(pId);
    setShowPlayerSelection(false);
    
    if (outcome) {
      const classification = positiveOutcomes.includes(outcome) ? 'Earned' : 'Gifted';
      handleCompleteRally(classification, undefined, undefined, pId);
    }
  };

  const handleCompleteRally = async (
    classification: Classification, 
    winnerOverride?: 'Us' | 'Opponent', 
    outcomeOverride?: OutcomeType,
    playerOverride?: string | null
  ) => {
    const winner = winnerOverride || pointWinner;
    const finalOutcome = outcomeOverride || outcome;
    
    console.log('handleCompleteRally start:', { winner, finalOutcome, classification, servingTeam });

    if (winner === 'Us') {
      setToast(`Point Us! (${finalOutcome})`);
    } else if (winner === 'Opponent') {
      setToast(`Point ${activeMatch.opponentName} (${finalOutcome})`);
    }
    
    // Reset local UI state immediately for snappiness
    setShowReceivePlayerSelection(false);
    setShowPlayerSelection(false);
    setShowClassification(false);
    
    try {
      await completeRally(classification, winnerOverride, outcomeOverride, playerOverride);
      console.log('handleCompleteRally: completeRally finished');
    } catch (error) {
      console.error('Error completing rally:', error);
      setToast('Error saving point');
    }
  };

  const handleClassificationClick = (classification: Classification) => {
    handleCompleteRally(classification);
  };

  const handleManualScoreChange = async (team: 'Us' | 'Opponent', delta: number) => {
    if (!activeSet) return;
    const updates = team === 'Us' 
      ? { ourScore: Math.max(0, activeSet.ourScore + delta) }
      : { opponentScore: Math.max(0, activeSet.opponentScore + delta) };
    
    await updateSet(activeSet.id, updates);
    setToast(`Score adjusted for ${team}`);
  };

  const undoWithFeedback = async () => {
    const lastRally = await undoLastRallyWithLogic();
    if (lastRally) {
      setToast(`Undid: ${lastRally.outcomeType} by ${lastRally.pointWinner === 'Us' ? 'Us' : 'Them'}`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-brand-teal text-brand-bg px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce">
          {toast}
        </div>
      )}

      <LiveMatchHeader 
        onBack={() => navigate('/')}
        setNumber={activeSet.setNumber}
        opponentName={activeMatch.opponentName}
        onShowTimeout={() => setShowTimeout(true)}
        onShowStats={() => navigate('/match/dashboard')}
        onShowMore={() => setShowMoreMenu(true)}
      />

      <NoteModal 
        key={showNoteModal ? 'open' : 'closed'}
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        initialNote={activeMatch.notes || ''}
        onSave={async (text) => {
          await updateMatch(activeMatch.id, { notes: text });
          setShowNoteModal(false);
          setToast('Note saved!');
        }}
      />

      <TimeoutModal 
        isOpen={showTimeout}
        onClose={() => setShowTimeout(false)}
        ourScore={activeSet.ourScore}
        opponentScore={activeSet.opponentScore}
        ourEarned={rallies.filter(r => r.setId === activeSet.id && r.pointWinner === 'Us' && r.classification === 'Earned').length}
        ourGifted={rallies.filter(r => r.setId === activeSet.id && r.pointWinner === 'Opponent' && r.classification === 'Gifted').length}
        rallies={rallies.filter(r => r.setId === activeSet.id)}
      />

      <MoreMenuModal 
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        setNumber={activeSet.setNumber}
        ourScore={activeSet.ourScore}
        opponentScore={activeSet.opponentScore}
        onEndSet={async (winner) => {
          await endSet(winner);
          setShowMoreMenu(false);
          setToast(`Set ${activeSet.setNumber} completed!`);
        }}
        onAbandonMatch={() => navigate('/')}
      />

      <LiveMatchScoreboard 
        ourScore={activeSet.ourScore}
        opponentScore={activeSet.opponentScore}
        ourName={activeTeam?.name || 'WE ARE'}
        opponentName={activeMatch.opponentName}
        onManualScoreChange={handleManualScoreChange}
        servingTeam={servingTeam}
        onToggleServingTeam={() => setServingTeam(servingTeam === 'Us' ? 'Opponent' : 'Us')}
      />

      {currentLineup ? (
        <div className="px-4 pb-1">
          <RotationDisplay 
            lineup={currentLineup}
            players={players}
            currentRotation={currentRotation}
            servingTeam={servingTeam}
            liberoServingPosition={liberoServingPosition}
            onManualRotate={async () => {
              const nextRotation = currentRotation === 6 ? 1 : currentRotation + 1;
              setCurrentRotation(nextRotation);
              await updateSet(activeSet.id, {
                metadata: {
                  ...activeSet.metadata,
                  currentRotation: nextRotation
                }
              });
              setToast(`Rotated to ${nextRotation}`);
            }}
            onPlayerClick={(idx) => setSelectedPositionIdx(idx)}
          />
        </div>
      ) : (
        <div className="px-4 pb-2">
          <button 
            onClick={() => setShowLineupEditor(true)}
            className="w-full py-2 bg-brand-gray/5 border border-brand-gray/10 rounded-xl text-brand-text-secondary text-xs font-bold uppercase"
          >
            Set Starting Lineup
          </button>
        </div>
      )}

      <RallyEntryArea 
        servingTeam={servingTeam}
        serverPlayerId={serverPlayerId}
        serveResult={serveResult}
        receiveResult={receiveResult}
        showReceivePlayerSelection={showReceivePlayerSelection}
        pointWinner={pointWinner}
        showPlayerSelection={showPlayerSelection}
        showClassification={showClassification}
        players={players}
        outcome={outcome}
        positiveOutcomes={positiveOutcomes}
        errorOutcomes={errorOutcomes}
        onServerClick={handleServerClick}
        onServeQualityClick={handleServeQualityClick}
        onReceiveQualityClick={handleReceiveQualityClick}
        onReceivePlayerClick={handleReceivePlayerClick}
        onPointClick={handlePointClick}
        onPlayerClick={handlePlayerClick}
        onClassificationClick={handleClassificationClick}
        onOutcomeClick={handleOutcomeClick}
        onResetEntry={resetEntry}
        onCompleteRally={handleCompleteRally}
        onSetServeResult={setServeResult}
        onSetShowReceivePlayerSelection={setShowReceivePlayerSelection}
        onSetReceiveResult={setReceiveResult}
        onSetPointWinner={setPointWinner}
        onSetShowPlayerSelection={setShowPlayerSelection}
        onSetOutcome={setOutcome}
        onSetServerPlayerId={setServerPlayerId}
        currentLineup={currentLineup}
        currentRotation={currentRotation}
      />

      {selectedPositionIdx && currentLineup && (
        <SubstitutionModal 
          isOpen={true}
          onClose={() => setSelectedPositionIdx(null)}
          players={players}
          lineup={currentLineup}
          positionIdx={selectedPositionIdx}
          onSubstitute={async (playerId) => {
            await handleSubstitution(selectedPositionIdx, playerId);
            setSelectedPositionIdx(null);
            setToast('Substitution complete');
          }}
          onLiberoSwap={async (liberoId) => {
            await handleLiberoSwap(selectedPositionIdx, liberoId);
            setSelectedPositionIdx(null);
            setToast(liberoId ? 'Libero swap complete' : 'Libero exited');
          }}
          onSetLiberoServing={async (isServing) => {
            await handleSetLiberoServing(isServing, selectedPositionIdx);
            setSelectedPositionIdx(null);
            setToast(isServing ? 'Libero set as server' : 'Libero server reset');
          }}
          liberoServingPosition={liberoServingPosition}
        />
      )}

      {/* Action Bar */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <button
          onClick={undoWithFeedback}
          className="flex flex-col items-center gap-0.5 p-2 bg-brand-gray/5 rounded-xl text-brand-text-secondary active:text-brand-teal"
        >
          <RotateCcw size={18} />
          <span className="text-[9px] font-bold uppercase">Undo</span>
        </button>
        <button
          onClick={() => setShowNoteModal(true)}
          className="flex flex-col items-center gap-0.5 p-2 bg-brand-gray/5 rounded-xl text-brand-text-secondary active:text-brand-teal"
        >
          <MessageSquare size={18} />
          <span className="text-[9px] font-bold uppercase">Note</span>
        </button>
      </div>
    </div>
  );
};

export default LiveMatch;
