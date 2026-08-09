import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import type { Match } from '../../src/types';

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

type StartMatchPayload = {
  action: 'start';
  userId: string;
  match: Match;
};

type UpdateMatchPayload = {
  action: 'update';
  userId: string;
  matchId: string;
  updates: Partial<Match>;
};

type MatchPayload = StartMatchPayload | UpdateMatchPayload;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePayload = (body: string | null): MatchPayload | null => {
  try {
    const payload = JSON.parse(body || '{}') as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.userId !== 'string') {
      return null;
    }
    return payload as MatchPayload;
  } catch {
    return null;
  }
};

const assertOwnsTeam = async (userId: string, teamId: string) => {
  const result = await getClient().execute({
    sql: 'select id from teams where id = ? and owner_id = ? limit 1',
    args: [teamId, userId],
  });

  return result.rows.length > 0;
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

const handleStart = async (payload: StartMatchPayload) => {
  const { match, userId } = payload;

  if (!match?.id || !match.teamId || !match.opponentName) {
    return json(400, { error: 'Invalid match payload' });
  }
  if (!await assertOwnsTeam(userId, match.teamId)) {
    return json(403, { error: 'Not authorized for this team' });
  }

  await getClient().execute({
    sql: `insert into matches (
      id,
      team_id,
      opponent_name,
      match_date,
      location,
      match_type,
      status,
      result,
      notes,
      created_at,
      updated_at,
      metadata
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      match.id,
      match.teamId,
      match.opponentName,
      match.matchDate,
      match.location,
      match.matchType,
      match.status,
      match.result ?? null,
      match.notes ?? null,
      match.createdAt,
      match.updatedAt,
      match.metadata ? JSON.stringify(match.metadata) : null,
    ],
  });

  return json(200, { match });
};

const updateColumns = {
  opponentName: 'opponent_name',
  matchDate: 'match_date',
  location: 'location',
  matchType: 'match_type',
  status: 'status',
  result: 'result',
  notes: 'notes',
  metadata: 'metadata',
} as const satisfies Partial<Record<keyof Match, string>>;

const handleUpdate = async (payload: UpdateMatchPayload) => {
  const { matchId, updates, userId } = payload;

  if (!matchId || !isRecord(updates)) {
    return json(400, { error: 'Invalid match update payload' });
  }
  if (!await assertOwnsMatch(userId, matchId)) {
    return json(403, { error: 'Not authorized for this match' });
  }

  const sets: string[] = [];
  const args: Array<string | number | null> = [];

  for (const [key, column] of Object.entries(updateColumns)) {
    const value = updates[key as keyof Match];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    args.push(key === 'metadata' && value ? JSON.stringify(value) : value as string | number | null);
  }

  if (sets.length === 0) {
    return json(400, { error: 'No supported match updates provided' });
  }

  sets.push('updated_at = ?');
  args.push(new Date().toISOString(), matchId);

  await getClient().execute({
    sql: `update matches set ${sets.join(', ')} where id = ?`,
    args,
  });

  return json(200, { matchId, updates });
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
    console.error('matches function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
