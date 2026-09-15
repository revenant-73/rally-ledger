import { describe, expect, it } from 'vitest';
import type { Match } from '../types';
import {
  buildMatchRecoveryFilename,
  buildMatchRecoveryPayload,
  serializeMatchRecoveryPayload,
} from './matchRecoveryExport';

const match: Match = {
  id: 'match-1',
  teamId: 'team-1',
  opponentName: 'Central / East',
  matchDate: '2026-09-14T19:00:00.000Z',
  location: 'Main Gym',
  matchType: 'Varsity',
  status: 'completed',
  result: 'Win',
  createdAt: '2026-09-14T18:00:00.000Z',
  updatedAt: '2026-09-14T20:00:00.000Z',
};

describe('match recovery export', () => {
  it('packages match data into a readable recovery JSON payload', () => {
    const payload = buildMatchRecoveryPayload({
      match,
      team: null,
      players: [],
      sets: [],
      rallies: [],
    });

    expect(payload.exportVersion).toBe(1);
    expect(payload.reason).toBe('match-completed-offline-or-pending-sync');
    expect(payload.match.id).toBe('match-1');
    expect(payload.instructions).toContain('Rally Ledger recovery export');
    expect(serializeMatchRecoveryPayload(payload)).toContain('"match-1"');
  });

  it('uses the match date and opponent in the recovery filename', () => {
    expect(buildMatchRecoveryFilename(match)).toBe('rally-ledger-recovery-2026-09-14-vs-central-east.json');
  });
});
