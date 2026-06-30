import React, { useState, useEffect, useMemo } from 'react';
import type { Match, Set, RallyEvent, Team, Player } from '../types';
import { MatchContext } from './MatchContext.context';
import { useAuth } from '../hooks/useAuth';
import { useTeams, useAddTeam, useUpdateTeam } from '../hooks/queries/useTeams';
import { usePlayers, useAddPlayer, useDeletePlayer } from '../hooks/queries/usePlayers';
import { useMatches, useStartMatch, useUpdateMatch } from '../hooks/queries/useMatches';
import { useActiveSet, useStartSet, useUpdateSet } from '../hooks/queries/useSets';
import { useRallies, useAddRally, useUndoLastRally } from '../hooks/queries/useRallies';
import { useQueryClient } from '@tanstack/react-query';

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeMatch, setActiveMatch] = useState<Match | null>(() => {
    try {
      const saved = localStorage.getItem('activeMatch');
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTeam, setActiveTeam] = useState<Team | null>(() => {
    try {
      const saved = localStorage.getItem('activeTeam');
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Queries
  const { data: teams = [] } = useTeams(user?.id);
  
  const teamIds = useMemo(() => teams.map(t => t.id), [teams]);
  
  const { data: playersData = [] } = usePlayers(teamIds);
  const { data: matchesData = [] } = useMatches(teamIds);
  const { data: activeSetData } = useActiveSet(activeMatch?.id);
  const { data: ralliesData = [] } = useRallies(activeMatch?.id);

  useEffect(() => {
    console.log('MatchContext: activeSetData updated', activeSetData);
  }, [activeSetData]);

  useEffect(() => {
    console.log('MatchContext: ralliesData updated', ralliesData.length);
  }, [ralliesData]);

  // Mutations
  const addTeamMutation = useAddTeam();
  const updateTeamMutation = useUpdateTeam();
  const addPlayerMutation = useAddPlayer();
  const deletePlayerMutation = useDeletePlayer();
  const startMatchMutation = useStartMatch();
  const updateMatchMutation = useUpdateMatch();
  const startSetMutation = useStartSet();
  const updateSetMutation = useUpdateSet();
  const addRallyMutation = useAddRally();
  const undoLastRallyMutation = useUndoLastRally();

  const isSyncing = addTeamMutation.isPending || 
                    updateTeamMutation.isPending || 
                    addPlayerMutation.isPending || 
                    deletePlayerMutation.isPending || 
                    startMatchMutation.isPending || 
                    updateMatchMutation.isPending || 
                    startSetMutation.isPending || 
                    updateSetMutation.isPending || 
                    addRallyMutation.isPending || 
                    undoLastRallyMutation.isPending;

  useEffect(() => {
    if (activeMatch) {
      localStorage.setItem('activeMatch', JSON.stringify(activeMatch));
    } else {
      localStorage.removeItem('activeMatch');
    }
  }, [activeMatch]);

  useEffect(() => {
    if (activeTeam) {
      localStorage.setItem('activeTeam', JSON.stringify(activeTeam));
    } else {
      localStorage.removeItem('activeTeam');
    }
  }, [activeTeam]);

  const selectTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId) || null;
    setActiveTeam(team);
  };

  const addTeam = async (team: Team) => {
    if (!user) return;
    await addTeamMutation.mutateAsync({ ...team, ownerId: user.id });
  };

  const endSet = async (result: 'Win' | 'Loss') => {
    if (!activeSetData) return;
    await updateSetMutation.mutateAsync({ 
      setId: activeSetData.id, 
      updates: { status: 'completed', finalResult: result } 
    });
  };

  const updateSet = async (setId: string, updates: Partial<Set>) => {
    await updateSetMutation.mutateAsync({ setId, updates });
  };

  const updateMatch = async (matchId: string, updates: Partial<Match>) => {
    await updateMatchMutation.mutateAsync({ matchId, updates });
    if (activeMatch && activeMatch.id === matchId) {
      setActiveMatch({ ...activeMatch, ...updates });
    }
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    await updateTeamMutation.mutateAsync({ teamId, updates });
    if (activeTeam && activeTeam.id === teamId) {
      setActiveTeam({ ...activeTeam, ...updates });
    }
  };

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['teams', user?.id] });
  };

  const startMatch = async (match: Match) => {
    await startMatchMutation.mutateAsync(match);
    setActiveMatch(match);
  };

  const startSet = async (set: Set) => {
    await startSetMutation.mutateAsync(set);
  };

  const addRally = async (rally: RallyEvent) => {
    console.log('MatchContext: addRally called', rally);
    if (activeSetData) {
      const updatedSet = {
        id: activeSetData.id,
        ourScore: rally.scoreAfterUs,
        opponentScore: rally.scoreAfterOpponent,
      };
      console.log('MatchContext: updating set', updatedSet);
      try {
        await addRallyMutation.mutateAsync({ rally, updatedSet });
        console.log('MatchContext: addRally mutation finished');
      } catch (error) {
        console.error('MatchContext: Mutation failed with error:', error);
        // Ensure the error is re-thrown so hooks can handle it
        throw error;
      }
    } else {
      console.warn('MatchContext: addRally called but activeSetData is missing');
      throw new Error('Active set data missing');
    }
  };

  const undoLastRally = async () => {
    if (ralliesData.length === 0 || !activeSetData) return;
    const lastRally = ralliesData[ralliesData.length - 1];
    
    await undoLastRallyMutation.mutateAsync({
      rallyId: lastRally.id,
      matchId: activeMatch!.id,
      setId: activeSetData.id,
      restoredScores: {
        ourScore: lastRally.scoreBeforeUs,
        opponentScore: lastRally.scoreBeforeOpponent,
      }
    });
  };

  const addPlayer = async (player: Player) => {
    await addPlayerMutation.mutateAsync(player);
  };

  const removePlayer = async (playerId: string) => {
    await deletePlayerMutation.mutateAsync(playerId);
  };

  // Filter players by active team if one is selected
  const filteredPlayers = useMemo(() => {
    if (activeTeam) {
      return playersData.filter(p => p.teamId === activeTeam.id);
    }
    return playersData;
  }, [playersData, activeTeam]);

  return (
    <MatchContext.Provider value={{ 
      activeMatch, 
      activeSet: activeSetData || null, 
      activeTeam,
      rallies: ralliesData, 
      teams, 
      players: filteredPlayers,
      matches: matchesData,
      isSyncing,
      startMatch,
      startSet,
      addRally,
      undoLastRally,
      addPlayer,
      removePlayer,
      addTeam,
      selectTeam,
      endSet,
      updateSet,
      updateMatch,
      updateTeam,
      refreshData
    }}>
      {children}
    </MatchContext.Provider>
  );
};
