import { pool, isPostgresConfigured } from './db';

let isInitialized = false;

const AUTO_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(60) NOT NULL UNIQUE,
    icon VARCHAR(30) NOT NULL DEFAULT 'package',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(32) UNIQUE,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    min_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (min_quantity >= 0),
    ideal_quantity NUMERIC(10, 2) NOT NULL DEFAULT 2 CHECK (ideal_quantity >= min_quantity),
    unit VARCHAR(20) NOT NULL DEFAULT 'un',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

INSERT INTO categories (name, icon, sort_order) VALUES
    ('Despensa', 'utensils', 1),
    ('Geladeira & Freezer', 'snowflake', 2),
    ('Limpeza', 'sparkles', 3),
    ('Higiene Pessoal', 'heart', 4)
ON CONFLICT (name) DO NOTHING;
`;

export async function ensureDatabaseSchema(): Promise<void> {
  if (isInitialized || !isPostgresConfigured || !pool) return;
  try {
    await pool.query(AUTO_SCHEMA_SQL);
    isInitialized = true;
    console.log('✅ Tabelas verificadas/criadas automaticamente no PostgreSQL (Neon).');
  } catch (error) {
    console.error('⚠️ Erro ao verificar schema automático:', error);
  }
}
