import { createContext } from 'react';
import type { Match, Set, RallyEvent, Team, Player } from '../types';

export interface MatchContextType {
  activeMatch: Match | null;
  activeSet: Set | null;
  activeTeam: Team | null;
  rallies: RallyEvent[];
  teams: Team[];
  players: Player[];
  isSyncing: boolean;
  startMatch: (match: Match) => Promise<void>;
  startSet: (set: Set) => Promise<void>;
  addRally: (rally: RallyEvent) => Promise<void>;
  undoLastRally: () => Promise<void>;
  addPlayer: (player: Player) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  addTeam: (team: Team) => Promise<void>;
  selectTeam: (teamId: string) => void;
  endSet: (result: 'Win' | 'Loss') => Promise<void>;
  updateSet: (setId: string, updates: Partial<Set>) => Promise<void>;
  updateMatch: (matchId: string, updates: Partial<Match>) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const MatchContext = createContext<MatchContextType | undefined>(undefined);
