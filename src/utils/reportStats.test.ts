import { describe, expect, it } from 'vitest';
import type { Match, Player, RallyEvent, Set as MatchSet } from '../types';
import { calculateReportStats, calculateSeasonReportStats } from './reportStats';

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
  {
    id: 'p2',
    teamId: 't1',
    firstName: 'Mia',
    lastName: 'Stone',
    jerseyNumber: '12',
    position: 'L',
    active: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
];

const sets: MatchSet[] = [
  {
    id: 's1',
    matchId: 'm1',
    setNumber: 1,
    ourScore: 25,
    opponentScore: 20,
    status: 'completed',
    startingServerTeam: 'Us',
    finalResult: 'Win',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 's2',
    matchId: 'm2',
    setNumber: 1,
    ourScore: 21,
    opponentScore: 25,
    status: 'completed',
    startingServerTeam: 'Opponent',
    finalResult: 'Loss',
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  },
];

const rally = (overrides: Partial<RallyEvent>): RallyEvent => ({
  id: `r-${overrides.matchId}-${overrides.rallyNumber}`,
  matchId: overrides.matchId ?? 'm1',
  setId: overrides.setId ?? 's1',
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

describe('report stats', () => {
  it('calculates match serve, receive, player, and set summaries', () => {
    const stats = calculateReportStats([
      rally({ rallyNumber: 1, serverPlayerId: 'p1', serveResult: 'Ace' }),
      rally({ rallyNumber: 2, serverPlayerId: 'p1', serveResult: 'Error', pointWinner: 'Opponent', outcomeType: 'Serve Error', classification: 'Gifted' }),
      rally({ rallyNumber: 3, servingTeam: 'Opponent', receivePlayerId: 'p2', receiveResult: 'In-System', outcomeType: 'Kill' }),
      rally({ rallyNumber: 4, servingTeam: 'Opponent', receivePlayerId: 'p2', receiveResult: 'Out-of-System', pointWinner: 'Opponent', outcomeType: 'Attack Error', classification: 'Gifted' }),
    ], players, [sets[0]]);

    expect(stats.ourEarned).toBe(2);
    expect(stats.ourGifted).toBe(2);
    expect(stats.biggestWeapon).toBe('Ace');
    expect(stats.biggestLeak).toBe('Serve Error');
    expect(stats.serve).toMatchObject({ attempts: 2, aces: 1, errors: 1, servePct: 50, koPct: 50 });
    expect(stats.receive).toMatchObject({ attempts: 2, inSystem: 1, outOfSystem: 1, score: 2.5 });
    expect(stats.playerServing[0]).toMatchObject({ jersey: '07', attempts: 2, servePct: 50, koPct: 50 });
    expect(stats.playerReceiving[0]).toMatchObject({ jersey: '12', attempts: 2, score: 2.5 });
    expect(stats.setReports[0]).toMatchObject({ setNumber: 1, score: '25-20', servePct: 50, passScore: 2.5 });
  });

  it('infers serve attempts from ace and serve error outcomes when serveResult is missing', () => {
    const stats = calculateReportStats([
      rally({ rallyNumber: 1, serverPlayerId: 'p1', outcomeType: 'Ace', pointWinner: 'Us', classification: 'Earned' }),
      rally({ rallyNumber: 2, serverPlayerId: 'p1', outcomeType: 'Serve Error', pointWinner: 'Opponent', classification: 'Gifted' }),
      rally({ rallyNumber: 3, serverPlayerId: 'p1', outcomeType: 'Serve Error', pointWinner: 'Opponent', classification: 'Gifted' }),
    ], players, [sets[0]]);

    expect(stats.serve).toMatchObject({ attempts: 3, aces: 1, errors: 2, servePct: 33, koPct: 33 });
    expect(stats.playerServing[0]).toMatchObject({ jersey: '07', attempts: 3, errors: 2, servePct: 33 });
    expect(stats.setReports[0]).toMatchObject({ servePct: 33, serveKoPct: 33 });
  });

  it('rolls multiple matches into season report rows', () => {
    const matches: Match[] = [
      {
        id: 'm1',
        teamId: 't1',
        opponentName: 'Liberty',
        matchDate: '2026-08-01T00:00:00.000Z',
        location: 'Home',
        matchType: 'League',
        status: 'completed',
        result: 'Win',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'm2',
        teamId: 't1',
        opponentName: 'Central',
        matchDate: '2026-08-02T00:00:00.000Z',
        location: 'Away',
        matchType: 'League',
        status: 'completed',
        result: 'Loss',
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ];

    const stats = calculateSeasonReportStats(matches, sets, [
      rally({ matchId: 'm1', setId: 's1', rallyNumber: 1, serverPlayerId: 'p1', serveResult: 'Ace' }),
      rally({ matchId: 'm2', setId: 's2', rallyNumber: 1, servingTeam: 'Opponent', receivePlayerId: 'p2', receiveResult: 'Error', pointWinner: 'Opponent', outcomeType: 'Ace', classification: 'Earned' }),
    ], players);

    expect(stats.matchesPlayed).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.setsWon).toBe(1);
    expect(stats.setsLost).toBe(1);
    expect(stats.matchRows).toHaveLength(2);
    expect(stats.matchRows[0]).toMatchObject({ opponentName: 'Liberty', servePct: 100, serveKoPct: 100 });
    expect(stats.matchRows[1]).toMatchObject({ opponentName: 'Central', passScore: 0 });
  });
});
