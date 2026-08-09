import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import type { Player } from '../../src/types';

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
  player: Player;
};

type DeletePlayerPayload = {
  action: 'delete';
  userId: string;
  playerId: string;
};

type PlayerPayload = AddPlayerPayload | DeletePlayerPayload;

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

const assertOwnsTeam = async (userId: string, teamId: string) => {
  const result = await getClient().execute({
    sql: 'select id from teams where id = ? and owner_id = ? limit 1',
    args: [teamId, userId],
  });

  return result.rows.length > 0;
};

const assertOwnsPlayer = async (userId: string, playerId: string) => {
  const result = await getClient().execute({
    sql: `select players.id
      from players
      inner join teams on teams.id = players.team_id
      where players.id = ? and teams.owner_id = ?
      limit 1`,
    args: [playerId, userId],
  });

  return result.rows.length > 0;
};

const handleAdd = async (payload: AddPlayerPayload) => {
  const { player, userId } = payload;

  if (!player?.id || !player.teamId || !player.firstName || !player.lastName || !player.jerseyNumber || !player.position) {
    return json(400, { error: 'Invalid player payload' });
  }
  if (!await assertOwnsTeam(userId, player.teamId)) {
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
  if (!await assertOwnsPlayer(userId, playerId)) {
    return json(403, { error: 'Not authorized for this player' });
  }

  await getClient().execute({
    sql: 'delete from players where id = ?',
    args: [playerId],
  });

  return json(200, { playerId });
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
    if (payload.action === 'add') {
      return await handleAdd(payload);
    }
    if (payload.action === 'delete') {
      return await handleDelete(payload);
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('players function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
