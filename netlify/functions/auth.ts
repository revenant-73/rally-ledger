import type { Handler } from '@netlify/functions';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { users } from '../../src/db/schema';
import { createSessionToken, verifySessionToken } from './_session';

let cachedClient: Client | null = null;
let cachedDb: LibSQLDatabase<{ users: typeof users }> | null = null;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const getDb = () => {
  if (!cachedClient) {
    cachedClient = createClient({
      url: process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL || '',
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN || '',
    });
    cachedDb = drizzle({ client: cachedClient, schema: { users } });
  }
  return cachedDb!;
};

const MIN_PASSWORD_LENGTH = 8;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_ATTEMPTS = 10;

const json = (statusCode: number, body: unknown, headers: Record<string, string> = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const getClientIp = (headers: Record<string, string | undefined>) => {
  const forwardedFor = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  return forwardedFor?.split(',')[0]?.trim() || headers['client-ip'] || headers['Client-Ip'] || 'unknown';
};

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return null;
  }

  existing.count += 1;
  if (existing.count <= MAX_AUTH_ATTEMPTS) {
    return null;
  }

  const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
  return json(
    429,
    { error: 'Too many login attempts. Please try again later.' },
    { 'Retry-After': String(retryAfterSeconds) },
  );
};

const isSignupAllowed = (email: string) => {
  if (process.env.AUTH_ALLOW_SIGNUP === 'false') {
    return false;
  }

  const allowlist = (process.env.AUTH_ALLOWED_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return true;
  }

  const domain = email.split('@')[1];
  return allowlist.some((entry) => {
    if (entry === email) return true;
    if (entry.startsWith('@')) return email.endsWith(entry);
    return domain && entry === domain;
  });
};

const toSafeUser = (user: {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  metadata: user.metadata ?? null,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let action: unknown;
  let email: unknown;
  let password: unknown;
  try {
    ({ action, email, password } = JSON.parse(event.body || '{}'));
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  if (action === 'session') {
    const header = event.headers.authorization || event.headers.Authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    const session = verifySessionToken(token);
    if (!session) {
      return json(401, { error: 'Authentication required' });
    }

    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (existing.length === 0) {
      return json(401, { error: 'Authentication required' });
    }

    return json(200, { user: toSafeUser(existing[0]) });
  }

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return json(400, { error: 'Email and password are required' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return json(400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const rateLimited = checkRateLimit(`${getClientIp(event.headers)}:${normalizedEmail}`);
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existing.length === 0) {
      if (!isSignupAllowed(normalizedEmail)) {
        return json(403, { error: 'Signup is not available for this email.' });
      }

      // First time we've seen this email - create the account.
      const passwordHash = await bcrypt.hash(password, 10);
      const now = new Date().toISOString();
      const newUser = {
        id: uuidv4(),
        email: normalizedEmail,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(users).values(newUser);
      return json(201, { user: toSafeUser(newUser), sessionToken: createSessionToken(newUser) });
    }

    const existingUser = existing[0];

    if (!existingUser.passwordHash) {
      // Account predates password auth - claim it with the password given now
      // rather than locking the coach out of their own existing data.
      const passwordHash = await bcrypt.hash(password, 10);
      await db.update(users)
        .set({ passwordHash, updatedAt: new Date().toISOString() })
        .where(eq(users.id, existingUser.id));
      return json(200, { user: toSafeUser(existingUser), sessionToken: createSessionToken(existingUser) });
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.passwordHash);
    if (!passwordMatches) {
      return json(401, { error: 'Invalid email or password' });
    }

    return json(200, { user: toSafeUser(existingUser), sessionToken: createSessionToken(existingUser) });
  } catch (error) {
    console.error('auth function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
