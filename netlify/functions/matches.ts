import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import type { Match } from '../../src/types';
import { requireSession } from './_session';
import { canManageMatch, canManageTeam, canViewMatch, canViewProgram, ensureTeamAccessTable } from './_access';

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
  email?: string;
  match: Match;
};

type ListMatchesPayload = {
  action: 'list';
  userId: string;
  email?: string;
  teamIds: string[];
};

type DetailMatchPayload = {
  action: 'detail';
  userId: string;
  email?: string;
  matchId: string;
};

type UpdateMatchPayload = {
  action: 'update';
  userId: string;
  email?: string;
  matchId: string;
  updates: Partial<Match>;
};

type MatchPayload = StartMatchPayload | ListMatchesPayload | DetailMatchPayload | UpdateMatchPayload;

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

const parseMetadata = (value: unknown) => {
  if (typeof value !== 'string') return value ?? undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const handleList = async (payload: ListMatchesPayload) => {
  const { userId, teamIds } = payload;

  if (!Array.isArray(teamIds)) {
    return json(400, { error: 'Invalid match list payload' });
  }
  if (teamIds.length === 0) {
    return json(200, { matches: [] });
  }
  const client = getClient();
  await ensureTeamAccessTable(client);
  if (!await canViewProgram(client, { userId, email: payload.email || '' })) {
    return json(200, { matches: [] });
  }

  const placeholders = teamIds.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `select
      matches.id,
      matches.team_id as teamId,
      matches.opponent_name as opponentName,
      matches.match_date as matchDate,
      matches.location,
      matches.match_type as matchType,
      matches.status,
      matches.result,
      matches.notes,
      matches.created_at as createdAt,
      matches.updated_at as updatedAt,
      matches.metadata
    from matches
    where matches.team_id in (${placeholders})
    order by matches.match_date desc, matches.created_at desc`,
    args: teamIds,
  });

  return json(200, {
    matches: result.rows.map((row) => ({
      ...row,
      metadata: parseMetadata(row.metadata),
    })),
  });
};

const handleDetail = async (payload: DetailMatchPayload) => {
  const { userId, matchId } = payload;

  if (!matchId) {
    return json(400, { error: 'Invalid match detail payload' });
  }
  if (!await canViewMatch(getClient(), { userId, email: payload.email || '' }, matchId)) {
    return json(403, { error: 'Not authorized for this match' });
  }

  const matchResult = await getClient().execute({
    sql: `select
      matches.id,
      matches.team_id as teamId,
      matches.opponent_name as opponentName,
      matches.match_date as matchDate,
      matches.location,
      matches.match_type as matchType,
      matches.status,
      matches.result,
      matches.notes,
      matches.created_at as createdAt,
      matches.updated_at as updatedAt,
      matches.metadata
    from matches
    where matches.id = ?
    limit 1`,
    args: [matchId],
  });

  const match = matchResult.rows[0];
  if (!match) {
    return json(404, { error: 'Match not found' });
  }

  const [setsResult, ralliesResult, playersResult] = await Promise.all([
    getClient().execute({
      sql: `select
        id,
        match_id as matchId,
        set_number as setNumber,
        our_score as ourScore,
        opponent_score as opponentScore,
        status,
        starting_server_team as startingServerTeam,
        final_result as finalResult,
        created_at as createdAt,
        updated_at as updatedAt,
        metadata
      from sets
      where match_id = ?
      order by set_number asc`,
      args: [matchId],
    }),
    getClient().execute({
      sql: `select
        id,
        match_id as matchId,
        set_id as setId,
        rally_number as rallyNumber,
        score_before_us as scoreBeforeUs,
        score_before_opponent as scoreBeforeOpponent,
        score_after_us as scoreAfterUs,
        score_after_opponent as scoreAfterOpponent,
        point_winner as pointWinner,
        serving_team as servingTeam,
        server_player_id as serverPlayerId,
        outcome_type as outcomeType,
        classification,
        player_id as playerId,
        notes,
        created_at as createdAt,
        metadata
      from rally_events
      where match_id = ?
      order by rally_number asc, created_at asc`,
      args: [matchId],
    }),
    getClient().execute({
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
      where players.team_id = ?
      order by cast(players.jersey_number as integer), players.jersey_number`,
      args: [String(match.teamId)],
    }),
  ]);

  return json(200, {
    match: {
      ...match,
      metadata: parseMetadata(match.metadata),
    },
    sets: setsResult.rows.map((row) => ({
      ...row,
      metadata: parseMetadata(row.metadata),
    })),
    rallies: ralliesResult.rows.map((row) => ({
      ...row,
      metadata: parseMetadata(row.metadata),
    })),
    players: playersResult.rows.map((row) => ({
      ...row,
      active: Boolean(row.active),
      metadata: parseMetadata(row.metadata),
    })),
  });
};

const handleStart = async (payload: StartMatchPayload) => {
  const { match, userId } = payload;

  if (!match?.id || !match.teamId || !match.opponentName) {
    return json(400, { error: 'Invalid match payload' });
  }
  if (!await canManageTeam(getClient(), { userId, email: payload.email || '' }, match.teamId)) {
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
  if (!await canManageMatch(getClient(), { userId, email: payload.email || '' }, matchId)) {
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
    if (payload.action === 'detail') {
      return await handleDetail(payload);
    }
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
