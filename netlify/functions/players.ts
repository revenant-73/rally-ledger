import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client/web';
import type { Player } from '../../src/types';
import { requireSession } from './_session';
import { canManagePlayer, canManageTeam, canViewProgram, ensureTeamAccessTable } from './_access';

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

type AddPlayerPayload = {
  action: 'add';
  userId: string;
  email?: string;
  player: Player;
};

type ListPlayersPayload = {
  action: 'list';
  userId: string;
  email?: string;
  teamIds: string[];
};

type DeletePlayerPayload = {
  action: 'delete';
  userId: string;
  email?: string;
  playerId: string;
};

type UpdatePlayerPayload = {
  action: 'update';
  userId: string;
  email?: string;
  playerId: string;
  updates: Partial<Pick<Player, 'firstName' | 'lastName' | 'jerseyNumber' | 'position'>>;
};

type PlayerPayload = AddPlayerPayload | ListPlayersPayload | DeletePlayerPayload | UpdatePlayerPayload;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePayload = (body: string | null): PlayerPayload | null => {
  try {
    const payload = JSON.parse(body || '{}') as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.userId !== 'string') {
      return null;
    }
    return payload as PlayerPayload;
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

const handleList = async (payload: ListPlayersPayload) => {
  const { userId, teamIds } = payload;

  if (!Array.isArray(teamIds)) {
    return json(400, { error: 'Invalid player list payload' });
  }
  if (teamIds.length === 0) {
    return json(200, { players: [] });
  }
  const client = getClient();
  await ensureTeamAccessTable(client);
  if (!await canViewProgram(client, { userId, email: payload.email || '' })) {
    return json(200, { players: [] });
  }

  const placeholders = teamIds.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `select
      players.id,
      players.team_id as teamId,
      players.first_name as firstName,
      players.last_name as lastName,
      players.jersey_number as jerseyNumber,
      players.position,
      players.active,
      players.photo_url as photoUrl,
      players.created_at as createdAt,
      players.updated_at as updatedAt,
      players.metadata
    from players
    where players.team_id in (${placeholders})
    order by cast(players.jersey_number as integer), players.jersey_number`,
    args: teamIds,
  });

  return json(200, {
    players: result.rows.map((row) => ({
      ...row,
      active: Boolean(row.active),
      metadata: parseMetadata(row.metadata),
    })),
  });
};

const handleAdd = async (payload: AddPlayerPayload) => {
  const { player, userId } = payload;

  if (!player?.id || !player.teamId || !player.firstName || !player.lastName || !player.jerseyNumber || !player.position) {
    return json(400, { error: 'Invalid player payload' });
  }
  if (!await canManageTeam(getClient(), { userId, email: payload.email || '' }, player.teamId)) {
    return json(403, { error: 'Not authorized for this team' });
  }

  await getClient().execute({
    sql: `insert into players (
      id,
      team_id,
      first_name,
      last_name,
      jersey_number,
      position,
      active,
      photo_url,
      created_at,
      updated_at,
      metadata
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      player.id,
      player.teamId,
      player.firstName,
      player.lastName,
      player.jerseyNumber,
      player.position,
      player.active ? 1 : 0,
      player.photoUrl ?? null,
      player.createdAt,
      player.updatedAt,
      player.metadata ? JSON.stringify(player.metadata) : null,
    ],
  });

  return json(200, { player });
};

const handleDelete = async (payload: DeletePlayerPayload) => {
  const { playerId, userId } = payload;

  if (!playerId) {
    return json(400, { error: 'Invalid player delete payload' });
  }
  if (!await canManagePlayer(getClient(), { userId, email: payload.email || '' }, playerId)) {
    return json(403, { error: 'Not authorized for this player' });
  }

  await getClient().execute({
    sql: 'delete from players where id = ?',
    args: [playerId],
  });

  return json(200, { playerId });
};

const handleUpdate = async (payload: UpdatePlayerPayload) => {
  const { playerId, updates, userId } = payload;

  if (!playerId || !updates || typeof updates !== 'object') {
    return json(400, { error: 'Invalid player update payload' });
  }
  if (!await canManagePlayer(getClient(), { userId, email: payload.email || '' }, playerId)) {
    return json(403, { error: 'Not authorized for this player' });
  }

  const trimmedUpdates = {
    firstName: updates.firstName?.trim(),
    lastName: updates.lastName?.trim(),
    jerseyNumber: updates.jerseyNumber?.trim(),
    position: updates.position,
  };

  if (
    trimmedUpdates.firstName === '' ||
    trimmedUpdates.lastName === '' ||
    trimmedUpdates.jerseyNumber === '' ||
    trimmedUpdates.position === ''
  ) {
    return json(400, { error: 'Player name, number, and position are required' });
  }

  const columnMap = {
    firstName: 'first_name',
    lastName: 'last_name',
    jerseyNumber: 'jersey_number',
    position: 'position',
  } as const;
  const setClauses: string[] = [];
  const args: Array<string | number> = [];

  (Object.keys(columnMap) as Array<keyof typeof columnMap>).forEach((key) => {
    const value = trimmedUpdates[key];
    if (value !== undefined) {
      setClauses.push(`${columnMap[key]} = ?`);
      args.push(value);
    }
  });

  if (setClauses.length === 0) {
    return json(400, { error: 'No player updates provided' });
  }

  const updatedAt = new Date().toISOString();
  setClauses.push('updated_at = ?');
  args.push(updatedAt, playerId);

  await getClient().execute({
    sql: `update players set ${setClauses.join(', ')} where id = ?`,
    args,
  });

  return json(200, {
    playerId,
    updates: {
      ...trimmedUpdates,
      updatedAt,
    },
  });
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
    if (payload.action === 'delete') {
      return await handleDelete(payload);
    }
    if (payload.action === 'update') {
      return await handleUpdate(payload);
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('players function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
