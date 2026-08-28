import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Player, RallyEvent, Set as MatchSet } from '../../types';
import { useDashboardMetrics } from './useDashboardMetrics';

const players: Player[] = [
  {
    id: 'p1',
    teamId: 't1',
    firstName: 'Avery',
    lastName: 'Nguyen',
    jerseyNumber: '07',
    position: 'OH',
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
];

const activeSet: MatchSet = {
  id: 's1',
  matchId: 'm1',
  setNumber: 1,
  ourScore: 1,
  opponentScore: 1,
  status: 'active',
  startingServerTeam: 'Us',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  metadata: { targetScore: 25 },
};

const rally = (overrides: Partial<RallyEvent>): RallyEvent => ({
  id: `r-${overrides.rallyNumber ?? 1}`,
  matchId: 'm1',
  setId: 's1',
  rallyNumber: overrides.rallyNumber ?? 1,
  scoreBeforeUs: 0,
  scoreBeforeOpponent: 0,
  scoreAfterUs: 1,
  scoreAfterOpponent: 0,
  pointWinner: 'Us',
  servingTeam: 'Us',
  outcomeType: 'Ace',
  classification: 'Earned',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('useDashboardMetrics', () => {
  it('uses first names for live player stat summaries', () => {
    const { result } = renderHook(() => useDashboardMetrics([
      rally({
        rallyNumber: 1,
        serverPlayerId: 'p1',
        playerId: 'p1',
        serveResult: 'Ace',
      }),
      rally({
        rallyNumber: 2,
        serverPlayerId: 'p1',
        playerId: 'p1',
        pointWinner: 'Opponent',
        classification: 'Gifted',
        outcomeType: 'Serve Error',
        serveResult: 'Error',
        scoreAfterUs: 1,
        scoreAfterOpponent: 1,
      }),
      rally({
        rallyNumber: 3,
        servingTeam: 'Opponent',
        receivePlayerId: 'p1',
        receiveResult: 'In-System',
        outcomeType: 'Kill',
      }),
    ], players, activeSet));

    expect(result.current?.topEarners[0]).toMatchObject({ jersey: '07', name: 'Avery' });
    expect(result.current?.topGifters[0]).toMatchObject({ jersey: '07', name: 'Avery' });
    expect(result.current?.servingByPlayer[0]).toMatchObject({ jersey: '07', name: 'Avery' });
    expect(result.current?.passingByPlayer[0]).toMatchObject({ jersey: '07', name: 'Avery' });
    expect(result.current?.serveMetrics.our.topMissers[0]).toMatchObject({ name: 'Avery' });
  });
});
