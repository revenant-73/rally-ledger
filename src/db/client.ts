import { createClient } from '@libsql/client/web';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const url = import.meta.env.VITE_TURSO_DATABASE_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

const isConfigured = Boolean(url);

if (!isConfigured) {
  console.warn('VITE_TURSO_DATABASE_URL is not defined. Database operations will fail. Please check your .env file.');
}

const finalUrl = url || 'http://localhost:8080'; 

export const client = createClient({
  url: finalUrl,
  authToken: authToken || '',
});

// Use the client directly with drizzle
export const db = drizzle({ client, schema });
