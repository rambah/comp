import { validate } from 'class-validator';
import { AuditViewConsentDto } from './live.dto';
import { liveMessageSchema } from './live.schema';

describe('Live reconstruction boundaries', () => {
  it('accepts automatic initialization with or without the compatibility version', async () => {
    const legacy = Object.assign(new AuditViewConsentDto(), { allowed: true });
    expect(await validate(legacy)).toHaveLength(0);
    legacy.noticeVersion = 2;
    expect(await validate(legacy)).toHaveLength(0);
  });
  it('permits session revocation without a compatibility version', async () => {
    expect(
      await validate(
        Object.assign(new AuditViewConsentDto(), { allowed: false }),
      ),
    ).toHaveLength(0);
  });
  it('does not accept form commands or API calls in the relay protocol', () => {
    expect(
      liveMessageSchema.safeParse({
        kind: 'submit',
        sequence: 1,
        action: '/v1/audit-workspace/requests',
      }).success,
    ).toBe(false);
    expect(
      liveMessageSchema.safeParse({
        kind: 'watch',
        sequence: 1,
        targetNonce: '94d4ad08-6377-4209-b4ae-023747847895',
        watching: true,
        requestSnapshot: true,
        action: 'click',
      }).success,
    ).toBe(false);
  });
  it('bounds compressed chunks before publishing to Redis', () => {
    expect(
      liveMessageSchema.safeParse({
        kind: 'dom',
        sequence: 1,
        epoch: '94d4ad08-6377-4209-b4ae-023747847895',
        batch: 0,
        part: 0,
        parts: 1,
        payload: 'A'.repeat(24001),
      }).success,
    ).toBe(false);
  });
});
