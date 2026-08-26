import React, { useState, useEffect, useMemo } from 'react';
import type { Match, Set, RallyEvent, Team, Player } from '../types';
import { MatchContext } from './MatchContext.context';
import { useAuth } from '../hooks/useAuth';
import { useTeams, useAddTeam, useUpdateTeam, useDeleteTeam } from '../hooks/queries/useTeams';
import { usePlayers, useAddPlayer, useDeletePlayer } from '../hooks/queries/usePlayers';
import { useMatches, useStartMatch, useUpdateMatch, useDeleteMatch } from '../hooks/queries/useMatches';
import { useActiveSet, useStartSet, useUpdateSet } from '../hooks/queries/useSets';
import { useRallies, useAddRally, useUndoLastRally } from '../hooks/queries/useRallies';
import { useAccess } from '../hooks/queries/useAccess';
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
  const { data: access } = useAccess(user?.id);
  
  const teamIds = useMemo(() => teams.map(t => t.id), [teams]);
  const manageableTeamIds = useMemo(() => access?.manageableTeamIds ?? [], [access]);
  const manageableTeamIdSet = useMemo(() => new Set(manageableTeamIds), [manageableTeamIds]);
  
  const { data: playersData = [] } = usePlayers(user?.id, teamIds);
  const { data: matchesData = [] } = useMatches(user?.id, teamIds);
  const { data: activeSetData } = useActiveSet(user?.id, activeMatch?.id);
  const { data: ralliesData = [] } = useRallies(user?.id, activeMatch?.id);

  // Mutations
  const addTeamMutation = useAddTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const addPlayerMutation = useAddPlayer();
  const deletePlayerMutation = useDeletePlayer();
  const startMatchMutation = useStartMatch();
  const updateMatchMutation = useUpdateMatch();
  const deleteMatchMutation = useDeleteMatch();
  const startSetMutation = useStartSet();
  const updateSetMutation = useUpdateSet();
  const addRallyMutation = useAddRally();
  const undoLastRallyMutation = useUndoLastRally();

  const isSyncing = addTeamMutation.isPending || 
                    updateTeamMutation.isPending || 
                    deleteTeamMutation.isPending ||
                    addPlayerMutation.isPending || 
                    deletePlayerMutation.isPending || 
                    startMatchMutation.isPending || 
                    updateMatchMutation.isPending ||
                    deleteMatchMutation.isPending ||
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

  const canManageTeam = (teamId?: string) => {
    if (!teamId) return false;
    return access?.isAdmin === true || manageableTeamIdSet.has(teamId);
  };

  const addTeam = async (team: Team) => {
    if (!user) return;
    const savedTeam = { ...team, ownerId: user.id };
    await addTeamMutation.mutateAsync({ userId: user.id, team: savedTeam });
    setActiveTeam(savedTeam);
  };

  const endSet = async (result: 'Win' | 'Loss') => {
    if (!activeSetData) return;
    if (!user) throw new Error('User missing');
    await updateSetMutation.mutateAsync({
      userId: user.id,
      setId: activeSetData.id,
      updates: { status: 'completed', finalResult: result },
      matchId: activeMatch?.id
    });
  };

  const endMatch = async (result: 'Win' | 'Loss') => {
    if (!activeMatch) return;
    if (!user) throw new Error('User missing');
    await updateMatchMutation.mutateAsync({
      userId: user.id,
      matchId: activeMatch.id,
      updates: { status: 'completed', result },
    });
    setActiveMatch(null);
  };

  const updateSet = async (setId: string, updates: Partial<Set>) => {
    if (!user) throw new Error('User missing');
    await updateSetMutation.mutateAsync({ userId: user.id, setId, updates, matchId: activeMatch?.id });
  };

  const updateMatch = async (matchId: string, updates: Partial<Match>) => {
    if (!user) throw new Error('User missing');
    await updateMatchMutation.mutateAsync({ userId: user.id, matchId, updates });
    if (activeMatch && activeMatch.id === matchId) {
      setActiveMatch({ ...activeMatch, ...updates });
    }
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    if (!user) throw new Error('User missing');
    await updateTeamMutation.mutateAsync({ userId: user.id, teamId, updates });
    if (activeTeam && activeTeam.id === teamId) {
      setActiveTeam({ ...activeTeam, ...updates });
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!user) throw new Error('User missing');
    await deleteTeamMutation.mutateAsync({ userId: user.id, teamId });
    if (activeTeam?.id === teamId) {
      setActiveTeam(null);
    }
    if (activeMatch?.teamId === teamId) {
      setActiveMatch(null);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!user) throw new Error('User missing');
    await deleteMatchMutation.mutateAsync({ userId: user.id, matchId });
    if (activeMatch?.id === matchId) {
      setActiveMatch(null);
    }
  };

  const refreshData = async () => {
    await queryClient.invalidateQueries({ queryKey: ['teams', user?.id] });
  };

  const startMatch = async (match: Match) => {
    if (!user) throw new Error('User missing');
    await startMatchMutation.mutateAsync({ userId: user.id, match });
    setActiveMatch(match);
  };

  const startSet = async (set: Set) => {
    if (!user) throw new Error('User missing');
    await startSetMutation.mutateAsync({ userId: user.id, set });
  };

  const addRally = async (rally: RallyEvent, setMetadataUpdates?: Set['metadata']) => {
    if (!user) throw new Error('User missing');
    if (activeSetData) {
      const updatedSet = {
        id: activeSetData.id,
        ourScore: rally.scoreAfterUs,
        opponentScore: rally.scoreAfterOpponent,
        metadata: setMetadataUpdates ? {
          ...activeSetData.metadata,
          ...setMetadataUpdates,
        } : undefined,
      };
      try {
        await addRallyMutation.mutateAsync({ userId: user.id, rally, updatedSet });
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

  const undoLastRally = async (setMetadataUpdates?: Set['metadata']) => {
    if (!user) throw new Error('User missing');
    if (ralliesData.length === 0 || !activeSetData) return;
    const activeSetRallies = ralliesData.filter(rally => rally.setId === activeSetData.id);
    if (activeSetRallies.length === 0) return;
    const lastRally = activeSetRallies[activeSetRallies.length - 1];
    
    await undoLastRallyMutation.mutateAsync({
      userId: user.id,
      rallyId: lastRally.id,
      matchId: activeMatch!.id,
      setId: activeSetData.id,
      restoredScores: {
        ourScore: lastRally.scoreBeforeUs,
        opponentScore: lastRally.scoreBeforeOpponent,
      },
      restoredMetadata: setMetadataUpdates ? {
        ...activeSetData.metadata,
        ...setMetadataUpdates,
      } : undefined,
    });
  };

  const addPlayer = async (player: Player) => {
    if (!user) throw new Error('User missing');
    await addPlayerMutation.mutateAsync({ userId: user.id, player });
  };

  const removePlayer = async (playerId: string) => {
    if (!user) throw new Error('User missing');
    await deletePlayerMutation.mutateAsync({ userId: user.id, playerId });
  };

  return (
    <MatchContext.Provider value={{ 
      activeMatch, 
      activeSet: activeSetData || null, 
      activeTeam,
      rallies: ralliesData, 
      teams, 
      players: playersData,
      matches: matchesData,
      isAdmin: access?.isAdmin === true,
      isSyncing,
      manageableTeamIds,
      canManageTeam,
      startMatch,
      startSet,
      addRally,
      undoLastRally,
      addPlayer,
      removePlayer,
      addTeam,
      deleteTeam,
      deleteMatch,
      selectTeam,
      endSet,
      endMatch,
      updateSet,
      updateMatch,
      updateTeam,
      refreshData
    }}>
      {children}
    </MatchContext.Provider>
  );
};
