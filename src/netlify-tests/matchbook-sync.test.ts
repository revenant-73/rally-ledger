import { createClient, type Client } from '@libsql/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFreshPrototypeDocument, PROTOTYPE_METADATA_KEY } from '../matchbook/prototypeCloudState';

const state = vi.hoisted(() => ({ client: null as Client | null, allowed: true }));
vi.mock('@libsql/client/web', () => ({ createClient: () => state.client }));
vi.mock('../../netlify/functions/_session', () => ({ requireSession: () => ({ session: { userId: 'coach', email: 'coach@example.com' } }) }));
vi.mock('../../netlify/functions/_access', () => ({
  canManageTeam: async () => state.allowed,
  canCreateTeam: vi.fn(), canViewProgram: vi.fn(), ensureTeamAccessTable: vi.fn(), isAdmin: vi.fn(),
}));

describe('atomic matchbook cloud saves', () => {
  beforeEach(async () => {
    vi.resetModules(); state.allowed = true;
    state.client = createClient({ url: 'file::memory:' });
    await state.client.execute('create table teams (id text primary key, metadata text, updated_at text)');
    await state.client.execute({ sql: 'insert into teams values (?, ?, ?)', args: ['team', JSON.stringify({ unrelated: 'keep' }), 'old'] });
  });
  afterEach(() => state.client?.close());

  const save = async (document: ReturnType<typeof createFreshPrototypeDocument>, expectedUpdatedAt: string | null) => {
    const { handler } = await import('../../netlify/functions/teams');
    return await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({
      action: 'save-matchbook', userId: 'coach', teamId: 'team', document, expectedUpdatedAt,
    }) } as never, {} as never, vi.fn()) as { statusCode: number };
  };

  it('saves pending sets, keeps unrelated metadata, and accepts exact retries', async () => {
    const document = createFreshPrototypeDocument();
    expect((await save(document, null)).statusCode).toBe(200);
    expect((await save(document, null)).statusCode).toBe(200);
    const result = await state.client!.execute('select metadata from teams');
    expect(JSON.parse(String(result.rows[0].metadata))).toEqual({ unrelated: 'keep', [PROTOTYPE_METADATA_KEY]: document });
  });
  it('rejects a stale device without overwriting the cloud and allows the next acknowledged save', async () => {
    const first = createFreshPrototypeDocument(new Date('2026-10-08T12:00:00Z'));
    const next = { ...first, updatedAt: '2026-10-08T12:01:00.000Z', revision: 1 };
    expect((await save(first, null)).statusCode).toBe(200);
    expect((await save(next, null)).statusCode).toBe(409);
    expect((await save(next, first.updatedAt)).statusCode).toBe(200);
  });
  it('requires team permission before writing', async () => {
    state.allowed = false;
    expect((await save(createFreshPrototypeDocument(), null)).statusCode).toBe(403);
    const result = await state.client!.execute('select metadata from teams');
    expect(JSON.parse(String(result.rows[0].metadata))).toEqual({ unrelated: 'keep' });
  });
});
