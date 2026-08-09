import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import type { RallyEvent, Set } from '../../src/types';

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

type AddRallyPayload = {
  action: 'add';
  userId: string;
  rally: RallyEvent;
  updatedSet: {
    id: string;
    ourScore: number;
    opponentScore: number;
    metadata?: Set['metadata'];
  };
};

type UndoRallyPayload = {
  action: 'undo';
  userId: string;
  rallyId: string;
  matchId: string;
  setId: string;
  restoredScores: {
    ourScore: number;
    opponentScore: number;
  };
  restoredMetadata?: Set['metadata'];
};

type RallyPayload = AddRallyPayload | UndoRallyPayload;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePayload = (body: string | null): RallyPayload | null => {
  try {
    const payload = JSON.parse(body || '{}') as unknown;
    if (!isRecord(payload) || typeof payload.action !== 'string' || typeof payload.userId !== 'string') {
      return null;
    }
    return payload as RallyPayload;
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

const handleAdd = async (payload: AddRallyPayload) => {
  const { rally, updatedSet, userId } = payload;

  if (!rally?.id || !rally.matchId || !rally.setId || updatedSet.id !== rally.setId) {
    return json(400, { error: 'Invalid rally payload' });
  }
  if (!await assertOwnsMatch(userId, rally.matchId) || !await assertSetBelongsToMatch(rally.setId, rally.matchId)) {
    return json(403, { error: 'Not authorized for this match' });
  }

  await getClient().batch([
    {
      sql: `insert into rally_events (
        id,
        match_id,
        set_id,
        rally_number,
        score_before_us,
        score_before_opponent,
        score_after_us,
        score_after_opponent,
        point_winner,
        serving_team,
        server_player_id,
        outcome_type,
        classification,
        player_id,
        notes,
        created_at,
        metadata
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        rally.id,
        rally.matchId,
        rally.setId,
        rally.rallyNumber,
        rally.scoreBeforeUs,
        rally.scoreBeforeOpponent,
        rally.scoreAfterUs,
        rally.scoreAfterOpponent,
        rally.pointWinner,
        rally.servingTeam,
        rally.serverPlayerId ?? null,
        rally.outcomeType,
        rally.classification,
        rally.playerId ?? null,
        rally.notes ?? null,
        rally.createdAt,
        rally.metadata ? JSON.stringify(rally.metadata) : null,
      ],
    },
    {
      sql: `update sets
        set our_score = ?,
          opponent_score = ?,
          metadata = coalesce(?, metadata),
          updated_at = ?
        where id = ?`,
      args: [
        updatedSet.ourScore,
        updatedSet.opponentScore,
        updatedSet.metadata ? JSON.stringify(updatedSet.metadata) : null,
        new Date().toISOString(),
        updatedSet.id,
      ],
    },
  ], 'write');

  return json(200, { rally, updatedSet });
};

const handleUndo = async (payload: UndoRallyPayload) => {
  const { rallyId, matchId, setId, restoredScores, restoredMetadata, userId } = payload;

  if (!rallyId || !matchId || !setId || !restoredScores) {
    return json(400, { error: 'Invalid undo payload' });
  }
  if (!await assertOwnsMatch(userId, matchId) || !await assertSetBelongsToMatch(setId, matchId)) {
    return json(403, { error: 'Not authorized for this match' });
  }

  await getClient().batch([
    {
      sql: 'delete from rally_events where id = ? and match_id = ? and set_id = ?',
      args: [rallyId, matchId, setId],
    },
    {
      sql: `update sets
        set our_score = ?,
          opponent_score = ?,
          metadata = coalesce(?, metadata),
          updated_at = ?
        where id = ?`,
      args: [
        restoredScores.ourScore,
        restoredScores.opponentScore,
        restoredMetadata ? JSON.stringify(restoredMetadata) : null,
        new Date().toISOString(),
        setId,
      ],
    },
  ], 'write');

  return json(200, { matchId });
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
    if (payload.action === 'undo') {
      return await handleUndo(payload);
    }
    return json(400, { error: 'Unknown action' });
  } catch (error) {
    console.error('rallies function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
