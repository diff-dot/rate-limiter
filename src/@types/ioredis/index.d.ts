import 'ioredis';

declare module 'ioredis' {
  interface Commands {
    consume: (key: string, usage: number, period: number, limit: number) => Promise<[number, number]>;
  }
}
