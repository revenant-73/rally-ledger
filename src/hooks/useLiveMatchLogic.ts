import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Match, Set, RallyEvent, OutcomeType, Classification, Lineup } from '../types';

export const useLiveMatchLogic = (
  activeMatch: Match | null,
  activeSet: Set | null,
  rallies: RallyEvent[],
  addRally: (rally: RallyEvent) => Promise<void>,
  undoLastRally: () => Promise<void>,
  updateSet: (setId: string, updates: Partial<Set>) => Promise<void>
) => {
  const [pointWinner, setPointWinner] = useState<'Us' | 'Opponent' | null>(null);
  const [outcome, setOutcome] = useState<OutcomeType | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [serverPlayerId, setServerPlayerId] = useState<string | null>(null);
  const [serveResult, setServeResult] = useState<'Ace' | 'Error' | 'In-System' | 'Out-of-System' | null>(null);
  const [receiveResult, setReceiveResult] = useState<'Error' | 'Overpass' | 'In-System' | 'Out-of-System' | null>(null);
  const [receivePlayerId, setReceivePlayerId] = useState<string | null>(null);
  const [servingTeam, setServingTeam] = useState<'Us' | 'Opponent'>('Us');
  const [currentRotation, setCurrentRotation] = useState<number>(activeSet?.metadata?.currentRotation || 1);
  const [currentLineup, setCurrentLineup] = useState<Lineup | null>(activeSet?.metadata?.currentLineup || activeSet?.metadata?.startingLineup || null);
  const [liberoServingPosition, setLiberoServingPosition] = useState<number | undefined>(activeSet?.metadata?.liberoServingPosition);

  // Sync state from activeSet
  useEffect(() => {
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
  }, [activeSet?.metadata]);

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
    
    const nextLineup = {
      ...currentLineup,
      [`position${positionIdx}`]: newPlayerId
    };
    
    setCurrentLineup(nextLineup);
    await updateSet(activeSet.id, {
      metadata: {
        ...activeSet.metadata,
        currentLineup: nextLineup
      }
    });
  }, [activeSet, currentLineup, updateSet]);

  const handleLiberoSwap = useCallback(async (positionIdx: number, liberoId: string | null) => {
    if (!activeSet || !currentLineup) return;
    
    let nextPlayerId = liberoId;
    if (!liberoId) {
      // Swapping back to the starting player for this position
      nextPlayerId = activeSet.metadata?.startingLineup?.[`position${positionIdx}` as keyof Lineup] || '';
    }
    
    if (!nextPlayerId) return;

    const nextLineup = {
      ...currentLineup,
      [`position${positionIdx}`]: nextPlayerId
    };
    
    setCurrentLineup(nextLineup);
    await updateSet(activeSet.id, {
      metadata: {
        ...activeSet.metadata,
        currentLineup: nextLineup
      }
    });
  }, [activeSet, currentLineup, updateSet]);

  const handleSetLiberoServing = useCallback(async (isServing: boolean, positionIdx: number) => {
    if (!activeSet) return;
    
    const nextLiberoPos = isServing ? positionIdx : undefined;
    setLiberoServingPosition(nextLiberoPos);
    await updateSet(activeSet.id, {
      metadata: {
        ...activeSet.metadata,
        liberoServingPosition: nextLiberoPos
      }
    });
  }, [activeSet, updateSet]);

  const completeRally = useCallback(async (
    classification: Classification, 
    winnerOverride?: 'Us' | 'Opponent', 
    outcomeOverride?: OutcomeType,
    playerOverride?: string | null
  ) => {
    const winner = winnerOverride || pointWinner;
    const finalOutcome = outcomeOverride || outcome;
    const finalPlayerId = playerOverride !== undefined ? playerOverride : selectedPlayerId;

    console.log('Completing rally:', { winner, finalOutcome, classification, finalPlayerId });

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
      createdAt: new Date().toISOString(),
      metadata: {
        serveResult: serveResult || undefined,
        receiveResult: receiveResult || undefined,
        receivePlayerId: receivePlayerId || undefined,
        rotation: currentRotation,
        lineup: currentLineup || undefined,
        isLiberoServing
      },
    };

    console.log('New rally object:', newRally);

    // Rotation Logic: if we win a point and were NOT serving, we rotate
    if (winner === 'Us' && servingTeam === 'Opponent') {
      const nextRotation = currentRotation === 6 ? 1 : currentRotation + 1;
      setCurrentRotation(nextRotation);
      setServingTeam('Us');
      // Update set metadata with current rotation
      await updateSet(activeSet.id, {
        metadata: {
          ...activeSet.metadata,
          currentRotation: nextRotation
        }
      });
    } else if (winner === 'Us') {
      setServingTeam('Us');
    } else {
      setServingTeam('Opponent');
    }

    // Reset entry immediately for a snappier UI, but keep data for the call
    resetEntry();

    try {
      console.log('Calling addRally...');
      await addRally(newRally);
      console.log('addRally completed successfully');
    } catch (error) {
      console.error('Failed to add rally:', error);
      throw error; // Re-throw so LiveMatch can show toast
    }
    return newRally;
  }, [pointWinner, outcome, selectedPlayerId, activeSet, activeMatch, rallies.length, servingTeam, serverPlayerId, serveResult, receiveResult, receivePlayerId, addRally, resetEntry, currentRotation, currentLineup, liberoServingPosition, updateSet]);

  const undoLastRallyWithLogic = useCallback(async () => {
    if (rallies.length === 0) return null;
    const lastRally = rallies[rallies.length - 1];
    setServingTeam(lastRally.servingTeam);
    
    // Restore rotation and lineup from last rally if available
    if (lastRally.metadata?.rotation) {
      setCurrentRotation(lastRally.metadata.rotation);
    }
    if (lastRally.metadata?.lineup) {
      setCurrentLineup(lastRally.metadata.lineup);
    }

    await undoLastRally();
    return lastRally;
  }, [rallies, undoLastRally]);

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
    currentRotation,
    setCurrentRotation,
    currentLineup,
    liberoServingPosition,
    handleSubstitution,
    handleLiberoSwap,
    handleSetLiberoServing,
    completeRally,
    undoLastRallyWithLogic,
    resetEntry
  };
};
