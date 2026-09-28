import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = (): Pool | null => {
  if (!process.env.SQL_HOST) {
    return null;
  }
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    global._postgresPool.on('error', (err) => {
      console.warn('PostgreSQL pool idle client warning:', err.message);
    });
  }
  return global._postgresPool;
};

let db: any;

try {
  const pool = createPool();
  if (pool && process.env.SQL_HOST) {
    db = drizzle(pool, { schema });
  } else {
    throw new Error('SQL_HOST not configured');
  }
} catch {
  console.warn('[AI Studio] Relational Database not connected — using mock database layer');
  const createChainable = () => {
    const chain: any = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      offset: () => chain,
      values: (val: any) => ({
        onConflictDoUpdate: () => ({
          returning: async () => [Array.isArray(val) ? val[0] : val],
        }),
        returning: async () => [Array.isArray(val) ? val[0] : val],
        execute: async () => [],
      }),
      set: () => chain,
      returning: async () => [],
      execute: async () => ({ rows: [] }),
      then: (resolve: any) => Promise.resolve([]).then(resolve),
      catch: (reject: any) => Promise.resolve([]).catch(reject),
    };
    return chain;
  };

  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };

  db = new Proxy({}, {
    get: (_, prop: string) => {
      if (prop === 'query') {
        return new Proxy({}, { get: () => noOp });
      }
      if (prop === 'select') {
        return () => createChainable();
      }
      if (prop === 'insert') {
        return () => createChainable();
      }
      if (prop === 'update') {
        return () => createChainable();
      }
      if (prop === 'delete') {
        return () => createChainable();
      }
      if (prop === 'execute') {
        return async () => ({ rows: [{ current_time: new Date().toISOString(), database_name: 'mock_db' }] });
      }
      return async () => [];
    },
  });
}

export { db };

