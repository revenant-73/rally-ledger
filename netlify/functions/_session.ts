import { createHmac, timingSafeEqual } from 'node:crypto';
import type { HandlerEvent, HandlerResponse } from '@netlify/functions';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  email: string;
  exp: number;
};

const json = (statusCode: number, body: unknown): HandlerResponse => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const getSecret = () => {
  const secret = process.env.SESSION_SECRET
    || process.env.TURSO_AUTH_TOKEN
    || process.env.VITE_TURSO_AUTH_TOKEN
    || '';

  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
};

const base64UrlEncode = (input: string) => Buffer.from(input).toString('base64url');

const sign = (data: string) => {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
};

export const createSessionToken = (user: { id: string; email: string }) => {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
};

export const verifySessionToken = (token: string | undefined): SessionPayload | null => {
  if (!token) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.userId || !payload.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const getBearerToken = (event: HandlerEvent) => {
  const header = event.headers.authorization || event.headers.Authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length);
};

export const requireSession = (event: HandlerEvent, expectedUserId?: string) => {
  const session = verifySessionToken(getBearerToken(event));
  if (!session) {
    return { response: json(401, { error: 'Authentication required' }) };
  }
  if (expectedUserId && expectedUserId !== session.userId) {
    return { response: json(403, { error: 'Not authorized for this user' }) };
  }
  return { session };
};
