/** Per-process budget: API, app and portal share the same database pooler. */
export function databasePoolConfig(value = process.env.DATABASE_POOL_MAX) {
  const max = value === undefined || value === '' ? 3 : Number(value);
  if (!Number.isInteger(max) || max < 1) {
    throw new Error('DATABASE_POOL_MAX must be a positive integer');
  }
  return { max, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 };
}
