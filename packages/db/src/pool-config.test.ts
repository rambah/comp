import { describe, expect, it } from 'bun:test';
import { databasePoolConfig } from './pool-config';

describe('shared database connection budget', () => {
  it('keeps three application processes below the 15-connection pooler limit', () => {
    expect(databasePoolConfig('').max * 3).toBe(9);
  });
  it('allows a deliberate per-process override', () => {
    expect(databasePoolConfig('2').max).toBe(2);
  });
  it.each(['0', '-1', '1.5', 'invalid'])('rejects an invalid pool limit %s', (value) => {
    expect(() => databasePoolConfig(value)).toThrow('positive integer');
  });
  it('bounds acquisition waits and releases idle connections', () => {
    expect(databasePoolConfig('3')).toEqual({ max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
  });
});
