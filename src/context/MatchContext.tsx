import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Match, Set, RallyEvent, Team, Player } from '../types';
import { db } from '../db/client';
import { players as playersTable, matches as matchesTable, sets as setsTable, rallyEvents as rallyEventsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

interface MatchContextType {
  activeMatch: Match | null;
  activeSet: Set | null;
  rallies: RallyEvent[];
  teams: Team[];
  players: Player[];
  startMatch: (match: Match) => Promise<void>;
  startSet: (set: Set) => Promise<void>;
  addRally: (rally: RallyEvent) => Promise<void>;
  undoLastRally: () => Promise<void>;
  addPlayer: (player: Player) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMatch, setActiveMatch] = useState<Match | null>(() => {
    try {
      const saved = localStorage.getItem('activeMatch');
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeSet, setActiveSet] = useState<Set | null>(() => {
    try {
      const saved = localStorage.getItem('activeSet');
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [rallies, setRallies] = useState<RallyEvent[]>(() => {
    try {
      const saved = localStorage.getItem('rallies');
      return saved && saved !== "undefined" ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem('teams');
      return saved && saved !== "undefined" ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('players');
      return saved && saved !== "undefined" ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Initial load from DB
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    console.log('Refreshing data from Turso...');
    try {
      const dbPlayers = await db.select().from(playersTable);
      setPlayers(dbPlayers as Player[]);
      
      await db.select().from(matchesTable);
      setTeams([]); 
      
      if (activeMatch) {
        const currentRallies = await db.select()
          .from(rallyEventsTable)
          .where(eq(rallyEventsTable.matchId, activeMatch.id));
        setRallies(currentRallies as RallyEvent[]);
      }
      console.log('Data refresh complete.');
    } catch (e) {
      console.error('Failed to refresh data from Turso', e);
    }
  };

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
    try {
      await db.insert(matchesTable).values(match);
    } catch (e) {
      console.error('Failed to sync match to Turso', e);
    }
  };

  const startSet = async (set: Set) => {
    setActiveSet(set);
    try {
      await db.insert(setsTable).values(set);
    } catch (e) {
      console.error('Failed to sync set to Turso', e);
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
      
      try {
        await db.insert(rallyEventsTable).values(rally);
        await db.update(setsTable)
          .set({ ourScore: updatedSet.ourScore, opponentScore: updatedSet.opponentScore })
          .where(eq(setsTable.id, activeSet.id));
      } catch (e) {
        console.error('Failed to sync rally to Turso', e);
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

      try {
        await db.delete(rallyEventsTable).where(eq(rallyEventsTable.id, lastRally.id));
        await db.update(setsTable)
          .set({ ourScore: updatedSet.ourScore, opponentScore: updatedSet.opponentScore })
          .where(eq(setsTable.id, activeSet.id));
      } catch (e) {
        console.error('Failed to sync undo to Turso', e);
      }
    }
  };

  const addPlayer = async (player: Player) => {
    setPlayers((prev) => [...prev, player]);
    try {
      await db.insert(playersTable).values(player);
    } catch (e) {
      console.error('Failed to sync player to Turso', e);
    }
  };

  const removePlayer = async (playerId: string) => {
    setPlayers((prev) => prev.filter(p => p.id !== playerId));
    try {
      await db.delete(playersTable).where(eq(playersTable.id, playerId));
    } catch (e) {
      console.error('Failed to remove player from Turso', e);
    }
  };

  return (
    <MatchContext.Provider value={{ 
      activeMatch, 
      activeSet, 
      rallies, 
      teams, 
      players,
      startMatch,
      startSet,
      addRally,
      undoLastRally,
      addPlayer,
      removePlayer,
      refreshData
    }}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = () => {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  return context;
};
