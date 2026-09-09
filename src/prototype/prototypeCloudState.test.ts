import { describe, expect, it } from 'vitest';
import type { PrototypeMatchInput, PrototypePlayer } from './matchbookModel';
import {
  archiveMatchOnce,
  createFreshPrototypeDocument,
  sanitizePrototypeDocument,
  upsertSavedLineup,
} from './prototypeCloudState';

const roster: PrototypePlayer[] = Array.from({ length: 6 }, (_, index) => ({
  id: `player-${index + 1}`,
  number: String(index + 1),
  name: `Player ${index + 1}`,
  active: true,
}));
const slots = { 1: 'player-1', 2: 'player-2', 3: 'player-3', 4: 'player-4', 5: 'player-5', 6: 'player-6' } as const;

describe('prototype cloud state', () => {
  it('creates an empty production document and sanitizes known prototype demo records', () => {
    const fresh = createFreshPrototypeDocument(new Date('2026-09-09T10:00:00.000Z'));
    expect(fresh.roster).toEqual([]);
    expect(fresh.seasonMatches).toEqual([]);
    expect(fresh.setup.opponent).toBe('');

    const sanitized = sanitizePrototypeDocument({
      ...fresh,
      roster: [
        { id: 'p1', number: '1', name: 'Avery Nguyen', active: true },
        ...roster,
      ],
      currentLineup: slots,
      setup: { ...fresh.setup, lineup: slots },
      seasonMatches: [
        { id: 'prior-liberty', opponent: 'Demo', date: '2026-01-01', sets: [] },
        { id: 'real-match', opponent: 'West', date: '2026-09-08', sets: [] },
      ],
    });

    expect(sanitized.roster).toEqual(roster);
    expect(sanitized.seasonMatches.map((match) => match.id)).toEqual(['real-match']);
    expect(sanitized.currentLineup).toEqual(slots);
  });

  it('loads a complete saved lineup and updates the same case-insensitive name without duplication', () => {
    const first = upsertSavedLineup([], 'CHS Varsity', slots, new Date('2026-09-09T10:00:00.000Z'), {
      userId: 'creator-1', email: 'creator@example.com', linkedUserId: 'coach-1', linkedUserEmail: 'coach@example.com',
    });
    const updatedSlots = { ...slots, 1: 'player-2', 2: 'player-1' };
    const second = upsertSavedLineup(first, 'chs varsity', updatedSlots, new Date('2026-09-09T11:00:00.000Z'), {
      userId: 'admin-2', email: 'admin@example.com', linkedUserId: 'coach-2', linkedUserEmail: 'coach2@example.com',
    });

    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
    expect(second[0].createdAt).toBe(first[0].createdAt);
    expect(second[0].updatedAt).not.toBe(first[0].updatedAt);
    expect(second[0].slots).toEqual(updatedSlots);
    expect(second[0]).toMatchObject({
      createdByUserId: 'creator-1',
      createdByEmail: 'creator@example.com',
      linkedUserId: 'coach-2',
      linkedUserEmail: 'coach2@example.com',
    });
  });

  it('keeps legacy team lineups valid and clones saved slots', () => {
    const fresh = createFreshPrototypeDocument(new Date('2026-09-09T10:00:00.000Z'));
    const sanitized = sanitizePrototypeDocument({ ...fresh, roster, savedLineups: [{
      id: 'legacy-lineup', name: 'Legacy', slots, createdAt: fresh.updatedAt, updatedAt: fresh.updatedAt,
    }] });
    expect(sanitized.savedLineups[0].createdByEmail).toBeUndefined();
    sanitized.savedLineups[0].slots[1] = 'changed';
    expect(slots[1]).toBe('player-1');
  });

  it('archives a completed match exactly once', () => {
    const match: PrototypeMatchInput = { id: 'match-1', opponent: 'West', date: '2026-09-09', result: 'Win', sets: [] };
    const once = archiveMatchOnce([], match);
    const twice = archiveMatchOnce(once, { ...match, opponent: 'Changed' });

    expect(twice).toBe(once);
    expect(twice).toEqual([match]);
  });
});
