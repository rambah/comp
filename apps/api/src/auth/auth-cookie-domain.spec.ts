import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('self-hosted auth cookie domain', () => {
  it('prefers AUTH_COOKIE_DOMAIN over hosted-domain inference', () => {
    const source = readFileSync(join(__dirname, 'auth.server.ts'), 'utf8');
    const functionSource = source.match(
      /function getCookieDomain\(\): string \| undefined \{[\s\S]*?^}/m,
    )?.[0];

    expect(functionSource).toBeDefined();
    expect(functionSource).toContain('process.env.AUTH_COOKIE_DOMAIN');
    expect(
      functionSource?.indexOf('process.env.AUTH_COOKIE_DOMAIN'),
    ).toBeLessThan(functionSource?.indexOf('process.env.BASE_URL') ?? 0);
  });
});
