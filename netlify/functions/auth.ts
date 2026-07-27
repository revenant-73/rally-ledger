import type { Handler } from '@netlify/functions';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { users } from '../../src/db/schema';

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL || '',
  authToken: process.env.VITE_TURSO_AUTH_TOKEN || '',
});
const db = drizzle({ client, schema: { users } });

const MIN_PASSWORD_LENGTH = 8;

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

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

  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = JSON.parse(event.body || '{}'));
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return json(400, { error: 'Email and password are required' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return json(400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existing.length === 0) {
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
      return json(201, { user: toSafeUser(newUser) });
    }

    const existingUser = existing[0];

    if (!existingUser.passwordHash) {
      // Account predates password auth - claim it with the password given now
      // rather than locking the coach out of their own existing data.
      const passwordHash = await bcrypt.hash(password, 10);
      await db.update(users)
        .set({ passwordHash, updatedAt: new Date().toISOString() })
        .where(eq(users.id, existingUser.id));
      return json(200, { user: toSafeUser(existingUser) });
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.passwordHash);
    if (!passwordMatches) {
      return json(401, { error: 'Invalid email or password' });
    }

    return json(200, { user: toSafeUser(existingUser) });
  } catch (error) {
    console.error('auth function failed:', error);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};
