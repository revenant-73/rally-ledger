import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Player, RallyEvent } from '../types';
import { useMatchDetailMetrics } from './useMatchDetailMetrics';

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
  servingTeam: 'Opponent',
  outcomeType: 'Kill',
  classification: 'Earned',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('useMatchDetailMetrics', () => {
  it('counts serve receive only on opponent serves', () => {
    const { result } = renderHook(() => useMatchDetailMetrics([
      rally({
        rallyNumber: 1,
        servingTeam: 'Opponent',
        receivePlayerId: 'p1',
        receiveResult: 'In-System',
      }),
      rally({
        rallyNumber: 2,
        servingTeam: 'Us',
        receivePlayerId: 'p1',
        receiveResult: 'Error',
        outcomeType: 'Serve Error',
        pointWinner: 'Opponent',
        classification: 'Gifted',
      }),
    ], players));

    expect(result.current?.receiveStats).toMatchObject({
      total: 1,
      inSystem: 1,
      errors: 0,
    });
    expect(result.current?.playerReceiveStats.p1).toMatchObject({
      total: 1,
      inSystem: 1,
      errors: 0,
    });
  });
});
