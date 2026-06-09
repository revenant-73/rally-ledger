import React, { useState, useEffect, useCallback } from 'react';
import type { Match, Set, RallyEvent, Team, Player } from '../types';
import { db } from '../db/client';
import { players as playersTable, matches as matchesTable, sets as setsTable, rallyEvents as rallyEventsTable, teams as teamsTable } from '../db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { MatchContext } from './MatchContext.context';
import { useAuth } from '../hooks/useAuth';

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeMatch, setActiveMatch] = useState<Match | null>(() => {
    try {
      const saved = localStorage.getItem('activeMatch');
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeSet, setActiveSet] = useState<Set | null>(() => {
    try {
      const saved = localStorage.getItem('activeSet');
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

  const [rallies, setRallies] = useState<RallyEvent[]>(() => {
    try {
      const saved = localStorage.getItem('rallies');
      return saved && saved !== "undefined" ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem('teams');
      return saved && saved !== "undefined" ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('players');
      return saved && saved !== "undefined" ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const selectTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId) || null;
    setActiveTeam(team);
  };

  const addTeam = async (team: Team) => {
    if (!user) return;
    const teamWithOwner = { ...team, ownerId: user.id };
    setTeams(prev => [...prev, teamWithOwner]);
    setIsSyncing(true);
    try {
      await db.insert(teamsTable).values(teamWithOwner);
    } catch (e) {
      console.error('Failed to sync team to Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const endSet = async (result: 'Win' | 'Loss') => {
    if (!activeSet) return;
    
    setIsSyncing(true);
    try {
      await db.update(setsTable)
        .set({ status: 'completed', finalResult: result, updatedAt: new Date().toISOString() })
        .where(eq(setsTable.id, activeSet.id));
      setActiveSet(null);
    } catch (e) {
      console.error('Failed to end set in Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateSet = async (setId: string, updates: Partial<Set>) => {
    setIsSyncing(true);
    try {
      await db.update(setsTable)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(setsTable.id, setId));
      
      if (activeSet && activeSet.id === setId) {
        setActiveSet({ ...activeSet, ...updates });
      }
    } catch (e) {
      console.error('Failed to update set in Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateMatch = async (matchId: string, updates: Partial<Match>) => {
    setIsSyncing(true);
    try {
      await db.update(matchesTable)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(matchesTable.id, matchId));
      
      if (activeMatch && activeMatch.id === matchId) {
        setActiveMatch({ ...activeMatch, ...updates });
      }
    } catch (e) {
      console.error('Failed to update match in Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshData = useCallback(async () => {
    if (!user) return;
    console.log('Refreshing data from Turso...');
    setIsSyncing(true);
    try {
      // Get only teams owned by current user
      const dbTeams = await db.select().from(teamsTable).where(eq(teamsTable.ownerId, user.id));
      setTeams(dbTeams as Team[]);

      const teamIds = dbTeams.map(t => t.id);
      
      let dbPlayers: Player[] = [];
      let dbMatches: Match[] = [];
      
      if (teamIds.length > 0) {
        const playersData = await db.select().from(playersTable).where(inArray(playersTable.teamId, teamIds));
        dbPlayers = playersData as Player[];
        
        const matchesData = await db.select().from(matchesTable).where(inArray(matchesTable.teamId, teamIds));
        dbMatches = matchesData as Match[];
      }
      
      // Auto-resume active match if none selected
      let currentMatch = activeMatch;
      if (!currentMatch || !teamIds.includes(currentMatch.teamId)) {
        const activeMatchEntry = dbMatches.find(m => m.status === 'active');
        if (activeMatchEntry) {
          currentMatch = activeMatchEntry as Match;
          setActiveMatch(currentMatch);
        } else {
          setActiveMatch(null);
          currentMatch = null;
        }
      }

      // Auto-resume active set for the current match
      if (currentMatch && !activeSet) {
        const activeSets = await db.select()
          .from(setsTable)
          .where(and(
            eq(setsTable.matchId, currentMatch.id),
            eq(setsTable.status, 'active')
          ))
          .limit(1);
        if (activeSets.length > 0) {
          setActiveSet(activeSets[0] as Set);
        }
      }
      
      if (activeTeam) {
        const teamPlayers = dbPlayers.filter(p => p.teamId === activeTeam.id);
        setPlayers(teamPlayers as Player[]);
      } else {
        setPlayers(dbPlayers as Player[]);
      }
      
      if (currentMatch) {
        const currentRallies = await db.select()
          .from(rallyEventsTable)
          .where(eq(rallyEventsTable.matchId, currentMatch.id));
        setRallies(currentRallies as RallyEvent[]);
      }
      console.log('Data refresh complete.');
    } catch (e) {
      console.error('Failed to refresh data from Turso', e);
    } finally {
      setIsSyncing(false);
    }
  }, [activeMatch, activeTeam, activeSet, user]);

  useEffect(() => {
    localStorage.setItem('activeTeam', JSON.stringify(activeTeam));
  }, [activeTeam]);

  // Initial load from DB and sync on changes
  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      if (isMounted) {
        await refreshData();
      }
    };
    
    load();
    
    return () => {
      isMounted = false;
    };
  }, [refreshData]);

  useEffect(() => {
    localStorage.setItem('activeMatch', JSON.stringify(activeMatch));
  }, [activeMatch]);

  useEffect(() => {
    localStorage.setItem('activeSet', JSON.stringify(activeSet));
  }, [activeSet]);

  useEffect(() => {
    localStorage.setItem('rallies', JSON.stringify(rallies));
  }, [rallies]);

  useEffect(() => {
    localStorage.setItem('teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('players', JSON.stringify(players));
  }, [players]);

  const startMatch = async (match: Match) => {
    setActiveMatch(match);
    setRallies([]);
    setActiveSet(null);
    setIsSyncing(true);
    try {
      await db.insert(matchesTable).values(match);
    } catch (e) {
      console.error('Failed to sync match to Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const startSet = async (set: Set) => {
    setActiveSet(set);
    setIsSyncing(true);
    try {
      await db.insert(setsTable).values(set);
    } catch (e) {
      console.error('Failed to sync set to Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const addRally = async (rally: RallyEvent) => {
    // Optimistic update
    setRallies((prev) => [...prev, rally]);
    if (activeSet) {
      const updatedSet = {
        ...activeSet,
        ourScore: rally.scoreAfterUs,
        opponentScore: rally.scoreAfterOpponent,
      };
      setActiveSet(updatedSet);
      
      setIsSyncing(true);
      try {
        await db.insert(rallyEventsTable).values(rally);
        await db.update(setsTable)
          .set({ ourScore: updatedSet.ourScore, opponentScore: updatedSet.opponentScore })
          .where(eq(setsTable.id, activeSet.id));
      } catch (e) {
        console.error('Failed to sync rally to Turso', e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const undoLastRally = async () => {
    if (rallies.length === 0) return;
    const lastRally = rallies[rallies.length - 1];
    
    // Optimistic update
    setRallies((prev) => prev.slice(0, -1));
    if (activeSet) {
      const updatedSet = {
        ...activeSet,
        ourScore: lastRally.scoreBeforeUs,
        opponentScore: lastRally.scoreBeforeOpponent,
      };
      setActiveSet(updatedSet);

      setIsSyncing(true);
      try {
        await db.delete(rallyEventsTable).where(eq(rallyEventsTable.id, lastRally.id));
        await db.update(setsTable)
          .set({ ourScore: updatedSet.ourScore, opponentScore: updatedSet.opponentScore })
          .where(eq(setsTable.id, activeSet.id));
      } catch (e) {
        console.error('Failed to sync undo to Turso', e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const addPlayer = async (player: Player) => {
    setPlayers((prev) => [...prev, player]);
    setIsSyncing(true);
    try {
      await db.insert(playersTable).values(player);
    } catch (e) {
      console.error('Failed to sync player to Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const removePlayer = async (playerId: string) => {
    setPlayers((prev) => prev.filter(p => p.id !== playerId));
    setIsSyncing(true);
    try {
      await db.delete(playersTable).where(eq(playersTable.id, playerId));
    } catch (e) {
      console.error('Failed to remove player from Turso', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <MatchContext.Provider value={{ 
      activeMatch, 
      activeSet, 
      activeTeam,
      rallies, 
      teams, 
      players,
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
      refreshData
    }}>
      {children}
    </MatchContext.Provider>
  );
};
