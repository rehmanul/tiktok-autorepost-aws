export default () => {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redisTls = (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true';
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET ?? '';

  return {
    env: process.env.NODE_ENV ?? 'development',
    port: Number.parseInt(process.env.PORT ?? '4000', 10),
    databaseUrl: process.env.DATABASE_URL ?? '',
    redis: {
      url: redisUrl,
      tls: redisTls
    },
    supabase: {
      url: supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
      jwtSecret: supabaseJwtSecret
    }
  };
};
