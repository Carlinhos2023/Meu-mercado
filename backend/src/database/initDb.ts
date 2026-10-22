import fs from 'fs';
import path from 'path';
import { pool, isPostgresConfigured } from '../config/db';

async function initDb() {
  if (!isPostgresConfigured || !pool) {
    console.log(
      '⚠️ DATABASE_URL não configurado no .env. O servidor usará persistência local em JSON até que você configure o Neon PostgreSQL.'
    );
    process.exit(0);
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(sql);
    console.log('✅ Schema SQL aplicado com sucesso no PostgreSQL (Neon)!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
