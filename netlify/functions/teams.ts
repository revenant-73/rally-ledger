import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import type { Team } from '../../src/types';
import { requireSession } from './_session';
import { canCreateTeam, canManageTeam, canViewProgram, ensureTeamAccessTable } from './_access';

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

type AddTeamPayload = {
  action: 'add';
  userId: string;
  email?: string;
  team: Team;
};

type ListTeamsPayload = {
  action: 'list';
  userId: string;
  email?: string;
};

type UpdateTeamPayload = {
  action: 'update';
  userId: string;
  email?: string;
  teamId: string;
  updates: Partial<Team>;
};

type TeamPayload = AddTeamPayload | ListTeamsPayload | UpdateTeamPayload;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePayload = (body: string | null): TeamPayload | null => {
  try {
    const payload = JSON.parse(body || '{}') as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.userId !== 'string') {
      return null;
    }
    return payload as TeamPayload;
  } catch {
    return null;
  }
};

const parseMetadata = (value: unknown) => {
  if (typeof value !== 'string') return value ?? undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const handleList = async (payload: ListTeamsPayload) => {
  const client = getClient();
  await ensureTeamAccessTable(client);

  if (!await canViewProgram(client, { userId: payload.userId, email: payload.email || '' })) {
    return json(200, { teams: [] });
  }

  const result = await client.execute({
    sql: `select
      id,
      owner_id as ownerId,
      name,
      level,
      season,
      created_at as createdAt,
      updated_at as updatedAt,
      metadata
    from teams
    order by name`,
    args: [],
  });

  return json(200, {
    teams: result.rows.map((row) => ({
      ...row,
      metadata: parseMetadata(row.metadata),
    })),
  });
};

const handleAdd = async (payload: AddTeamPayload) => {
  const { team, userId } = payload;

  if (!team?.id || !team.name || !team.level || !team.season) {
    return json(400, { error: 'Invalid team payload' });
  }
  if (!canCreateTeam({ userId, email: payload.email || '' })) {
    return json(403, { error: 'Only admins can create teams' });
  }

  await getClient().execute({
    sql: `insert into teams (
      id,
      owner_id,
      name,
      level,
      season,
      created_at,
      updated_at,
      metadata
    ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      team.id,
      userId,
      team.name,
      team.level,
      team.season,
      team.createdAt,
      team.updatedAt,
      team.metadata ? JSON.stringify(team.metadata) : null,
    ],
  });

  return json(200, { team: { ...team, ownerId: userId } });
};

const updateColumns = {
  name: 'name',
  level: 'level',
  season: 'season',
  metadata: 'metadata',
} as const satisfies Partial<Record<keyof Team, string>>;

const handleUpdate = async (payload: UpdateTeamPayload) => {
  const { teamId, updates, userId } = payload;

  if (!teamId || !isRecord(updates)) {
    return json(400, { error: 'Invalid team update payload' });
  }
  if (!await canManageTeam(getClient(), { userId, email: payload.email }, teamId)) {
    return json(403, { error: 'Not authorized for this team' });
  }

  const sets: string[] = [];
  const args: Array<string | number | null> = [];

  for (const [key, column] of Object.entries(updateColumns)) {
    const value = updates[key as keyof Team];
    if (value === undefined) continue;
    sets.push(`${column} = ?`);
    args.push(key === 'metadata' && value ? JSON.stringify(value) : value as string | number | null);
  }

  if (sets.length === 0) {
    return json(400, { error: 'No supported team updates provided' });
  }

  sets.push('updated_at = ?');
  args.push(new Date().toISOString(), teamId);

  await getClient().execute({
    sql: `update teams set ${sets.join(', ')} where id = ?`,
    args,
  });

  return json(200, { teamId, updates });
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const payload = parsePayload(event.body);
  if (!payload) {
    return json(400, { error: 'Invalid request body' });
  }
  const auth = requireSession(event, payload.userId);
  if ('response' in auth) {
    return auth.response;
  }
  payload.userId = auth.session.userId;
  payload.email = auth.session.email;

  try {
    if (payload.action === 'list') {
      return await handleList(payload);
    }
    if (payload.action === 'add') {
      return await handleAdd(payload);
    }
    if (payload.action === 'update') {
      return await handleUpdate(payload);
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('teams function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
