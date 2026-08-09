import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import { requireSession } from './_session';
import { isAdmin } from './_access';

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

type ResetPayload = {
  action: 'reset';
  userId: string;
  email?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePayload = (body: string | null): ResetPayload | null => {
  try {
    const payload = JSON.parse(body || '{}') as unknown;
    if (!isRecord(payload) || payload.action !== 'reset' || typeof payload.userId !== 'string') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
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
    if (!isAdmin({ userId: payload.userId, email: payload.email })) {
      return json(403, { error: 'Admins only' });
    }

    const client = getClient();
    await client.batch([
      {
        sql: `delete from rally_events
          where match_id in (
            select matches.id
            from matches
            inner join teams on teams.id = matches.team_id
            where teams.owner_id = ?
          )`,
        args: [payload.userId],
      },
      {
        sql: `delete from sets
          where match_id in (
            select matches.id
            from matches
            inner join teams on teams.id = matches.team_id
            where teams.owner_id = ?
          )`,
        args: [payload.userId],
      },
      {
        sql: `delete from matches
          where team_id in (select id from teams where owner_id = ?)`,
        args: [payload.userId],
      },
      {
        sql: `delete from players
          where team_id in (select id from teams where owner_id = ?)`,
        args: [payload.userId],
      },
      {
        sql: 'delete from teams where owner_id = ?',
        args: [payload.userId],
      },
    ], 'write');

    return json(200, { ok: true });
  } catch (error) {
    console.error('reset function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
