import { describe, expect, it } from 'vitest';
import { canViewMatch, filterViewableTeamIds } from '../../netlify/functions/_access';

type FakeResult = { rows: Array<Record<string, unknown>> };

describe('data access isolation', () => {
  it('filters requested team ids to teams owned by or assigned to the session user', async () => {
    const client = {
      execute: async (statement: string | { sql: string; args?: unknown[] }): Promise<FakeResult> => {
        const args = typeof statement === 'string' ? [] : statement.args ?? [];
        const teamId = String(args[1] ?? '');
        return { rows: teamId === 'team-allowed' ? [{ id: teamId }] : [] };
      },
    };
    const result = await filterViewableTeamIds(client as never, { userId: 'coach-1', email: 'coach@example.com' }, ['team-allowed', 'team-private']);
    expect(result).toEqual(['team-allowed']);
  });

  it('does not allow program membership to reveal an unrelated match', async () => {
    const client = { execute: async (): Promise<FakeResult> => ({ rows: [] }) };
    expect(await canViewMatch(client as never, { userId: 'coach-1', email: 'coach@example.com' }, 'private-match')).toBe(false);
  });
});
