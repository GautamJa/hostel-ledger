import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 1500,
    });

    global._postgresPool.on('error', (err) => {
      // Prevent unhandled error event on idle client
      console.warn('PostgreSQL idle client notice (safely handled):', err.message);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

let _postgresHealthy: boolean | null = null;
let _lastCheckTime = 0;

export async function isPostgresHealthy(): Promise<boolean> {
  const now = Date.now();
  if (_postgresHealthy !== null && now - _lastCheckTime < 10000) {
    return _postgresHealthy;
  }
  _lastCheckTime = now;
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 1200))
    ]);
    client.release();
    _postgresHealthy = true;
    return true;
  } catch (e: any) {
    _postgresHealthy = false;
    return false;
  }
}

export { pool };

