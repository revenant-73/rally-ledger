import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import type { Set } from '../../src/types';

let cachedClient: Client | null = null;

const getClient = () => {
  if (!cachedClient) {
    cachedClient = createClient({
      url: process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL || '',
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN || '',
    });
  }
  return cachedClient;
};

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

type StartSetPayload = {
  action: 'start';
  userId: string;
  set: Set;
};

type UpdateSetPayload = {
  action: 'update';
  userId: string;
  setId: string;
  matchId: string;
  updates: Partial<Set>;
};

type SetPayload = StartSetPayload | UpdateSetPayload;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePayload = (body: string | null): SetPayload | null => {
  try {
    const payload = JSON.parse(body || '{}') as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.userId !== 'string') {
      return null;
    }
    return payload as SetPayload;
  } catch {
    return null;
  }
};

const assertOwnsMatch = async (userId: string, matchId: string) => {
  const result = await getClient().execute({
    sql: `select matches.id
      from matches
      inner join teams on teams.id = matches.team_id
      where matches.id = ? and teams.owner_id = ?
      limit 1`,
    args: [matchId, userId],
  });

  return result.rows.length > 0;
};

const assertSetBelongsToMatch = async (setId: string, matchId: string) => {
  const result = await getClient().execute({
    sql: 'select id from sets where id = ? and match_id = ? limit 1',
    args: [setId, matchId],
  });

  return result.rows.length > 0;
};

const handleStart = async (payload: StartSetPayload) => {
  const { set, userId } = payload;

  if (!set?.id || !set.matchId || !set.setNumber) {
    return json(400, { error: 'Invalid set payload' });
  }
  if (!await assertOwnsMatch(userId, set.matchId)) {
    return json(403, { error: 'Not authorized for this match' });
  }

  await getClient().execute({
    sql: `insert into sets (
      id,
      match_id,
      set_number,
      our_score,
      opponent_score,
      status,
      starting_server_team,
      final_result,
      created_at,
      updated_at,
      metadata
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      set.id,
      set.matchId,
      set.setNumber,
      set.ourScore,
      set.opponentScore,
      set.status,
      set.startingServerTeam,
      set.finalResult ?? null,
      set.createdAt,
      set.updatedAt,
      set.metadata ? JSON.stringify(set.metadata) : null,
    ],
  });

  return json(200, { set });
};

const updateColumns = {
  setNumber: 'set_number',
  ourScore: 'our_score',
  opponentScore: 'opponent_score',
  status: 'status',
  startingServerTeam: 'starting_server_team',
  finalResult: 'final_result',
  metadata: 'metadata',
} as const satisfies Partial<Record<keyof Set, string>>;

const handleUpdate = async (payload: UpdateSetPayload) => {
  const { setId, matchId, updates, userId } = payload;

  if (!setId || !matchId || !isRecord(updates)) {
    return json(400, { error: 'Invalid set update payload' });
  }
  if (!await assertOwnsMatch(userId, matchId) || !await assertSetBelongsToMatch(setId, matchId)) {
    return json(403, { error: 'Not authorized for this match' });
  }

  const sets: string[] = [];
  const args: Array<string | number | null> = [];

  for (const [key, column] of Object.entries(updateColumns)) {
    const value = updates[key as keyof Set];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    args.push(key === 'metadata' && value ? JSON.stringify(value) : value as string | number | null);
  }

  if (sets.length === 0) {
    return json(400, { error: 'No supported set updates provided' });
  }

  sets.push('updated_at = ?');
  args.push(new Date().toISOString(), setId);

  await getClient().execute({
    sql: `update sets set ${sets.join(', ')} where id = ?`,
    args,
  });

  return json(200, { setId, matchId, updates });
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const payload = parsePayload(event.body);
  if (!payload) {
    return json(400, { error: 'Invalid request body' });
  }

  try {
    if (payload.action === 'start') {
      return await handleStart(payload);
    }
    if (payload.action === 'update') {
      return await handleUpdate(payload);
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('sets function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
