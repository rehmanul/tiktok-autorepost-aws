export default () => {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redisTls = (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true';

  return {
    env: process.env.NODE_ENV ?? 'development',
    port: Number.parseInt(process.env.PORT ?? '4000', 10),
    databaseUrl: process.env.DATABASE_URL ?? '',
    redis: {
      url: redisUrl,
      tls: redisTls
    }
  };
};
