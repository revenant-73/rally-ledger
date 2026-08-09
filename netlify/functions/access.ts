import type { Handler } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import { createClient, type Client } from '@libsql/client/web';
import type { Team } from '../../src/types';
import { requireSession } from './_session';
import { ensureTeamAccessTable, isAdmin } from './_access';

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

type AccessRole = 'coach';

type ListPayload = {
  action: 'list';
  userId: string;
  email?: string;
};

type GrantPayload = {
  action: 'grant';
  userId: string;
  email?: string;
  coachEmail: string;
  teamId: string;
  role?: AccessRole;
};

type RevokePayload = {
  action: 'revoke';
  userId: string;
  email?: string;
  accessId: string;
};

type AccessPayload = ListPayload | GrantPayload | RevokePayload;

type AccessAssignment = {
  id: string;
  teamId: string;
  teamName: string;
  teamLevel: string;
  teamSeason: string;
  userId: string;
  email: string;
  name?: string | null;
  role: AccessRole;
  createdAt: string;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePayload = (body: string | null): AccessPayload | null => {
  try {
    const payload = JSON.parse(body || '{}') as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.userId !== 'string') {
      return null;
    }
    return payload as AccessPayload;
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

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const requireAdmin = (payload: AccessPayload) => {
  return isAdmin({ userId: payload.userId, email: payload.email || '' });
};

const getTeams = async (client: Client): Promise<Team[]> => {
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

  return result.rows.map((row) => ({
    ...row,
    metadata: parseMetadata(row.metadata),
  })) as Team[];
};

const getAssignments = async (client: Client): Promise<AccessAssignment[]> => {
  const result = await client.execute({
    sql: `select
      team_access.id,
      team_access.team_id as teamId,
      teams.name as teamName,
      teams.level as teamLevel,
      teams.season as teamSeason,
      team_access.user_id as userId,
      users.email,
      users.name,
      team_access.role,
      team_access.created_at as createdAt,
      team_access.updated_at as updatedAt
    from team_access
    inner join teams on teams.id = team_access.team_id
    inner join users on users.id = team_access.user_id
    order by teams.name, users.email`,
    args: [],
  });

  return result.rows as unknown as AccessAssignment[];
};

const handleList = async (payload: ListPayload) => {
  if (!requireAdmin(payload)) {
    return json(403, { error: 'Admins only' });
  }

  const client = getClient();
  await ensureTeamAccessTable(client);
  const [teams, assignments] = await Promise.all([
    getTeams(client),
    getAssignments(client),
  ]);

  return json(200, { isAdmin: true, teams, assignments });
};

const handleGrant = async (payload: GrantPayload) => {
  if (!requireAdmin(payload)) {
    return json(403, { error: 'Admins only' });
  }

  const coachEmail = normalizeEmail(payload.coachEmail || '');
  if (!isValidEmail(coachEmail) || !payload.teamId) {
    return json(400, { error: 'Coach email and roster are required' });
  }

  const client = getClient();
  await ensureTeamAccessTable(client);

  const team = await client.execute({
    sql: 'select id from teams where id = ? limit 1',
    args: [payload.teamId],
  });
  if (team.rows.length === 0) {
    return json(404, { error: 'Roster not found' });
  }

  const now = new Date().toISOString();
  const existingUser = await client.execute({
    sql: 'select id from users where email = ? limit 1',
    args: [coachEmail],
  });

  let coachUserId = existingUser.rows[0]?.id as string | undefined;
  if (!coachUserId) {
    coachUserId = randomUUID();
    await client.execute({
      sql: `insert into users (
        id,
        email,
        name,
        password_hash,
        created_at,
        updated_at,
        metadata
      ) values (?, ?, ?, ?, ?, ?, ?)`,
      args: [coachUserId, coachEmail, null, null, now, now, null],
    });
  }

  const existingAccess = await client.execute({
    sql: 'select id from team_access where team_id = ? and user_id = ? limit 1',
    args: [payload.teamId, coachUserId],
  });

  if (existingAccess.rows.length > 0) {
    await client.execute({
      sql: 'update team_access set role = ?, updated_at = ? where id = ?',
      args: ['coach', now, existingAccess.rows[0].id as string],
    });
  } else {
    await client.execute({
      sql: `insert into team_access (
        id,
        team_id,
        user_id,
        role,
        created_at,
        updated_at,
        metadata
      ) values (?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), payload.teamId, coachUserId, 'coach', now, now, null],
    });
  }

  return handleList({ action: 'list', userId: payload.userId, email: payload.email });
};

const handleRevoke = async (payload: RevokePayload) => {
  if (!requireAdmin(payload)) {
    return json(403, { error: 'Admins only' });
  }
  if (!payload.accessId) {
    return json(400, { error: 'Access assignment is required' });
  }

  const client = getClient();
  await ensureTeamAccessTable(client);
  await client.execute({
    sql: 'delete from team_access where id = ?',
    args: [payload.accessId],
  });

  return handleList({ action: 'list', userId: payload.userId, email: payload.email });
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
    if (payload.action === 'grant') {
      return await handleGrant(payload);
    }
    if (payload.action === 'revoke') {
      return await handleRevoke(payload);
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('access function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
