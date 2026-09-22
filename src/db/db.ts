import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

export interface DbUserContext {
  role?: string;
  facility_id?: string | null;
  tenant_id?: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export interface ClientLike {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
}

let pgPool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let isInitialized = false;
let usingEngine: 'external_postgres' | 'embedded_postgres' = 'embedded_postgres';

export function getDbEngine(): 'external_postgres' | 'embedded_postgres' {
  return usingEngine;
}

export async function initDb(): Promise<void> {
  if (isInitialized) return;

  const sqlHost = process.env.SQL_HOST;
  const sqlUser = process.env.SQL_USER;
  const sqlPassword = process.env.SQL_PASSWORD;
  const sqlDbName = process.env.SQL_DB_NAME;

  if (sqlHost && sqlUser && sqlDbName) {
    try {
      console.log(`[DB] Connecting to Cloud SQL via Object Method at host=${sqlHost}, db=${sqlDbName}...`);
      pgPool = new pg.Pool({
        host: sqlHost,
        user: sqlUser,
        password: sqlPassword,
        database: sqlDbName,
        max: 10,
        connectionTimeoutMillis: 15000,
      });

      pgPool.on('error', (err) => {
        console.error('Unexpected error on idle SQL pool client:', err);
      });

      usingEngine = 'external_postgres';
      console.log('[DB] Connected to Cloud SQL PostgreSQL instance.');
    } catch (err) {
      console.warn('[DB] Failed to connect to Cloud SQL, falling back to embedded PostgreSQL (PGlite):', err);
      pgPool = null;
    }
  }

  if (!pgPool) {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && dbUrl.trim().length > 0) {
      try {
        console.log(`[DB] Connecting to external PostgreSQL at ${dbUrl.replace(/:[^:@]+@/, ':***@')}...`);
        pgPool = new pg.Pool({
          connectionString: dbUrl,
          ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        usingEngine = 'external_postgres';
        console.log('[DB] Connected successfully to external PostgreSQL instance.');
      } catch (err) {
        console.warn('[DB] Failed to connect to DATABASE_URL, falling back to embedded PostgreSQL (PGlite):', err);
        pgPool = null;
      }
    }
  }

  if (!pgPool) {
    const dataDir = path.join(process.cwd(), '.pglite_db');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        // directory creation fallback
      }
    }
    console.log(`[DB] Initializing embedded PostgreSQL (PGlite v16 WASM engine at ${dataDir})...`);
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
    usingEngine = 'embedded_postgres';
    console.log('[DB] Embedded PostgreSQL ready and persisted to disk.');
  }

  // Run schema and seed for local embedded engine or custom external DB
  if (!process.env.SQL_HOST) {
    await applySchemaAndSeed();
  } else {
    console.log('[DB] Cloud SQL schema and tables managed via Drizzle.');
    // Ensure table cold_chain_telemetry exists
    try {
      const client = await pgPool!.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS cold_chain_telemetry (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
            device_id VARCHAR(64) NOT NULL,
            temperature NUMERIC(4,1) NOT NULL,
            battery_pct INT NOT NULL DEFAULT 100 CHECK (battery_pct BETWEEN 0 AND 100),
            power_source VARCHAR(32) NOT NULL DEFAULT 'solar_grid',
            door_open BOOLEAN NOT NULL DEFAULT false,
            recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_telemetry_facility_time ON cold_chain_telemetry(facility_id, recorded_at DESC);
          ALTER TABLE capacity ADD COLUMN IF NOT EXISTS icu_total INT NOT NULL DEFAULT 2;
          ALTER TABLE capacity ADD COLUMN IF NOT EXISTS icu_available INT NOT NULL DEFAULT 1;
        `);
      } finally {
        client.release();
      }
    } catch (e: any) {
      console.warn('[DB] Non-blocking schema check:', e.message);
    }
  }
  isInitialized = true;
}

async function applySchemaAndSeed() {
  const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
  const seedPath = path.join(process.cwd(), 'src', 'db', 'seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  console.log('[DB] Applying schema migrations...');
  if (pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query(schemaSql);
      console.log('[DB] Applying seed data...');
      await client.query(seedSql);
    } finally {
      client.release();
    }
  } else if (pgliteInstance) {
    await pgliteInstance.exec(schemaSql);
    console.log('[DB] Applying seed data...');
    await pgliteInstance.exec(seedSql);
  }
  console.log('[DB] Database schema and initial seed successfully applied.');
}

/**
 * Execute parameterized query with optional RLS session context
 */
export async function query<T = any>(
  sqlText: string,
  params: any[] = [],
  sessionUser?: DbUserContext
): Promise<QueryResult<T>> {
  if (!isInitialized) {
    await initDb();
  }

  if (pgPool) {
    const client = await pgPool.connect();
    try {
      if (sessionUser?.role) {
        if (!process.env.SQL_HOST) {
          await client.query(`SET ROLE app_user`);
        }
        await client.query(`SELECT set_config('app.current_user_role', $1, false)`, [sessionUser.role]);
      }
      const res = await client.query(sqlText, params);
      if (sessionUser?.role) {
        if (!process.env.SQL_HOST) {
          await client.query(`RESET ROLE`);
        }
        await client.query(`SELECT set_config('app.current_user_role', '', false)`);
      }
      return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
    } finally {
      client.release();
    }
  } else if (pgliteInstance) {
    if (sessionUser?.role) {
      await pgliteInstance.query(`SET ROLE app_user`);
      await pgliteInstance.query(`SET app.current_user_role = '${sessionUser.role.replace(/'/g, "''")}'`);
    }
    const res = await pgliteInstance.query<T>(sqlText, params);
    if (sessionUser?.role) {
      await pgliteInstance.query(`RESET ROLE`);
      await pgliteInstance.query(`RESET app.current_user_role`);
    }
    return { rows: res.rows, rowCount: res.rows.length };
  }

  throw new Error('Database not initialized');
}

/**
 * Execute within a strict SQL transaction (ensures atomic commit or rollback)
 */
export async function withTransaction<T>(
  action: (client: ClientLike) => Promise<T>,
  sessionUser?: DbUserContext
): Promise<T> {
  if (!isInitialized) {
    await initDb();
  }

  if (pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      if (sessionUser?.role) {
        await client.query(`SELECT set_config('app.current_user_role', $1, true)`, [sessionUser.role]);
      }
      const clientWrapper: ClientLike = {
        query: async <R = any>(text: string, params?: any[]) => {
          const res = await client.query(text, params);
          return { rows: res.rows as R[], rowCount: res.rowCount ?? res.rows.length };
        }
      };
      const result = await action(clientWrapper);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else if (pgliteInstance) {
    return await pgliteInstance.transaction(async (tx) => {
      if (sessionUser?.role) {
        await tx.query(`SET LOCAL app.current_user_role = '${sessionUser.role.replace(/'/g, "''")}'`);
      }
      const clientWrapper: ClientLike = {
        query: async <R = any>(text: string, params?: any[]) => {
          const res = await tx.query<R>(text, params);
          return { rows: res.rows, rowCount: res.rows.length };
        }
      };
      return await action(clientWrapper);
    });
  }

  throw new Error('Database not initialized');
}
