import { describe, expect, it } from 'vitest';
import type { SeasonReportStats } from './reportStats';
import type { Team } from '../types';
import { buildSeasonCsvFiles, buildSeasonTextSummary } from './reportExport';

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
    },
  ],
  focus: 'Maintain pressure.',
};

describe('report export', () => {
  it('builds a season text summary coaches can paste elsewhere', () => {
    const summary = buildSeasonTextSummary(team, stats);

    expect(summary).toContain('Rally Ledger Season Report: Century Varsity (2026)');
    expect(summary).toContain('Record: 1-1');
    expect(summary).toContain('#07 Avery Nguyen: 50% KO, 88% in');
    expect(summary).toContain('8/20/2026 vs Liberty: Win');
  });

  it('builds season csv files for summary, trends, serving, and receiving', () => {
    const files = buildSeasonCsvFiles(team, stats);

    expect(files.map(file => file.filename)).toEqual([
      'century-varsity-2026-season-summary.csv',
      'century-varsity-2026-season-match-trends.csv',
      'century-varsity-2026-season-serving.csv',
      'century-varsity-2026-season-receiving.csv',
    ]);
    expect(files[0].contents).toContain('Practice focus,Maintain pressure.');
    expect(files[1].contents).toContain('8/20/2026,Liberty,Win');
  });
});
