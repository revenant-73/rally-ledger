import { describe, expect, it } from 'vitest';
import type { ReportStats, SeasonReportStats } from './reportStats';
import type { Match, RallyEvent, Team } from '../types';
import { buildMatchCsvFiles, buildMatchTextSummary, buildSeasonCsvFiles, buildSeasonTextSummary } from './reportExport';

const team: Team = {
  id: 't1',
  ownerId: 'u1',
  name: 'Century Varsity',
  level: 'High School',
  season: '2026',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const stats: SeasonReportStats = {
  matchesPlayed: 2,
  wins: 1,
  losses: 1,
  setsWon: 2,
  setsLost: 1,
  ralliesTracked: 12,
  ourEarned: 7,
  ourGifted: 4,
  opponentEarned: 5,
  opponentGifted: 3,
  biggestWeapon: 'Ace',
  biggestLeak: 'Serve Error',
  serve: {
    attempts: 8,
    aces: 2,
    errors: 1,
    inSystem: 3,
    outOfSystem: 2,
    servePct: 88,
    koPct: 50,
  },
  receive: {
    attempts: 4,
    errors: 1,
    overpass: 0,
    inSystem: 2,
    outOfSystem: 1,
    score: 2,
  },
  attack: {
    attempts: 5,
    kills: 4,
    errors: 1,
    net: 3,
    killPct: 80,
    errorPct: 20,
  },
  playerServing: [
    {
      playerId: 'p1',
      name: 'Avery Nguyen',
      jersey: '07',
      attempts: 8,
      aces: 2,
      errors: 1,
      inSystem: 3,
      outOfSystem: 2,
      ko: 4,
      servePct: 88,
      koPct: 50,
    },
  ],
  playerReceiving: [
    {
      playerId: 'p2',
      name: 'Mia Stone',
      jersey: '12',
      attempts: 4,
      errors: 1,
      overpass: 0,
      inSystem: 2,
      outOfSystem: 1,
      score: 2,
    },
  ],
  playerAttacking: [
    {
      playerId: 'p1',
      name: 'Avery Nguyen',
      jersey: '07',
      kills: 4,
      errors: 1,
      attempts: 5,
      net: 3,
      killPct: 80,
      errorPct: 20,
    },
  ],
  playerPoints: [
    {
      playerId: 'p1',
      name: 'Avery Nguyen',
      jersey: '07',
      earned: 6,
      gifted: 2,
      net: 4,
      total: 8,
    },
    {
      playerId: 'p2',
      name: 'Mia Stone',
      jersey: '12',
      earned: 1,
      gifted: 2,
      net: -1,
      total: 3,
    },
  ],
  giftContext: {
    total: 4,
    byType: [
      { label: 'Serve Error', count: 2, pct: 50 },
      { label: 'Attack Error', count: 1, pct: 25 },
      { label: 'Ball Handling Error', count: 1, pct: 25 },
    ],
    byServingState: [
      { label: 'While serving', count: 2, pct: 50, detail: 'We had serve' },
      { label: 'While receiving', count: 2, pct: 50, detail: 'Opponent had serve' },
    ],
    byScorePhase: [
      { label: 'Late set', count: 3, pct: 75, detail: '19-22' },
      { label: 'Middle set', count: 1, pct: 25, detail: '10-18' },
    ],
    byScoreState: [
      { label: 'Trailing', count: 3, pct: 75, detail: 'Behind by 1' },
      { label: 'Tied', count: 1, pct: 25, detail: 'Even score' },
    ],
    byRotation: [
      { label: 'Rotation 2', count: 3, pct: 75, detail: 'Current rotation when rally was entered' },
    ],
    rotationPoints: [
      { rotation: 2, label: 'Rotation 2', earned: 5, gifted: 3, net: 2, total: 8, earnedPct: 63, giftedPct: 38 },
    ],
    practiceCue: 'Recreate serve error / while serving / late set situations in practice.',
  },
  setReports: [],
  matchRows: [
    {
      matchId: 'm1',
      opponentName: 'Liberty',
      matchDate: '2026-08-20T00:00:00.000Z',
      result: 'Win',
      ralliesTracked: 8,
      earnedGifted: '+5/-2',
      servePct: 90,
      serveKoPct: 45,
      passScore: 2.3,
      kills: 4,
      attackErrors: 1,
      attackNet: 3,
    },
  ],
  focus: 'Maintain pressure.',
};

describe('report export', () => {
  const match: Match = {
    id: 'm1',
    teamId: 't1',
    opponentName: 'Liberty',
    matchDate: '2026-08-20T00:00:00.000Z',
    location: 'Home',
    matchType: 'League',
    status: 'completed',
    result: 'Win',
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  };

  it('includes opponent earned and gifted splits in match set exports', () => {
    const matchStats: ReportStats = {
      ...stats,
      setReports: [
        {
          setId: 's1',
          setNumber: 1,
          score: '25-20',
          result: 'Win',
          ourEarned: 8,
          ourGifted: 4,
          opponentEarned: 6,
          opponentGifted: 7,
          servePct: 88,
          serveKoPct: 50,
          passScore: 2.1,
        },
      ],
    };

    const summary = buildMatchTextSummary(match, matchStats);
    const files = buildMatchCsvFiles(match, matchStats, [], []);
    const giftCsv = files[4].contents;
    const setCsv = files[5].contents;

    expect(summary).toContain('Set 1: 25-20 Win (Us +8/-4, Opp +6/-7)');
    expect(summary).toContain('Team Gift Context');
    expect(summary).toContain('Serve Error: 2 (50%)');
    expect(summary).toContain('Rotation 2: +5/-3 (+2 net)');
    expect(giftCsv).toContain('Context,Label,Count,Percent,Detail,Earned,Gifted,Net,Total');
    expect(giftCsv).toContain('Error Type,Serve Error,2,50,,,,,');
    expect(giftCsv).toContain('Rotation Balance,Rotation 2,8,,Earned and gifted point outcomes by rotation,5,3,2,8');
    expect(setCsv).toContain('Set,Score,Result,Our Earned,Our Gifted,Opponent Earned,Opponent Gifted,Serve %,Serve KO %,Pass Score');
    expect(setCsv).toContain('1,25-20,Win,8,4,6,7,88,50,2.1');
  });

  it('includes inferred receivers in match rally log exports', () => {
    const rally: RallyEvent = {
      id: 'r1',
      matchId: 'm1',
      setId: 's1',
      rallyNumber: 1,
      scoreBeforeUs: 0,
      scoreBeforeOpponent: 0,
      scoreAfterUs: 0,
      scoreAfterOpponent: 1,
      pointWinner: 'Opponent',
      servingTeam: 'Opponent',
      outcomeType: 'Ace',
      classification: 'Earned',
      playerId: 'p2',
      createdAt: '2026-08-20T00:00:00.000Z',
    };

    const files = buildMatchCsvFiles(match, stats, [rally], [
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
    ]);
    const rallyLogCsv = files[6].contents;

    expect(rallyLogCsv).toContain('1,s1,0-0,0-1,Opponent,Opponent,,Ace,Earned,#12 Mia Stone,,#12 Mia Stone,Error,');
  });

  it('builds a season text summary coaches can paste elsewhere', () => {
    const summary = buildSeasonTextSummary(team, stats);

    expect(summary).toContain('Rally Ledger Season Report: Century Varsity (2026)');
    expect(summary).toContain('Record: 1-1');
    expect(summary).toContain('#07 Avery Nguyen: 50% KO, 88% in');
    expect(summary).toContain('#07 Avery Nguyen: 4 kills, 1 errors (+3)');
    expect(summary).toContain('#07 Avery Nguyen: 6 earned, 2 gifted (+4)');
    expect(summary).toContain('#12 Mia Stone: 2 gifted, 1 earned (-1)');
    expect(summary).toContain('Team Gift Context');
    expect(summary).toContain('Practice cue: Recreate serve error / while serving / late set situations in practice.');
    expect(summary).toContain('Rotation 2: +5/-3 (+2 net)');
    expect(summary).toContain('8/20/2026 vs Liberty: Win');
    expect(summary).toContain('4 kills/1 errors');
  });

  it('builds a season csv report bundle for coach review', () => {
    const files = buildSeasonCsvFiles(team, stats);

    expect(files.map(file => file.filename)).toEqual([
      'century-varsity-2026-season-summary.csv',
      'century-varsity-2026-season-match-trends.csv',
      'century-varsity-2026-season-player-totals.csv',
      'century-varsity-2026-season-gift-context.csv',
      'century-varsity-2026-season-point-leaders.csv',
      'century-varsity-2026-season-serving.csv',
      'century-varsity-2026-season-receiving.csv',
      'century-varsity-2026-season-kill-report.csv',
      'century-varsity-2026-season-opponent-breakdown.csv',
      'century-varsity-2026-season-practice-plan.csv',
    ]);
    expect(files[0].contents).toContain('Practice focus,Maintain pressure.');
    expect(files[1].contents).toContain('8/20/2026,Liberty,Win,8,+5/-2,90,45,2.3,4,1,3');
    expect(files[2].contents).toContain('07,Avery Nguyen,8,2,1,2,4,88,50,0,0,0,0,0,0,4,1,3,80,20,6,2,4');
    expect(files[3].contents).toContain('Error Type,Serve Error,2,50,,,,,');
    expect(files[3].contents).toContain('Rotation Balance,Rotation 2,8,,Earned and gifted point outcomes by rotation,5,3,2,8');
    expect(files[4].contents).toContain('07,Avery Nguyen,6,2,4,8');
    expect(files[5].contents).toContain('07,Avery Nguyen,8,2,1,3,2,4,88,50');
    expect(files[7].contents).toContain('07,Avery Nguyen,4,1,5,3,80,20');
    expect(files[8].contents).toContain('Liberty,1,1,0,8,5,2,90,45,2.3');
    expect(files[9].contents).toContain('Earned/Gifted');
  });
});
