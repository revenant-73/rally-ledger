import type { Classification, OutcomeType, RallyEvent } from '../types';

type DbRally = Omit<
  RallyEvent,
  | 'classification'
  | 'outcomeType'
  | 'pointWinner'
  | 'servingTeam'
  | 'metadata'
  | 'serverPlayerId'
  | 'playerId'
  | 'notes'
> & {
  classification: string;
  outcomeType: string;
  pointWinner: string;
  servingTeam: string;
  serverPlayerId?: string | null;
  playerId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const sortRallies = (rallies: RallyEvent[]) => {
  return [...rallies].sort((a, b) => {
    const rallyNumberDiff = a.rallyNumber - b.rallyNumber;
    if (rallyNumberDiff !== 0) return rallyNumberDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

export const normalizeRally = (rally: DbRally): RallyEvent => {
  const metadata = rally.metadata ?? undefined;

  return {
    ...rally,
    classification: rally.classification as Classification,
    outcomeType: rally.outcomeType as OutcomeType,
    pointWinner: rally.pointWinner as RallyEvent['pointWinner'],
    servingTeam: rally.servingTeam as RallyEvent['servingTeam'],
    serverPlayerId: rally.serverPlayerId ?? undefined,
    playerId: rally.playerId ?? undefined,
    notes: rally.notes ?? undefined,
    metadata,
    serveResult: rally.serveResult ?? (metadata?.serveResult as RallyEvent['serveResult']),
    receiveResult: rally.receiveResult ?? (metadata?.receiveResult as RallyEvent['receiveResult']),
    receivePlayerId: rally.receivePlayerId ?? (metadata?.receivePlayerId as RallyEvent['receivePlayerId']),
  };
};

export const normalizeRallies = (rallies: DbRally[]) => {
  return sortRallies(rallies.map(normalizeRally));
};
