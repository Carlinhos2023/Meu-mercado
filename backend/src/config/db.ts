import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL?.trim();

export const isPostgresConfigured = Boolean(connectionString);

export const pool = isPostgresConfigured
  ? new Pool({
      connectionString,
      ssl: connectionString?.includes('neon.tech') || connectionString?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : null;
