import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  dbSsl: String(process.env.DB_SSL ?? 'false').toLowerCase() === 'true',
  jwtSecret: process.env.JWT_SECRET ?? 'replace-me'
};
