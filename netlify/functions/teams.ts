import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client/web';
import type { Team } from '../../src/types';
import { requireSession } from './_session';
import { canCreateTeam, canManageTeam, canViewProgram, ensureTeamAccessTable, isAdmin } from './_access';
import { PROTOTYPE_METADATA_KEY, type PrototypeCloudDocument } from '../../src/matchbook/prototypeCloudState';

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

type DeleteTeamPayload = {
  action: 'delete';
  userId: string;
  email?: string;
  teamId: string;
};

type SaveMatchbookPayload = {
  action: 'save-matchbook';
  userId: string;
  email?: string;
  teamId: string;
  document: PrototypeCloudDocument;
  expectedUpdatedAt: string | null;
};

type TeamPayload = AddTeamPayload | ListTeamsPayload | UpdateTeamPayload | DeleteTeamPayload | SaveMatchbookPayload;

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

  const admin = isAdmin({ userId: payload.userId, email: payload.email || '' });
  const result = await client.execute({
    sql: `select distinct
      teams.id,
      teams.owner_id as ownerId,
      teams.name,
      teams.level,
      teams.season,
      teams.created_at as createdAt,
      teams.updated_at as updatedAt,
      teams.metadata
    from teams
    ${admin ? '' : `left join team_access on team_access.team_id = teams.id and team_access.user_id = ?
    where teams.owner_id = ? or team_access.role = 'coach'`}
    order by teams.name`,
    args: admin ? [] : [payload.userId, payload.userId],
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
  if (!await canCreateTeam(getClient(), { userId, email: payload.email || '' })) {
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
  if (!await canManageTeam(getClient(), { userId, email: payload.email || '' }, teamId)) {
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

const handleDelete = async (payload: DeleteTeamPayload) => {
  const { teamId, userId } = payload;

  if (!teamId) {
    return json(400, { error: 'Invalid roster delete payload' });
  }
  if (!isAdmin({ userId, email: payload.email || '' })) {
    return json(403, { error: 'Only admins can delete rosters' });
  }

  const client = getClient();
  const existing = await client.execute({
    sql: 'select id from teams where id = ? limit 1',
    args: [teamId],
  });
  if (existing.rows.length === 0) {
    return json(404, { error: 'Roster not found' });
  }

  await ensureTeamAccessTable(client);
  await client.batch([
    {
      sql: `delete from rally_events
        where match_id in (select id from matches where team_id = ?)`,
      args: [teamId],
    },
    {
      sql: `delete from sets
        where match_id in (select id from matches where team_id = ?)`,
      args: [teamId],
    },
    {
      sql: 'delete from matches where team_id = ?',
      args: [teamId],
    },
    {
      sql: 'delete from players where team_id = ?',
      args: [teamId],
    },
    {
      sql: 'delete from team_access where team_id = ?',
      args: [teamId],
    },
    {
      sql: 'delete from teams where id = ?',
      args: [teamId],
    },
  ], 'write');

  return json(200, { teamId });
};

const handleSaveMatchbook = async (payload: SaveMatchbookPayload) => {
  const { teamId, document, expectedUpdatedAt } = payload;
  if (!teamId || !isRecord(document) || document.version !== 1 ||
    typeof document.updatedAt !== 'string' || !Number.isFinite(Date.parse(document.updatedAt)) ||
    typeof document.currentMatchId !== 'string' || !Array.isArray(document.rallies) ||
    !Array.isArray(document.completedSets) || !Array.isArray(document.seasonMatches) ||
    !(expectedUpdatedAt === null || typeof expectedUpdatedAt === 'string')) {
    return json(400, { error: 'Invalid matchbook snapshot' });
  }
  const client = getClient();
  if (!await canManageTeam(client, { userId: payload.userId, email: payload.email || '' }, teamId)) {
    return json(403, { error: 'Not authorized for this team' });
  }
  const path = `$.${PROTOTYPE_METADATA_KEY}`;
  const contents = JSON.stringify(document);
  // Compare and update atomically, preserving all unrelated team metadata.
  // Exact snapshot retries are safe when a save succeeded but its response was lost.
  const result = await client.execute({
    sql: `update teams set metadata = json_set(coalesce(metadata, '{}'), ?, json(?)), updated_at = ?
      where id = ? and (json_extract(metadata, ?) is ? or json_extract(metadata, ?) = json(?))`,
    args: [path, contents, new Date().toISOString(), teamId, `${path}.updatedAt`, expectedUpdatedAt, path, contents],
  });
  if (result.rowsAffected === 0) {
    return json(409, { error: 'The cloud copy changed on another device. Your local copy has been kept.' });
  }
  return json(200, { saved: true, updatedAt: document.updatedAt });
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
  if (!auth.session) {
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
    if (payload.action === 'save-matchbook') {
      return await handleSaveMatchbook(payload);
    }
    if (payload.action === 'delete') {
      return await handleDelete(payload);
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('teams function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
