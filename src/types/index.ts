export type PlayerPosition = 'OH' | 'OPP' | 'MB' | 'S' | 'L' | 'DS' | 'Other';

export interface Team {
  id: string;
  name: string;
  level: string;
  season: string;
  createdAt: string;
  updatedAt: string;
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
}

export interface Match {
  id: string;
  teamId: string;
  opponentName: string;
  matchDate: string;
  location: string;
  matchType: string;
  result?: 'Win' | 'Loss';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Set {
  id: string;
  matchId: string;
  setNumber: number;
  ourScore: number;
  opponentScore: number;
  startingServerTeam: 'Us' | 'Opponent';
  finalResult?: 'Win' | 'Loss';
  createdAt: string;
  updatedAt: string;
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
  rotationNumber?: number;
  outcomeType: OutcomeType;
  classification: Classification;
  playerId?: string;
  notes?: string;
  createdAt: string;
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
}
