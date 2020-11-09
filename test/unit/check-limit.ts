import { expect } from 'chai';
import { RateLimiter } from '../../src';
import { RedisHostOptions } from '@diff./redis-client';

const action = 'test';
const period = 5;
const limit = 5;
const redisOptions: RedisHostOptions = {
  type: 'standalone',
  host: '127.0.0.1',
  port: 6379,
  keyPrefix: 'test:'
};
const rateLimiter = new RateLimiter({ redisOptions, action, period, limit });
let lastUsage: number = 0;

describe('check-limit', async () => {
  before(async () => {
    await rateLimiter.reset();
  });

  it('consume', async () => {
    const { exceed, currentUsage } = await rateLimiter.consume(1);
    expect(exceed).to.be.false;
    expect(currentUsage).to.be.eq(1);
    lastUsage = currentUsage;
  });

  it('허용량을 초과한 consume 시도시 usage 가 증가하지 않고 exceed 가 true 로 반환', async () => {
    const { exceed, currentUsage } = await rateLimiter.consume(limit * 2);
    expect(exceed).to.be.true;
    expect(currentUsage).to.be.eq(lastUsage);
  });

  it('허용량 한도 도달시 exceed 가 true 로 반환', async () => {
    await rateLimiter.reset();

    for (let i = 0; i < limit; i++) {
      const { exceed, currentUsage } = await rateLimiter.consume(1);
      expect(exceed).to.be.false;
      expect(currentUsage).to.be.eq(i + 1);
    }

    const { exceed, currentUsage } = await rateLimiter.consume(1);
    expect(exceed).to.be.true;
    expect(currentUsage).to.be.eq(limit);
  });

  it('허용량 한도 도달 후 지정된 측정 시간을 지나면 사용량 리셋', async () => {
    await new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, period * 1000);
    });

    const usage = await rateLimiter.usage();
    expect(usage).to.be.eq(0);
  });
});
