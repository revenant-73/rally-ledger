import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMatch } from '../hooks/useMatch';
import { useLiveMatchLogic } from '../hooks/useLiveMatchLogic';
import { useAuth } from '../hooks/useAuth';
import { useScreenWakeLock } from '../hooks/useScreenWakeLock';
import { useMatchSets } from '../hooks/queries/useSets';
import { getMatchFormatSettings, getSetTarget, isMatchCompleteAfterSet } from '../utils/matchFormat';
import { classifyTerminalOutcome, isEarnedOutcome } from '../utils/pointClassification';
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
import RecentRalliesStrip from '../components/live-match/RecentRalliesStrip';
import RotationDisplay from '../components/live-match/lineup/RotationDisplay';
import LineupSelection from '../components/live-match/lineup/LineupSelection';
import SubstitutionModal from '../components/live-match/lineup/SubstitutionModal';

const LiveMatch: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    activeMatch, 
    activeSet, 
    activeTeam, 
    teams,
    rallies, 
    addRally, 
    undoLastRally, 
    startSet, 
    players, 
    endSet, 
    updateMatch, 
    updateSet,
    endMatch,
    deleteMatch,
  } = useMatch();
  
  const {
    pointWinner, setPointWinner,
    outcome, setOutcome,
    setSelectedPlayerId,
    serverPlayerId, setServerPlayerId,
    serveResult, setServeResult,
    receiveResult, setReceiveResult,
    setReceivePlayerId,
    servingTeam, toggleServingTeam,
    currentRotation, setCurrentRotation,
    currentLineup,
    liberoServingPosition,
    handleSubstitution,
    handleLiberoSwap,
    handleSetLiberoServing,
    completeRally, handleManualScoreAdjustment, undoLastRallyWithLogic, resetEntry
  } = useLiveMatchLogic(activeMatch, activeSet, rallies, addRally, undoLastRally, updateSet);

  const [showReceivePlayerSelection, setShowReceivePlayerSelection] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [showClassification, setShowClassification] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLineupEditor, setShowLineupEditor] = useState(false);
  const [selectedCourtPosition, setSelectedCourtPosition] = useState<{ positionIdx: number; courtZone: number } | null>(null);
  const [tableMode, setTableMode] = useState(() => localStorage.getItem('liveTableMode') === 'true');
  const [brightGymMode, setBrightGymMode] = useState(() => localStorage.getItem('liveBrightGymMode') === 'true');
  const [scorerFocusMode, setScorerFocusMode] = useState(() => localStorage.getItem('liveScorerFocusMode') === 'true');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const isSavingActionRef = useRef(false);
  const { data: matchSets = [] } = useMatchSets(user?.id, activeMatch?.id);
  useScreenWakeLock(Boolean(activeMatch && activeSet));

  useEffect(() => {
    if (!activeMatch) {
      navigate('/');
    }
  }, [activeMatch, navigate]);

  useEffect(() => {
    localStorage.setItem('liveTableMode', String(tableMode));
  }, [tableMode]);

  useEffect(() => {
    localStorage.setItem('liveBrightGymMode', String(brightGymMode));
  }, [brightGymMode]);

  useEffect(() => {
    localStorage.setItem('liveScorerFocusMode', String(scorerFocusMode));
  }, [scorerFocusMode]);

  if (!activeMatch) return null;

  const matchPlayers = players.filter(player => player.teamId === activeMatch.teamId);
  const matchTeam = teams.find(team => team.id === activeMatch.teamId) || (activeTeam?.id === activeMatch.teamId ? activeTeam : null);
  const matchSettings = getMatchFormatSettings(activeMatch);

  const getCompletedSetResults = (currentSetResult?: 'Win' | 'Loss') => {
    const completedResults = matchSets
      .filter(set => set.status === 'completed' && set.id !== activeSet?.id && set.finalResult)
      .map(set => set.finalResult as 'Win' | 'Loss');

    return currentSetResult ? [...completedResults, currentSetResult] : completedResults;
  };

  const getMatchResultFromSets = (setResults: Array<'Win' | 'Loss'>) => {
    const wins = setResults.filter(result => result === 'Win').length;
    const losses = setResults.filter(result => result === 'Loss').length;

    if (wins === losses) return null;
    return wins > losses ? 'Win' : 'Loss';
  };

  if (showLineupEditor) {
    return (
      <LineupSelection 
        players={matchPlayers}
        onCancel={() => setShowLineupEditor(false)}
        onComplete={async (lineup) => {
          await updateSet(activeSet!.id, {
            metadata: {
              ...activeSet!.metadata,
              startingLineup: lineup,
            }
          });
          setShowLineupEditor(false);
          toast.success('Lineup updated!');
        }}
      />
    );
  }

  // Initialize next set if none exists
  if (!activeSet) {
    return (
      <NextSetScreen 
        rallies={rallies}
        players={matchPlayers}
        sets={matchSets}
        matchSettings={matchSettings}
        onBackToHome={() => navigate('/')}
        onEndMatch={async (result) => {
          await endMatch(result);
          toast.success(`Match completed as a ${result.toLowerCase()}.`);
          navigate('/');
        }}
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
              targetScore: getSetTarget(matchSettings, setNumber),
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
    } else if (matchPlayers.length > 0) {
        setShowPlayerSelection(true);
      } else {
        handleCompleteRally('Earned', 'Us', 'Ace');
      }
    } else if (quality === 'Error') {
      setPointWinner('Opponent');
      setOutcome('Serve Error');
      if (serverPlayerId) {
        handleCompleteRally('Gifted', 'Opponent', 'Serve Error', serverPlayerId);
    } else if (matchPlayers.length > 0) {
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
    if (matchPlayers.length > 0) {
      setShowReceivePlayerSelection(true);
    } else if (quality === 'Error') {
      handleCompleteRally('Earned', 'Opponent', 'Ace');
    }
  };

  const handleReceivePlayerClick = (playerId: string | 'none') => {
    const pId = playerId === 'none' ? null : playerId;
    setReceivePlayerId(pId);
    setSelectedPlayerId(pId);
    setShowReceivePlayerSelection(false);
    if (receiveResult === 'Error') {
      handleCompleteRally('Earned', 'Opponent', 'Ace', pId);
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
    const isPositive = isEarnedOutcome(type);
    const classification = classifyTerminalOutcome(type);
    const shouldSelectPlayer = (pointWinner === 'Us' && isPositive) || (pointWinner === 'Opponent' && !isPositive);

    if (matchPlayers.length > 0 && shouldSelectPlayer) {
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
      const classification = classifyTerminalOutcome(outcome);
      handleCompleteRally(classification, undefined, undefined, pId);
    }
  };

  const handleCompleteRally = async (
    classification: Classification, 
    winnerOverride?: 'Us' | 'Opponent', 
    outcomeOverride?: OutcomeType,
    playerOverride?: string | null
  ) => {
    if (isSavingActionRef.current) {
      toast('Saving previous point...');
      return;
    }

    isSavingActionRef.current = true;
    setIsSavingAction(true);

    const winner = winnerOverride || pointWinner;
    const finalOutcome = outcomeOverride || outcome;

    if (winner === 'Us') {
      toast.success(`Point Us! (${finalOutcome})`);
    } else if (winner === 'Opponent') {
      toast.error(`Point ${activeMatch.opponentName} (${finalOutcome})`);
    }
    
    // Reset local UI state immediately for snappiness
    setShowReceivePlayerSelection(false);
    setShowPlayerSelection(false);
    setShowClassification(false);
    
    try {
      await completeRally(classification, winnerOverride, outcomeOverride, playerOverride);
    } catch (error) {
      console.error('Error completing rally:', error);
      toast.error('Error saving point');
    } finally {
      isSavingActionRef.current = false;
      setIsSavingAction(false);
    }
  };

  const handleClassificationClick = (classification: Classification) => {
    handleCompleteRally(classification);
  };

  const handleManualScoreChange = async (team: 'Us' | 'Opponent', delta: number) => {
    if (delta !== 1 && delta !== -1) return;
    if (isSavingActionRef.current) {
      toast('Saving previous action...');
      return;
    }

    isSavingActionRef.current = true;
    setIsSavingAction(true);
    try {
      await handleManualScoreAdjustment(team, delta);
      toast.success(`Score adjusted for ${team}`);
    } catch (error) {
      console.error('Error adjusting score:', error);
      toast.error('Error saving score adjustment');
    } finally {
      isSavingActionRef.current = false;
      setIsSavingAction(false);
    }
  };

  const undoWithFeedback = async () => {
    if (isSavingActionRef.current) {
      toast('Saving previous action...');
      return;
    }

    isSavingActionRef.current = true;
    setIsSavingAction(true);
    try {
      const lastRally = await undoLastRallyWithLogic();
      if (lastRally) {
        toast.success(`Undid: ${lastRally.outcomeType} by ${lastRally.pointWinner === 'Us' ? 'Us' : 'Them'}`);
      }
    } catch (error) {
      console.error('Error undoing rally:', error);
      toast.error('Error undoing point');
    } finally {
      isSavingActionRef.current = false;
      setIsSavingAction(false);
    }
  };

  return (
    <div className={`live-match-screen flex h-dvh max-h-dvh flex-col overflow-hidden relative ${brightGymMode ? 'bg-slate-100 text-slate-950' : 'bg-brand-bg text-brand-text'}`}>
      <LiveMatchHeader 
        onBack={() => navigate('/')}
        setNumber={activeSet.setNumber}
        opponentName={activeMatch.opponentName}
        onShowTimeout={() => setShowTimeout(true)}
        onShowStats={() => navigate('/match/dashboard')}
        onShowMore={() => setShowMoreMenu(true)}
        compact={tableMode}
        brightGymMode={brightGymMode}
        scorerFocusMode={scorerFocusMode}
      />

      <NoteModal 
        key={showNoteModal ? 'open' : 'closed'}
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        initialNote={activeMatch.notes || ''}
        onSave={async (text) => {
          await updateMatch(activeMatch.id, { notes: text });
          setShowNoteModal(false);
          toast.success('Note saved!');
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
        onShowTimeout={() => setShowTimeout(true)}
        onShowStats={() => navigate('/match/dashboard')}
        onShowNote={() => setShowNoteModal(true)}
        onManualScoreChange={handleManualScoreChange}
        onEndSet={async (winner) => {
          await endSet(winner);
          setShowMoreMenu(false);
          const completedSetResults = getCompletedSetResults(winner);
          const shouldCompleteMatch = isMatchCompleteAfterSet(matchSettings, completedSetResults);
          const matchResult = shouldCompleteMatch ? getMatchResultFromSets(completedSetResults) : null;

          if (matchResult) {
            await endMatch(matchResult);
            toast.success(`Match completed as a ${matchResult.toLowerCase()}.`);
            navigate('/');
          } else if (shouldCompleteMatch) {
            toast.success('Set complete. Choose the match result to close it out.');
          } else {
            toast.success(`Set ${activeSet.setNumber} completed!`);
          }
        }}
        onEndMatch={async (winner) => {
          await endSet(winner);
          await endMatch(winner);
          setShowMoreMenu(false);
          toast.success(`Match completed as a ${winner.toLowerCase()}.`);
          navigate('/');
        }}
        onAbandonMatch={async () => {
          await deleteMatch(activeMatch.id);
          setShowMoreMenu(false);
          toast.success('Match abandoned.');
          navigate('/');
        }}
        tableMode={tableMode}
        onToggleTableMode={() => setTableMode((current) => !current)}
        brightGymMode={brightGymMode}
        onToggleBrightGymMode={() => setBrightGymMode((current) => !current)}
        scorerFocusMode={scorerFocusMode}
        onToggleScorerFocusMode={() => setScorerFocusMode((current) => !current)}
      />

      <div className="live-match-scoreboard">
        <LiveMatchScoreboard
          ourScore={activeSet.ourScore}
          opponentScore={activeSet.opponentScore}
          ourName={matchTeam?.name || 'WE ARE'}
          opponentName={activeMatch.opponentName}
          onManualScoreChange={handleManualScoreChange}
          servingTeam={servingTeam}
          onToggleServingTeam={toggleServingTeam}
          brightGymMode={brightGymMode}
          scorerFocusMode={scorerFocusMode}
        />
      </div>

      {currentLineup ? (
        <div className="live-match-court px-3 pb-1">
          <RotationDisplay 
            lineup={currentLineup}
            startingLineup={activeSet.metadata?.startingLineup}
            players={matchPlayers}
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
              toast.success(`Rotated to ${nextRotation}`);
            }}
            onPlayerClick={(idx, courtZone) => setSelectedCourtPosition({ positionIdx: idx, courtZone })}
            brightGymMode={brightGymMode}
          />
        </div>
      ) : (
        <div className="live-match-court px-3 pb-2">
          <button 
            onClick={() => setShowLineupEditor(true)}
            className={`w-full py-2 rounded-xl text-xs font-bold uppercase ${brightGymMode ? 'border border-slate-300 bg-white text-slate-700' : 'border border-brand-gray/10 bg-brand-gray/5 text-brand-text-secondary'}`}
          >
            Set Starting Lineup
          </button>
        </div>
      )}

      <div className="live-match-entry flex min-h-0 flex-1 px-3">
        <RallyEntryArea
          servingTeam={servingTeam}
          serverPlayerId={serverPlayerId}
          serveResult={serveResult}
          receiveResult={receiveResult}
          showReceivePlayerSelection={showReceivePlayerSelection}
          pointWinner={pointWinner}
          showPlayerSelection={showPlayerSelection}
          showClassification={showClassification}
          players={matchPlayers}
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
          brightGymMode={brightGymMode}
          entryLocked={isSavingAction}
        />
      </div>

      <RecentRalliesStrip
        rallies={rallies}
        players={matchPlayers}
        activeSetId={activeSet.id}
        brightGymMode={brightGymMode}
        compact={tableMode || scorerFocusMode}
      />

      {selectedCourtPosition && currentLineup && (
        <SubstitutionModal 
          isOpen={true}
          onClose={() => setSelectedCourtPosition(null)}
          players={matchPlayers}
          lineup={currentLineup}
          positionIdx={selectedCourtPosition.positionIdx}
          courtZone={selectedCourtPosition.courtZone}
          onSubstitute={async (playerId) => {
            try {
              await handleSubstitution(selectedCourtPosition.positionIdx, playerId);
              setSelectedCourtPosition(null);
              toast.success('Substitution complete');
            } catch (error) {
              console.error('Error saving substitution:', error);
              toast.error('Error saving substitution');
            }
          }}
          onLiberoSwap={async (liberoId) => {
            try {
              await handleLiberoSwap(selectedCourtPosition.positionIdx, liberoId);
              setSelectedCourtPosition(null);
              toast.success(liberoId ? 'Libero swap complete' : 'Libero exited');
            } catch (error) {
              console.error('Error saving libero swap:', error);
              toast.error('Error saving libero swap');
            }
          }}
          onSetLiberoServing={async (isServing) => {
            try {
              await handleSetLiberoServing(isServing, selectedCourtPosition.positionIdx);
              setSelectedCourtPosition(null);
              toast.success(isServing ? 'Libero set as server' : 'Libero server reset');
            } catch (error) {
              console.error('Error updating libero server:', error);
              toast.error('Error updating libero server');
            }
          }}
          liberoServingPosition={liberoServingPosition}
        />
      )}

      {/* Action Bar */}
      <div className={`live-match-actions grid ${scorerFocusMode ? 'grid-cols-1' : 'grid-cols-2'} gap-2 ${tableMode || scorerFocusMode ? 'p-1.5' : 'p-2'}`}>
        <button
          onClick={undoWithFeedback}
          className={`flex flex-col items-center gap-0.5 rounded-xl border active:border-brand-teal active:text-brand-teal ${brightGymMode ? 'border-slate-300 bg-white text-slate-950 shadow-sm' : 'border-brand-gray/40 bg-[#0f1117] text-brand-text'} ${tableMode || scorerFocusMode ? 'p-1.5' : 'p-2'}`}
        >
          <RotateCcw size={tableMode || scorerFocusMode ? 16 : 18} />
          <span className={tableMode || scorerFocusMode ? 'text-[8px] font-bold uppercase' : 'text-[9px] font-bold uppercase'}>Undo</span>
        </button>
        {!scorerFocusMode && (
          <button
            onClick={() => setShowNoteModal(true)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border active:border-brand-teal active:text-brand-teal ${brightGymMode ? 'border-slate-300 bg-white text-slate-950 shadow-sm' : 'border-brand-gray/40 bg-[#0f1117] text-brand-text'} ${tableMode ? 'p-1.5' : 'p-2'}`}
          >
            <MessageSquare size={tableMode ? 16 : 18} />
            <span className={tableMode ? 'text-[8px] font-bold uppercase' : 'text-[9px] font-bold uppercase'}>Note</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveMatch;
