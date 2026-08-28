import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Match, Set, RallyEvent, OutcomeType, Classification, Lineup } from '../types';

export const useLiveMatchLogic = (
  activeMatch: Match | null,
  activeSet: Set | null,
  rallies: RallyEvent[],
  addRally: (rally: RallyEvent, setMetadataUpdates?: Set['metadata']) => Promise<void>,
  undoLastRally: (setMetadataUpdates?: Set['metadata']) => Promise<void>,
  updateSet: (setId: string, updates: Partial<Set>) => Promise<void>
) => {
  const [pointWinner, setPointWinner] = useState<'Us' | 'Opponent' | null>(null);
  const [outcome, setOutcome] = useState<OutcomeType | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [serverPlayerId, setServerPlayerId] = useState<string | null>(null);
  const [serveResult, setServeResult] = useState<'Ace' | 'Error' | 'In-System' | 'Out-of-System' | null>(null);
  const [receiveResult, setReceiveResult] = useState<'Error' | 'Overpass' | 'In-System' | 'Out-of-System' | null>(null);
  const [receivePlayerId, setReceivePlayerId] = useState<string | null>(null);
  const [servingTeam, setServingTeam] = useState<'Us' | 'Opponent'>(
    activeSet?.metadata?.servingTeam || activeSet?.startingServerTeam || 'Us'
  );
  const [currentRotation, setCurrentRotation] = useState<number>(activeSet?.metadata?.currentRotation || 1);
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(activeSet?.metadata?.currentLineup || activeSet?.metadata?.startingLineup || null);
  const [liberoServingPosition, setLiberoServingPosition] = useState<number | undefined>(activeSet?.metadata?.liberoServingPosition);
  const [prevActiveSetId, setPrevActiveSetId] = useState(activeSet?.id);

  // Sync state from activeSet.metadata when it changes (e.g. a refetch from
  // another device). Adjusted during render, not in an effect, per React's
  // guidance for "adjusting state when a prop changes" - this avoids an
  // extra commit-then-effect render pass and the react-hooks/set-state-in-effect
  // lint rule it triggers.
  const [prevMetadata, setPrevMetadata] = useState(activeSet?.metadata);
  if (activeSet?.id !== prevActiveSetId) {
    setPrevActiveSetId(activeSet?.id);
    setPrevMetadata(activeSet?.metadata);
    setPointWinner(null);
    setOutcome(null);
    setSelectedPlayerId(null);
    setServerPlayerId(null);
    setServeResult(null);
    setReceiveResult(null);
    setReceivePlayerId(null);
    setServingTeam(activeSet?.metadata?.servingTeam || activeSet?.startingServerTeam || 'Us');
    setCurrentRotation(activeSet?.metadata?.currentRotation || 1);
    setCurrentLineup(activeSet?.metadata?.currentLineup || activeSet?.metadata?.startingLineup || null);
    setLiberoServingPosition(activeSet?.metadata?.liberoServingPosition);
  } else if (activeSet?.metadata !== prevMetadata) {
    setPrevMetadata(activeSet?.metadata);
    if (activeSet?.metadata?.currentRotation) {
      setCurrentRotation(activeSet.metadata.currentRotation);
    }
    if (activeSet?.metadata?.currentLineup) {
      setCurrentLineup(activeSet.metadata.currentLineup);
    } else if (activeSet?.metadata?.startingLineup) {
      setCurrentLineup(activeSet.metadata.startingLineup);
    }
    if (activeSet?.metadata?.liberoServingPosition) {
      setLiberoServingPosition(activeSet.metadata.liberoServingPosition);
    }
    if (activeSet?.metadata?.servingTeam) {
      setServingTeam(activeSet.metadata.servingTeam);
    }
  }

  const toggleServingTeam = useCallback(async () => {
    if (!activeSet) return;
    const nextServingTeam = servingTeam === 'Us' ? 'Opponent' : 'Us';
    setServingTeam(nextServingTeam);
    await updateSet(activeSet.id, {
      metadata: {
        ...activeSet.metadata,
        servingTeam: nextServingTeam
      }
    });
  }, [activeSet, servingTeam, updateSet]);

  const resetEntry = useCallback(() => {
    setPointWinner(null);
    setOutcome(null);
    setSelectedPlayerId(null);
    setServerPlayerId(null);
    setServeResult(null);
    setReceiveResult(null);
    setReceivePlayerId(null);
  }, []);

  const handleSubstitution = useCallback(async (positionIdx: number, newPlayerId: string) => {
    if (!activeSet || !currentLineup) return;

    const previousLineup = currentLineup;
    const nextLineup = {
      ...currentLineup,
      [`position${positionIdx}`]: newPlayerId
    };

    setCurrentLineup(nextLineup);
    try {
      await updateSet(activeSet.id, {
        metadata: {
          ...activeSet.metadata,
          currentLineup: nextLineup
        }
      });
    } catch (error) {
      setCurrentLineup(previousLineup);
      throw error;
    }
  }, [activeSet, currentLineup, updateSet]);

  const handleLiberoSwap = useCallback(async (positionIdx: number, liberoId: string | null) => {
    if (!activeSet || !currentLineup) return;

    let nextPlayerId = liberoId;
    if (!liberoId) {
      // Swapping back to the starting player for this position
      nextPlayerId = activeSet.metadata?.startingLineup?.[`position${positionIdx}` as keyof Lineup] || '';
    }

    if (!nextPlayerId) return;

    const previousLineup = currentLineup;
    const nextLineup = {
      ...currentLineup,
      [`position${positionIdx}`]: nextPlayerId
    };

    setCurrentLineup(nextLineup);
    try {
      await updateSet(activeSet.id, {
        metadata: {
          ...activeSet.metadata,
          currentLineup: nextLineup
        }
      });
    } catch (error) {
      setCurrentLineup(previousLineup);
      throw error;
    }
  }, [activeSet, currentLineup, updateSet]);

  const handleSetLiberoServing = useCallback(async (isServing: boolean, positionIdx: number) => {
    if (!activeSet) return;

    const previousLiberoServingPosition = liberoServingPosition;
    const nextLiberoPos = isServing ? positionIdx : undefined;
    setLiberoServingPosition(nextLiberoPos);
    try {
      await updateSet(activeSet.id, {
        metadata: {
          ...activeSet.metadata,
          liberoServingPosition: nextLiberoPos
        }
      });
    } catch (error) {
      setLiberoServingPosition(previousLiberoServingPosition);
      throw error;
    }
  }, [activeSet, liberoServingPosition, updateSet]);

  const completeRally = useCallback(async (
    classification: Classification, 
    winnerOverride?: 'Us' | 'Opponent', 
    outcomeOverride?: OutcomeType,
    playerOverride?: string | null
  ) => {
    const winner = winnerOverride || pointWinner;
    const finalOutcome = outcomeOverride || outcome;
    const finalPlayerId = playerOverride !== undefined ? playerOverride : selectedPlayerId;

    if (!winner || !finalOutcome || !activeSet || !activeMatch) {
      console.warn('Aborting rally completion - missing data:', { 
        winner, 
        finalOutcome, 
        hasActiveSet: !!activeSet, 
        hasActiveMatch: !!activeMatch,
        servingTeam,
        serveResult,
        receiveResult
      });
      resetEntry();
      throw new Error('Missing required rally data');
    }

    // Determine if libero was serving
    const isLiberoServing = servingTeam === 'Us' && currentRotation === liberoServingPosition;
    const finalServeResult = serveResult
      ?? (servingTeam === 'Us' && finalOutcome === 'Ace' ? 'Ace' : undefined)
      ?? (servingTeam === 'Us' && finalOutcome === 'Serve Error' ? 'Error' : undefined);
    const finalReceiveResult = receiveResult
      ?? (servingTeam === 'Opponent' && finalOutcome === 'Ace' && winner === 'Opponent' ? 'Error' : undefined);
    const finalReceivePlayerId = receivePlayerId
      || (servingTeam === 'Opponent' && finalReceiveResult === 'Error' ? finalPlayerId : null);

    const newRally: RallyEvent = {
      id: uuidv4(),
      matchId: activeMatch.id,
      setId: activeSet.id,
      rallyNumber: (rallies?.length || 0) + 1,
      scoreBeforeUs: activeSet.ourScore || 0,
      scoreBeforeOpponent: activeSet.opponentScore || 0,
      scoreAfterUs: winner === 'Us' ? (activeSet.ourScore || 0) + 1 : (activeSet.ourScore || 0),
      scoreAfterOpponent: winner === 'Opponent' ? (activeSet.opponentScore || 0) + 1 : (activeSet.opponentScore || 0),
      pointWinner: winner,
      servingTeam,
      serverPlayerId: serverPlayerId || undefined,
      outcomeType: finalOutcome,
      classification,
      playerId: finalPlayerId || undefined,
      serveResult: finalServeResult,
      receiveResult: finalReceiveResult,
      receivePlayerId: finalReceivePlayerId || undefined,
      createdAt: new Date().toISOString(),
      metadata: {
        serveResult: finalServeResult,
        receiveResult: finalReceiveResult,
        receivePlayerId: finalReceivePlayerId || undefined,
        rotation: currentRotation,
        lineup: currentLineup || undefined,
        isLiberoServing
      },
    };

    // Rotation Logic: if we win a point and were NOT serving, we rotate
    const nextRotation = (winner === 'Us' && servingTeam === 'Opponent')
      ? (currentRotation === 6 ? 1 : currentRotation + 1)
      : currentRotation;
    const nextServingTeam = winner === 'Us' ? 'Us' : 'Opponent';

    const previousRotation = currentRotation;
    const previousServingTeam = servingTeam;
    setCurrentRotation(nextRotation);
    setServingTeam(nextServingTeam);
    try {
      await addRally(newRally, {
        currentRotation: nextRotation,
        servingTeam: nextServingTeam,
      });
      resetEntry();
    } catch (error) {
      setCurrentRotation(previousRotation);
      setServingTeam(previousServingTeam);
      console.error('Failed to add rally:', error);
      throw error; // Re-throw so LiveMatch can show toast
    }
    return newRally;
  }, [pointWinner, outcome, selectedPlayerId, activeSet, activeMatch, rallies.length, servingTeam, serverPlayerId, serveResult, receiveResult, receivePlayerId, addRally, resetEntry, currentRotation, currentLineup, liberoServingPosition]);

  // Manual +/- score corrections go through the same rally log as normal points, tagged
  // with classification 'Neutral' (excluded from earned/gifted stats) so the Undo button
  // and rally history stay accurate instead of silently drifting from the score.
  const handleManualScoreAdjustment = useCallback(async (team: 'Us' | 'Opponent', delta: 1 | -1) => {
    if (!activeSet || !activeMatch) return;

    const scoreBeforeUs = activeSet.ourScore || 0;
    const scoreBeforeOpponent = activeSet.opponentScore || 0;
    const scoreAfterUs = team === 'Us' ? Math.max(0, scoreBeforeUs + delta) : scoreBeforeUs;
    const scoreAfterOpponent = team === 'Opponent' ? Math.max(0, scoreBeforeOpponent + delta) : scoreBeforeOpponent;

    const newRally: RallyEvent = {
      id: uuidv4(),
      matchId: activeMatch.id,
      setId: activeSet.id,
      rallyNumber: (rallies?.length || 0) + 1,
      scoreBeforeUs,
      scoreBeforeOpponent,
      scoreAfterUs,
      scoreAfterOpponent,
      pointWinner: team,
      servingTeam,
      outcomeType: 'Manual Adjustment',
      classification: 'Neutral',
      createdAt: new Date().toISOString(),
      metadata: {
        rotation: currentRotation,
        lineup: currentLineup || undefined,
      },
    };

    await addRally(newRally);
    return newRally;
  }, [activeSet, activeMatch, rallies.length, servingTeam, currentRotation, currentLineup, addRally]);

  const undoLastRallyWithLogic = useCallback(async () => {
    if (rallies.length === 0 || !activeSet) return null;
    const activeSetRallies = rallies.filter(rally => rally.setId === activeSet.id);
    if (activeSetRallies.length === 0) return null;
    const lastRally = activeSetRallies[activeSetRallies.length - 1];
    const restoredRotation = lastRally.metadata?.rotation ?? currentRotation;
    const restoredLineup = lastRally.metadata?.lineup ?? currentLineup;
    const previousServingTeam = servingTeam;
    const previousRotation = currentRotation;
    const previousLineup = currentLineup;

    setServingTeam(lastRally.servingTeam);
    setCurrentRotation(restoredRotation);
    if (lastRally.metadata?.lineup) {
      setCurrentLineup(lastRally.metadata.lineup);
    }

    try {
      await undoLastRally({
        servingTeam: lastRally.servingTeam,
        currentRotation: restoredRotation,
        currentLineup: restoredLineup ?? undefined,
      });
    } catch (error) {
      setServingTeam(previousServingTeam);
      setCurrentRotation(previousRotation);
      setCurrentLineup(previousLineup);
      throw error;
    }
    return lastRally;
  }, [rallies, undoLastRally, activeSet, currentRotation, currentLineup, servingTeam]);

  return {
    pointWinner,
    setPointWinner,
    outcome,
    setOutcome,
    selectedPlayerId,
    setSelectedPlayerId,
    serverPlayerId,
    setServerPlayerId,
    serveResult,
    setServeResult,
    receiveResult,
    setReceiveResult,
    receivePlayerId,
    setReceivePlayerId,
    servingTeam,
    setServingTeam,
    toggleServingTeam,
    currentRotation,
    setCurrentRotation,
    currentLineup,
    liberoServingPosition,
    handleSubstitution,
    handleLiberoSwap,
    handleSetLiberoServing,
    completeRally,
    handleManualScoreAdjustment,
    undoLastRallyWithLogic,
    resetEntry
  };
};
