import { RedisHostOptions, RedisClusterOptions, Redis, Cluster, RedisClient } from '@diff./redis-client';
import fs from 'fs';
import path from 'path';

const REDIS_KEY_PREFIX = 'rate:';

export class RateLimiter {
  private redisOptions: RedisHostOptions | RedisClusterOptions;

  private action: string;
  private period: number;
  private limit: number;

  /**
   * Create RateLimter instance
   *
   * @param {RedisHostOptions|RedisClusterOptions} args.redisOptions 사용량을 기록할 레디스 서버 옵션
   * @param {number} args.action 사용량을 측정할 액션
   * @param {number} args.period 사용량 집계 주기
   * @param {number} args.limit 지정된(args.period) 시간동안 호출할 수 있는 최대 횟수
   */
  constructor(args: { redisOptions: RedisHostOptions | RedisClusterOptions; action: string; period: number; limit: number }) {
    const { redisOptions, action, period, limit } = args;

    this.redisOptions = redisOptions;

    this.action = action;
    this.period = period;
    this.limit = limit;
  }

  /**
   * 소비
   * @param usage 사용량
   * @returns {Promise} currentUsage: 현재 사용량, exceed: 사용량 초과 유무
   */
  public async consume(usage: number = 1): Promise<{ currentUsage: number; exceed: boolean }> {
    const { key, ttl } = this.step;
    const [exceed, currentUsage] = await this.redisClient.consume(key, usage, this.period, this.limit, ttl);

    return {
      currentUsage,
      exceed: exceed === 1
    };
  }

  /**
   * 사용량 리셋
   */
  public async reset(): Promise<void> {
    await this.redisClient.del(this.step.key);
  }

  /**
   * 사용량 조회
   */
  public async usage(): Promise<number> {
    const currentUsage = await this.redisClient.get(this.step.key);
    return currentUsage === null ? 0 : parseInt(currentUsage);
  }

  /**
   * 사용량 리셋까지 남은 시간
   */
  public async leftUntilReset(): Promise<number> {
    return this.step.ttl;
  }

  /**
   * 집계 주기별로 사용량을 기록할 레디스 key 와 해당키의 남은 ttl 을 반환
   */
  private get step(): { key: string; ttl: number } {
    const now = Math.floor(Date.now() / 1000);
    const step = Math.floor(now / this.period);
    const ttl = this.period - (now % this.period);

    return { key: REDIS_KEY_PREFIX + this.action + ':' + step, ttl };
  }

  private get redisClient(): Redis | Cluster {
    const client = RedisClient.client(this.redisOptions);

    // Define custom command
    if (client['consume'] === undefined) {
      client.defineCommand('consume', {
        numberOfKeys: 1,
        lua: fs.readFileSync(path.resolve(__dirname, '../lua/consume.lua')).toString()
      });
    }
    return client;
  }
}
