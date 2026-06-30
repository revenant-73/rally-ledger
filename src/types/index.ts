export type PlayerPosition = 'OH' | 'OPP' | 'MB' | 'S' | 'L' | 'DS' | 'Other';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface Team {
  id: string;
  ownerId?: string;
  name: string;
  level: string;
  season: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string;
  position: PlayerPosition;
  active: boolean;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface Match {
  id: string;
  teamId: string;
  opponentName: string;
  matchDate: string;
  location: string;
  matchType: string;
  status: 'active' | 'completed';
  result?: 'Win' | 'Loss';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface Set {
  id: string;
  matchId: string;
  setNumber: number;
  ourScore: number;
  opponentScore: number;
  status: 'active' | 'completed';
  startingServerTeam: 'Us' | 'Opponent';
  finalResult?: 'Win' | 'Loss';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export type OutcomeType = 
  | 'Ace' 
  | 'Kill' 
  | 'Block' 
  | 'Forced Error' 
  | 'Serve Error' 
  | 'Attack Error' 
  | 'Ball Handling Error' 
  | 'Net / Line Violation' 
  | 'Free Ball Error' 
  | 'Other';

export type Classification = 'Earned' | 'Gifted' | 'Neutral';

export interface RallyEvent {
  id: string;
  matchId: string;
  setId: string;
  rallyNumber: number;
  scoreBeforeUs: number;
  scoreBeforeOpponent: number;
  scoreAfterUs: number;
  scoreAfterOpponent: number;
  pointWinner: 'Us' | 'Opponent';
  servingTeam: 'Us' | 'Opponent';
  serverPlayerId?: string;
  outcomeType: OutcomeType;
  classification: Classification;
  playerId?: string;
  serveResult?: 'Ace' | 'Error' | 'In-System' | 'Out-of-System';
  receiveResult?: 'Error' | 'Overpass' | 'In-System' | 'Out-of-System';
  receivePlayerId?: string;
  notes?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MatchSummary {
  id: string;
  matchId: string;
  totalOurEarned: number;
  totalOurGifted: number;
  totalOpponentEarned: number;
  totalOpponentGifted: number;
  ourEarnedGiftedRatio: number;
  opponentEarnedGiftedRatio: number;
  biggestWeapon: string;
  biggestLeak: string;
  suggestedFocus: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
